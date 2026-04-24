from __future__ import annotations

import argparse
from pathlib import Path

from common import iter_files, make_evidence_ref, normalize_path, read_json, repo_relative, safe_read_text, write_json


CONTEXT_FILES = {
    "package.json": "build",
    "tsconfig.json": "config",
    "vite.config.ts": "build",
    "vite.config.js": "build",
    "webpack.config.js": "build",
    "jest.config.js": "test",
    "pyproject.toml": "config",
    "requirements.txt": "build",
    "setup.py": "build",
    "tox.ini": "test",
    "pytest.ini": "test",
    "go.mod": "build",
    "Makefile": "build",
    "Dockerfile": "build",
}

ALLOWED_CONTEXT_SUFFIXES = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".toml",
    ".ini",
    ".yaml",
    ".yml",
    ".json",
}

EXCLUDED_CONTEXT_DIRS = {
    "data",
    "logs",
    "snapshots",
    "__snapshots__",
    "fixtures",
}

MATCH_STRENGTH = {
    "relative_path": "high",
    "file_name": "medium",
    "dotted_path": "medium",
    "stem": "low",
}


def is_context_candidate(path: Path) -> bool:
    path_parts = {part.lower() for part in path.parts}
    if path_parts & EXCLUDED_CONTEXT_DIRS:
        return False
    if path.suffix.lower() in ALLOWED_CONTEXT_SUFFIXES:
        return True
    return path.name in CONTEXT_FILES


def classify_context_kind(path: Path) -> str | None:
    if path.name in CONTEXT_FILES:
        return CONTEXT_FILES[path.name]
    lower_name = path.name.lower()
    if lower_name.endswith((".config.ts", ".config.js", ".config.cjs", ".config.mjs", ".config.py")):
        return "config"
    if "test" in lower_name or "spec" in lower_name:
        return "test"
    return None


def candidate_needles(anchor: dict) -> list[tuple[str, str]]:
    file_path = Path(anchor["file_path"])
    relative_path = anchor["repo_relative_path"]
    stem = file_path.stem
    dotted = relative_path.replace("/", ".").rsplit(".", 1)[0]
    ordered = [
        ("relative_path", relative_path),
        ("file_name", file_path.name),
        ("dotted_path", dotted),
        ("stem", stem),
    ]
    seen: set[str] = set()
    needles: list[tuple[str, str]] = []
    for reason, needle in ordered:
        if not needle or len(needle) <= 2 or needle in seen:
            continue
        seen.add(needle)
        needles.append((reason, needle))
    return needles


def match_needle(line: str, needles: list[tuple[str, str]]) -> tuple[str, str] | None:
    for reason, needle in needles:
        if needle in line:
            return reason, needle
    return None


def context_confidence(edge_kind: str, match_reason: str) -> str:
    strength = MATCH_STRENGTH.get(match_reason, "low")
    if edge_kind in {"config", "build"} and strength == "high":
        return "high"
    if edge_kind in {"config", "build"} and strength == "medium":
        return "medium"
    if edge_kind == "test" and strength == "high":
        return "medium"
    return "low"


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect config, build, generated, and test links around a file anchor.")
    parser.add_argument("--anchor", required=True, help="Path to anchor JSON.")
    parser.add_argument("--stack", required=True, help="Path to stack JSON.")
    parser.add_argument("--output", help="Optional output JSON path.")
    args = parser.parse_args()

    anchor = read_json(args.anchor)
    stack = read_json(args.stack)
    repo_root = normalize_path(anchor["repo_root"])
    anchor_relative = anchor["repo_relative_path"]
    needles = candidate_needles(anchor)

    edges = []
    blind_spots = [
        "Context links are search-based and may miss framework-specific runtime wiring.",
    ]

    for path in iter_files(repo_root):
        if repo_relative(path, repo_root) == anchor_relative:
            continue
        if not is_context_candidate(path):
            continue
        edge_kind = classify_context_kind(path)
        if not edge_kind:
            continue
        text = safe_read_text(path)
        for line_number, line in enumerate(text.splitlines(), start=1):
            matched = match_needle(line, needles)
            if not matched:
                continue
            match_reason, matched_value = matched
            edges.append(
                {
                    "from": repo_relative(path, repo_root),
                    "to": anchor_relative,
                    "direction": "inbound",
                    "edge_kind": edge_kind,
                    "symbol": "",
                    "evidence_ref": make_evidence_ref(path, line_number, repo_root),
                    "confidence": context_confidence(edge_kind, match_reason),
                    "resolution": "resolved",
                    "match_reason": match_reason,
                    "matched_value": matched_value,
                    "evidence_strength": MATCH_STRENGTH.get(match_reason, "low"),
                }
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
