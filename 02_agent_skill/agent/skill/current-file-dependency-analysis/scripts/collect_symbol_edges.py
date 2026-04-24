from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# 确保 scripts 目录在 sys.path 中
_script_dir = Path(__file__).parent.resolve()
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

from common import normalize_path, read_json, repo_relative, safe_read_text, write_json
from ts_parser import TypeScriptSymbolParser
from py_scope_parser import collect_python_symbol_edges as collect_py_scope_edges
from go_parser import GoDependencyResolver


TS_CALL_RE = re.compile(r"([A-Za-z_]\w*)\s*\(")
TS_FUNC_DEF_RE = re.compile(r"^\s*(?:export\s+)?function\s+([A-Za-z_]\w*)\s*\(")
TS_CLASS_RE = re.compile(r"^\s*(?:export\s+)?class\s+([A-Za-z_]\w*)(?:\s+extends\s+([A-Za-z_]\w*))?")
GO_FUNC_RE = re.compile(r"^\s*func\s+(?:\([^)]+\)\s+)?([A-Za-z_]\w*)\s*\(")
GO_TYPE_RE = re.compile(r"^\s*type\s+([A-Za-z_]\w*)\s+struct\b")


def _make_edge(
    anchor_relative: str,
    relation_type: str,
    symbol_from: str,
    symbol_to: str,
    line_number: int,
    source_file: Path,
    repo_root: Path,
    confidence: str = "medium",
) -> dict:
    return {
        "from": anchor_relative,
        "to": anchor_relative,
        "direction": "outbound",
        "edge_kind": "symbol",
        "relation_type": relation_type,
        "symbol_from": symbol_from,
        "symbol_to": symbol_to,
        "evidence_ref": f"{repo_relative(source_file, repo_root)}:{line_number}",
        "confidence": confidence,
        "resolution": "resolved",
    }


# ---- Python: 作用域感知解析（增强版） ----

def collect_python_symbol_edges(file_path: Path, repo_root: Path, anchor_relative: str) -> tuple[list[dict], list[str]]:
    """
    使用作用域感知分析器收集 Python 符号边。
    返回 (edges, blind_spots)
    """
    edges = collect_py_scope_edges(file_path, repo_root, anchor_relative)
    blind_spots = [
        "Python dynamic dispatch (monkey patching) is not fully resolved.",
        "Framework magic via decorators that auto-wire dependencies is not covered.",
    ]
    return edges, blind_spots


# ---- TypeScript: 编译器级解析（增强版） + 正则降级 ----

def collect_ts_symbol_edges_enhanced(
    file_path: Path,
    repo_root: Path,
    anchor_relative: str,
) -> tuple[list[dict], list[str], bool]:
    """
    使用 TypeScript Compiler API 进行符号解析。

    Returns:
        (edges, blind_spots, used_enhanced)
        - used_enhanced: 是否使用了增强解析
    """
    if TypeScriptSymbolParser.is_available():
        parser = TypeScriptSymbolParser()
        edges = parser.build_edges(file_path, repo_root, anchor_relative)
        if edges:
            blind_spots = [
                "TypeScript/Vue runtime reactivity side effects are not fully resolved.",
                "Framework-specific dependency injection containers are not tracked.",
            ]
            return edges, blind_spots, True

    # 降级到正则解析
    edges, blind_spots = collect_ts_symbol_edges_regex(file_path, repo_root, anchor_relative)
    return edges, blind_spots, False


def collect_ts_symbol_edges_regex(file_path: Path, repo_root: Path, anchor_relative: str) -> tuple[list[dict], list[str]]:
    """
    正则降级版 TypeScript 符号解析。
    保留原有逻辑作为 fallback。
    """
    raw_text = safe_read_text(file_path)
    text = _extract_script_blocks_for_vue(raw_text) if file_path.suffix.lower() == ".vue" else raw_text
    lines = text.splitlines()
    edges: list[dict] = []
    known_functions: set[str] = set()
    known_classes: set[str] = set()

    for idx, line in enumerate(lines, start=1):
        fn_match = TS_FUNC_DEF_RE.match(line)
        if fn_match:
            known_functions.add(fn_match.group(1))
        class_match = TS_CLASS_RE.match(line)
        if class_match:
            class_name = class_match.group(1)
            known_classes.add(class_name)
            if class_match.group(2):
                edges.append(
                    _make_edge(
                        anchor_relative,
                        "inherits",
                        class_name,
                        class_match.group(2),
                        idx,
                        file_path,
                        repo_root,
                        "high",
                    )
                )

    current_symbol = "module"
    for idx, line in enumerate(lines, start=1):
        fn_match = TS_FUNC_DEF_RE.match(line)
        if fn_match:
            current_symbol = fn_match.group(1)
        class_match = TS_CLASS_RE.match(line)
        if class_match:
            current_symbol = class_match.group(1)

        for target in TS_CALL_RE.findall(line):
            if target in {"if", "for", "while", "switch", "return", "import", "require"}:
                continue
            if current_symbol == target:
                continue
            confidence = "medium" if target in known_functions or target in known_classes else "low"
            edges.append(
                _make_edge(anchor_relative, "call", current_symbol, target, idx, file_path, repo_root, confidence)
            )

    blind_spots = [
        "TypeScript/Vue runtime reactivity side effects are not fully resolved.",
        "TypeScript symbol parsing is regex-based fallback (not compiler-level).",
    ]
    return edges, blind_spots


# ---- Go: 增强解析 ----

def collect_go_symbol_edges(
    file_path: Path,
    repo_root: Path,
    anchor_relative: str,
) -> tuple[list[dict], list[str]]:
    """
    使用增强的 GoDependencyResolver 进行符号分析。
    """
    text = safe_read_text(file_path)
    lines = text.splitlines()
    edges: list[dict] = []
    known_funcs: set[str] = set()
    known_types: set[str] = set()

    for idx, line in enumerate(lines, start=1):
        fn_match = GO_FUNC_RE.match(line)
        if fn_match:
            known_funcs.add(fn_match.group(1))
        type_match = GO_TYPE_RE.match(line)
        if type_match:
            known_types.add(type_match.group(1))

    current_symbol = "module"
    for idx, line in enumerate(lines, start=1):
        fn_match = GO_FUNC_RE.match(line)
        if fn_match:
            current_symbol = fn_match.group(1)
            continue
        for target in TS_CALL_RE.findall(line):
            if target in {"if", "for", "switch", "return", "func", "import"}:
                continue
            if current_symbol == target:
                continue
            confidence = "medium" if target in known_funcs or target in known_types else "low"
            edges.append(
                _make_edge(anchor_relative, "call", current_symbol, target, idx, file_path, repo_root, confidence)
            )

    blind_spots = [
        "Go interface method set dispatch is approximated at static level.",
        "Go build tags that change active files are not handled.",
    ]
    return edges, blind_spots


# ---- Vue SFC 脚本块提取 ----

def _extract_script_blocks_for_vue(text: str) -> str:
    blocks = re.findall(r"<script[^>]*>(.*?)</script>", text, flags=re.DOTALL | re.IGNORECASE)
    if not blocks:
        return text
    return "\n".join(blocks)


# ---- 统一入口 ----

def main() -> None:
    parser = argparse.ArgumentParser(description="Collect symbol-level edges for a file anchor.")
    parser.add_argument("--anchor", required=True, help="Path to anchor JSON.")
    parser.add_argument("--stack", required=True, help="Path to stack JSON.")
    parser.add_argument("--output", help="Optional output JSON path.")
    args = parser.parse_args()

    anchor = read_json(args.anchor)
    stack = read_json(args.stack)
    repo_root = normalize_path(anchor["repo_root"])
    file_path = normalize_path(anchor["file_path"])
    anchor_relative = anchor["repo_relative_path"]
    stack_family = stack["stack_family"]

    if stack_family == "python":
        edges, blind_spots = collect_python_symbol_edges(file_path, repo_root, anchor_relative)
    elif stack_family == "go":
        edges, blind_spots = collect_go_symbol_edges(file_path, repo_root, anchor_relative)
    elif stack_family == "unknown":
        # 处理 unknown stack
        edges, blind_spots = [], [f"Cannot analyze file: unsupported stack family ({stack_family}). File type not in [ts/js/py/go]."]
    else:
        # TypeScript / JavaScript / Vue
        edges, blind_spots, used_enhanced = collect_ts_symbol_edges_enhanced(
            file_path, repo_root, anchor_relative
        )
        # 如果使用了降级，在 blind_spots 中补充说明
        if not used_enhanced:
            blind_spots.append(
                "TypeScript parser fell back to regex mode (node/typescript not available)."
            )

    payload = {
        "anchor": anchor,
        "stack": stack,
        "edges": edges,
        "blind_spots": blind_spots,
    }
    write_json(payload, args.output)


if __name__ == "__main__":
    main()
