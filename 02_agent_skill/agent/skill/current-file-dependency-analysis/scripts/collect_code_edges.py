from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Iterable

# 确保 scripts 目录在 sys.path 中
_script_dir = Path(__file__).parent.resolve()
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

from common import iter_files, make_evidence_ref, normalize_path, read_json, repo_relative, safe_read_text, write_json
from parallel_scan import estimate_repo_scale, parallel_outbound_edges
from go_parser import GoDependencyResolver


TS_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue"}
PY_SUFFIXES = {".py"}
GO_SUFFIXES = {".go"}

TS_LITERAL_PATTERNS = [
    ("import", re.compile(r'^\s*import(?:.+?\s+from\s+)?["\']([^"\']+)["\']')),
    ("export", re.compile(r'^\s*export\s+.+?\s+from\s+["\']([^"\']+)["\']')),
    ("require", re.compile(r'require\(\s*["\']([^"\']+)["\']\s*\)')),
    ("dynamic-import", re.compile(r'import\(\s*["\']([^"\']+)["\']\s*\)')),
]

PY_IMPORT_RE = re.compile(r"^\s*import\s+(.+)$")
PY_FROM_RE = re.compile(r"^\s*from\s+([.\w]+)\s+import\s+(.+)$")
GO_SINGLE_IMPORT_RE = re.compile(r'^\s*import\s+(?:\w+\s+)?\"([^\"]+)\"')
GO_BLOCK_IMPORT_RE = re.compile(r'^\s*(?:\w+\s+)?\"([^\"]+)\"')


def _load_tsconfig(repo_root: Path) -> dict:
    tsconfig_path = repo_root / "tsconfig.json"
    if not tsconfig_path.exists():
        return {}
    try:
        return json.loads(safe_read_text(tsconfig_path))
    except Exception:
        return {}


def _tsconfig_alias_candidates(specifier: str, repo_root: Path) -> list[Path]:
    tsconfig = _load_tsconfig(repo_root)
    compiler_options = tsconfig.get("compilerOptions", {})
    base_url = compiler_options.get("baseUrl", ".")
    paths = compiler_options.get("paths", {}) or {}
    if not paths:
        return []

    base_path = (repo_root / base_url).resolve()
    candidates: list[Path] = []

    for alias_pattern, target_patterns in paths.items():
        if "*" in alias_pattern:
            alias_prefix, alias_suffix = alias_pattern.split("*", 1)
            if not specifier.startswith(alias_prefix) or not specifier.endswith(alias_suffix):
                continue
            wildcard_value = specifier[len(alias_prefix):]
            if alias_suffix:
                wildcard_value = wildcard_value[: -len(alias_suffix)]
        else:
            if specifier != alias_pattern:
                continue
            wildcard_value = ""

        for target_pattern in target_patterns:
            resolved_pattern = target_pattern.replace("*", wildcard_value)
            candidates.append((base_path / resolved_pattern).resolve())

    return candidates


def _ts_resolution_candidates(base: Path) -> list[Path]:
    if base.suffix:
        return [base]
    return [
        base,
        *(base.with_suffix(ext) for ext in TS_SUFFIXES),
        *((base / f"index{ext}") for ext in TS_SUFFIXES),
    ]


def load_inputs(anchor_path: str, stack_path: str) -> tuple[dict, dict, Path, Path, str]:
    anchor = read_json(anchor_path)
    stack = read_json(stack_path)
    repo_root = normalize_path(anchor["repo_root"])
    file_path = normalize_path(anchor["file_path"])
    return anchor, stack, repo_root, file_path, anchor["repo_relative_path"]


def resolve_ts_target(importer: Path, specifier: str, repo_root: Path) -> tuple[str, str]:
    if not specifier:
        return f"external:{specifier}", "unresolved"
    if specifier.startswith((".", "/")):
        base = (repo_root / specifier.lstrip("/")) if specifier.startswith("/") else (importer.parent / specifier)
        candidates = _ts_resolution_candidates(base.resolve())
    else:
        alias_bases = _tsconfig_alias_candidates(specifier, repo_root)
        if alias_bases:
            candidates = []
            for alias_base in alias_bases:
                candidates.extend(_ts_resolution_candidates(alias_base))
        else:
            return f"external:{specifier}", "resolved"

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return repo_relative(candidate, repo_root), "resolved"
    return specifier, "unresolved"


def iter_ts_edges(importer: Path, repo_root: Path) -> Iterable[dict]:
    text = safe_read_text(importer)
    for line_number, line in enumerate(text.splitlines(), start=1):
        for edge_kind, pattern in TS_LITERAL_PATTERNS:
            match = pattern.search(line)
            if not match:
                continue
            specifier = match.group(1)
            target, resolution = resolve_ts_target(importer, specifier, repo_root)
            confidence = "high" if resolution == "resolved" else "low"
            if edge_kind == "dynamic-import" and resolution == "resolved":
                confidence = "medium"
            yield {
                "source_file": repo_relative(importer, repo_root),
                "target": target,
                "edge_kind": edge_kind,
                "evidence_ref": make_evidence_ref(importer, line_number, repo_root),
                "confidence": confidence,
                "resolution": resolution,
                "symbol": "",
            }


def python_module_name(path: Path, repo_root: Path) -> str:
    relative = path.relative_to(repo_root).with_suffix("")
    parts = list(relative.parts)
    if parts and parts[-1] == "__init__":
        parts = parts[:-1]
    return ".".join(parts)


def python_module_to_path(module_name: str, repo_root: Path) -> str | None:
    if not module_name:
        return None
    candidate = repo_root.joinpath(*module_name.split("."))
    if candidate.with_suffix(".py").exists():
        return repo_relative(candidate.with_suffix(".py"), repo_root)
    init_file = candidate / "__init__.py"
    if init_file.exists():
        return repo_relative(init_file, repo_root)
    return None


def python_local_candidate(module_name: str, importer: Path, repo_root: Path) -> str | None:
    resolved = python_module_to_path(module_name, repo_root)
    if resolved:
        return resolved
    if "." in module_name:
        return None
    sibling_file = importer.parent / f"{module_name}.py"
    if sibling_file.exists():
        return repo_relative(sibling_file, repo_root)
    sibling_package = importer.parent / module_name / "__init__.py"
    if sibling_package.exists():
        return repo_relative(sibling_package, repo_root)
    return None


def resolve_relative_python(importer: Path, module_spec: str, imported_names: list[str], repo_root: Path) -> list[str]:
    importer_module = python_module_name(importer, repo_root)
    package_parts = importer_module.split(".")
    if importer.name != "__init__.py":
        package_parts = package_parts[:-1]

    dot_count = len(module_spec) - len(module_spec.lstrip("."))
    remainder = module_spec.lstrip(".")
    if dot_count:
        keep = max(0, len(package_parts) - (dot_count - 1))
        base_parts = package_parts[:keep]
    else:
        base_parts = []

    if remainder:
        base_parts.extend(part for part in remainder.split(".") if part)

    targets = []
    if base_parts:
        targets.append(".".join(base_parts))
    for imported_name in imported_names:
        imported_name = imported_name.strip()
        if imported_name == "*" or not imported_name:
            continue
        if base_parts:
            targets.append(".".join([*base_parts, imported_name]))
    return targets


def iter_python_edges(importer: Path, repo_root: Path) -> Iterable[dict]:
    text = safe_read_text(importer)
    for line_number, line in enumerate(text.splitlines(), start=1):
        import_match = PY_IMPORT_RE.match(line)
        if import_match:
            modules = [part.strip().split(" as ")[0] for part in import_match.group(1).split(",")]
            for module_name in modules:
                local_target = python_local_candidate(module_name, importer, repo_root)
                target = local_target or f"external:{module_name}"
                yield {
                    "source_file": repo_relative(importer, repo_root),
                    "target": target,
                    "edge_kind": "import",
                    "evidence_ref": make_evidence_ref(importer, line_number, repo_root),
                    "confidence": "high" if local_target else "medium",
                    "resolution": "resolved",
                    "symbol": "",
                }
            continue

        from_match = PY_FROM_RE.match(line)
        if not from_match:
            continue
        module_spec = from_match.group(1)
        imported_names = [part.strip().split(" as ")[0] for part in from_match.group(2).split(",")]
        module_candidates = resolve_relative_python(importer, module_spec, imported_names, repo_root)
        if not module_candidates and module_spec:
            module_candidates = [module_spec]

        if not module_spec.startswith("."):
            filtered = [module_spec]
            for module_name in module_candidates:
                if module_name == module_spec:
                    continue
                if python_local_candidate(module_name, importer, repo_root):
                    filtered.append(module_name)
            module_candidates = filtered

        for module_name in module_candidates:
            local_target = python_local_candidate(module_name, importer, repo_root)
            target = local_target or f"external:{module_name}"
            resolution = "resolved" if local_target or not module_spec.startswith(".") else "unresolved"
            confidence = "high" if local_target else "medium" if not module_spec.startswith(".") else "low"
            yield {
                "source_file": repo_relative(importer, repo_root),
                "target": target,
                "edge_kind": "import",
                "evidence_ref": make_evidence_ref(importer, line_number, repo_root),
                "confidence": confidence,
                "resolution": resolution,
                "symbol": "",
            }


def read_go_module(repo_root: Path) -> str:
    go_mod = repo_root / "go.mod"
    if not go_mod.exists():
        return ""
    for line in go_mod.read_text(encoding="utf-8").splitlines():
        if line.startswith("module "):
            return line.split(" ", 1)[1].strip()
    return ""


def go_anchor_package(file_path: Path, repo_root: Path, module_name: str) -> str:
    relative_dir = file_path.relative_to(repo_root).parent.as_posix()
    return module_name if relative_dir == "." else f"{module_name}/{relative_dir}"


def iter_go_imports(importer: Path) -> Iterable[tuple[int, str]]:
    text = safe_read_text(importer)
    in_block = False
    for line_number, line in enumerate(text.splitlines(), start=1):
        if line.strip().startswith("import ("):
            in_block = True
            continue
        if in_block and line.strip() == ")":
            in_block = False
            continue
        if in_block:
            match = GO_BLOCK_IMPORT_RE.match(line)
            if match:
                yield line_number, match.group(1)
            continue
        match = GO_SINGLE_IMPORT_RE.match(line)
        if match:
            yield line_number, match.group(1)


def iter_go_edges(importer: Path, repo_root: Path, module_name: str) -> Iterable[dict]:
    for line_number, import_path in iter_go_imports(importer):
        if module_name and import_path.startswith(module_name):
            relative_dir = import_path[len(module_name):].lstrip("/")
            target = relative_dir or "."
            resolution = "resolved"
            confidence = "high"
        else:
            target = f"external:{import_path}"
            resolution = "resolved"
            confidence = "medium"
        yield {
            "source_file": repo_relative(importer, repo_root),
            "target": target,
            "edge_kind": "import",
            "evidence_ref": make_evidence_ref(importer, line_number, repo_root),
            "confidence": confidence,
            "resolution": resolution,
            "symbol": "",
        }


def outbound_edges(stack_family: str, file_path: Path, repo_root: Path) -> tuple[list[dict], list[str]]:
    if stack_family == "typescript":
        edges = list(iter_ts_edges(file_path, repo_root))
        return edges, ["Dynamic imports only resolve when the specifier is a string literal."]
    if stack_family == "python":
        edges = list(iter_python_edges(file_path, repo_root))
        return edges, ["Runtime imports through importlib are not statically resolved."]
    if stack_family == "go":
        module_name = read_go_module(repo_root)
        edges = list(iter_go_edges(file_path, repo_root, module_name))
        return edges, ["Go imports packages, so edges are package-level rather than file-level."]
    # 处理 unknown stack
    return [], [f"Cannot analyze file: unsupported stack family ({stack_family}). File type not in [ts/js/py/go]."]


def inbound_edges(stack_family: str, anchor_path: Path, repo_root: Path) -> list[dict]:
    anchor_relative = repo_relative(anchor_path, repo_root)
    anchor_module = python_module_name(anchor_path, repo_root) if stack_family == "python" else ""
    module_name = read_go_module(repo_root) if stack_family == "go" else ""
    anchor_go_package = go_anchor_package(anchor_path, repo_root, module_name) if stack_family == "go" and module_name else ""

    suffixes = TS_SUFFIXES if stack_family == "typescript" else PY_SUFFIXES if stack_family == "python" else GO_SUFFIXES
    edges: list[dict] = []

    # Go: 优先使用增强的 GoDependencyResolver（如果可用）
    if stack_family == "go":
        resolver = GoDependencyResolver(repo_root)
        if resolver.is_available():
            # 收集候选文件列表
            candidate_files = [
                f for f in iter_files(repo_root, suffixes)
                if f != anchor_path
            ]
            resolved_inbound = resolver.resolve_inbound_edges(anchor_path, candidate_files)
            if resolved_inbound:
                return resolved_inbound

    scale = estimate_repo_scale(repo_root)
    use_parallel = scale == "large"

    if use_parallel:
        # Large 仓库：并行收集候选文件的出边
        candidate_files = [f for f in iter_files(repo_root, suffixes) if f != anchor_path]
        parallel_edges = parallel_outbound_edges(candidate_files, repo_root, stack_family)
        for edge in parallel_edges:
            # 过滤出指向锚点的边
            if edge.get("target") != anchor_relative:
                continue
            edges.append({
                "from": edge.get("source_file", ""),
                "to": anchor_relative,
                "direction": "inbound",
                "edge_kind": edge.get("edge_kind", "import"),
                "symbol": edge.get("symbol", ""),
                "evidence_ref": edge.get("evidence_ref", ""),
                "confidence": edge.get("confidence", "medium"),
                "resolution": edge.get("resolution", "resolved"),
            })
        return edges

    # Medium/Small 仓库：使用原有顺序逻辑
    for candidate in iter_files(repo_root, suffixes):
        if candidate == anchor_path:
            continue
        if stack_family == "typescript":
            candidate_edges = iter_ts_edges(candidate, repo_root)
            matcher = lambda edge, ar=anchor_relative: edge["target"] == ar
        elif stack_family == "python":
            candidate_edges = iter_python_edges(candidate, repo_root)
            matcher = lambda edge, am=anchor_module, ar=anchor_relative: edge["target"] == ar or edge["target"] == f"external:{am}"
        else:
            candidate_edges = iter_go_edges(candidate, repo_root, module_name)
            anchor_dir = anchor_path.parent.relative_to(repo_root).as_posix()
            matcher = lambda edge, ag=anchor_go_package, ad=anchor_dir: ag and (edge["target"] == ad or edge["target"] == f"external:{ag}")

        for edge in candidate_edges:
            if not matcher(edge):
                continue
            resolution = edge["resolution"]
            confidence = edge["confidence"]
            if stack_family == "go":
                resolution = "resolved" if edge["target"] != f"external:{anchor_go_package}" else "unresolved"
                if edge["target"] == anchor_dir:
                    confidence = "high"
                else:
                    confidence = "medium"
            edges.append(
                {
                    "from": edge["source_file"],
                    "to": anchor_relative,
                    "direction": "inbound",
                    "edge_kind": edge["edge_kind"],
                    "symbol": edge["symbol"],
                    "evidence_ref": edge["evidence_ref"],
                    "confidence": confidence,
                    "resolution": resolution,
                }
            )
    return edges


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect import-style code edges around a file anchor.")
    parser.add_argument("--anchor", required=True, help="Path to anchor JSON.")
    parser.add_argument("--stack", required=True, help="Path to stack JSON.")
    parser.add_argument("--output", help="Optional output JSON path.")
    args = parser.parse_args()

    anchor, stack, repo_root, file_path, anchor_relative = load_inputs(args.anchor, args.stack)
    stack_family = stack["stack_family"]

    outbound, blind_spots = outbound_edges(stack_family, file_path, repo_root)
    outbound_edges_payload = [
        {
            "from": anchor_relative,
            "to": edge["target"],
            "direction": "outbound",
            "edge_kind": edge["edge_kind"],
            "symbol": edge["symbol"],
            "evidence_ref": edge["evidence_ref"],
            "confidence": edge["confidence"],
            "resolution": edge["resolution"],
        }
        for edge in outbound
    ]
    inbound = inbound_edges(stack_family, file_path, repo_root)

    payload = {
        "anchor": anchor,
        "stack": stack,
        "edges": outbound_edges_payload + inbound,
        "blind_spots": blind_spots,
    }
    write_json(payload, args.output)


if __name__ == "__main__":
    main()
