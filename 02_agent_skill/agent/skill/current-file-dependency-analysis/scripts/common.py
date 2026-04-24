from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Iterable


REPO_MARKERS = (
    ".git",
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "setup.py",
    "go.mod",
)

SKIP_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".tmp",
    ".venv",
    ".cache",
    "venv",
    "__pycache__",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".turbo",
    "coverage",
    "target",
    "tmp",
    "bin",
    "obj",
}


def normalize_path(value: str | Path) -> Path:
    return Path(value).expanduser().resolve()


def find_repo_root(start: str | Path) -> Path:
    current = normalize_path(start)
    if current.is_file():
        current = current.parent
    for candidate in (current, *current.parents):
        for marker in REPO_MARKERS:
            if (candidate / marker).exists():
                return candidate
    raise ValueError(
        f"Cannot find repository root from {start}. "
        f"Expected one of: {', '.join(REPO_MARKERS)}. "
        f"Please specify --repo-root explicitly."
    )


def repo_relative(path: str | Path, repo_root: str | Path) -> str:
    path_obj = normalize_path(path)
    root_obj = normalize_path(repo_root)
    try:
        return path_obj.relative_to(root_obj).as_posix()
    except ValueError:
        return path_obj.as_posix()


def detect_language(file_path: str | Path) -> str:
    suffix = normalize_path(file_path).suffix.lower()
    if suffix in {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue"}:
        return "typescript"
    if suffix == ".py":
        return "python"
    if suffix == ".go":
        return "go"
    return suffix.lstrip(".") or "unknown"


def classify_role(file_path: str | Path) -> str:
    path_obj = normalize_path(file_path)
    path_text = path_obj.as_posix().lower()
    name = path_obj.name.lower()
    if any(part in {"tests", "test", "__tests__", "spec"} for part in path_obj.parts):
        return "test"
    if name.endswith((".config.ts", ".config.js", ".config.cjs", ".config.mjs", ".config.py")):
        return "config"
    if name in {
        "package.json",
        "tsconfig.json",
        "pyproject.toml",
        "requirements.txt",
        "go.mod",
    }:
        return "config"
    if "generated" in path_text or path_text.endswith(".gen.go"):
        return "generated"
    return "source"


def read_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(data: Any, output: str | Path | None) -> None:
    payload = json.dumps(data, indent=2, ensure_ascii=False)
    if output:
        Path(output).write_text(payload + os.linesep, encoding="utf-8")
        return
    print(payload)


def iter_files(repo_root: str | Path, suffixes: set[str] | None = None) -> Iterable[Path]:
    root_obj = normalize_path(repo_root)
    for current_root, dir_names, file_names in os.walk(root_obj):
        dir_names[:] = [name for name in dir_names if name not in SKIP_DIRS]
        for file_name in file_names:
            path = Path(current_root) / file_name
            if suffixes and path.suffix.lower() not in suffixes:
                continue
            yield path.resolve()


def make_evidence_ref(path: str | Path, line_number: int, repo_root: str | Path) -> str:
    return f"{repo_relative(path, repo_root)}:{line_number}"


def safe_read_text(path: str | Path) -> str:
    try:
        return Path(path).read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return Path(path).read_text(encoding="utf-8", errors="ignore")
