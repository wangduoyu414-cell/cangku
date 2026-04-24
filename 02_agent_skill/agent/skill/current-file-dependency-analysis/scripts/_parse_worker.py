"""
_parse_worker.py - 独立的子进程工作模块（避免循环导入）
在子进程中被 parallel_scan.py 调用。
"""
from __future__ import annotations

import sys
from pathlib import Path

# 确保 scripts 目录在 sys.path 中
_scripts_dir = Path(__file__).parent.resolve()
if str(_scripts_dir) not in sys.path:
    sys.path.insert(0, str(_scripts_dir))


def parse_file_worker(args: tuple) -> dict | None:
    """
    工作进程：解析单个文件的出边。

    Args:
        args: (file_path_str, repo_root_str, stack_family)

    Returns:
        {"path": file_path_str, "edges": [...]}
        or None on error
    """
    file_path_str, repo_root_str, stack_family = args
    file_path = Path(file_path_str)
    repo_root = Path(repo_root_str)

    try:
        if stack_family == "typescript":
            from collect_code_edges import iter_ts_edges, TS_SUFFIXES
            if file_path.suffix.lower() not in TS_SUFFIXES:
                return None
            edges = list(iter_ts_edges(file_path, repo_root))
        elif stack_family == "python":
            from collect_code_edges import iter_python_edges, PY_SUFFIXES
            if file_path.suffix.lower() not in PY_SUFFIXES:
                return None
            edges = list(iter_python_edges(file_path, repo_root))
        elif stack_family == "go":
            from collect_code_edges import iter_go_edges, GO_SUFFIXES, read_go_module
            if file_path.suffix.lower() not in GO_SUFFIXES:
                return None
            module_name = read_go_module(repo_root)
            edges = list(iter_go_edges(file_path, repo_root, module_name))
        else:
            return None
        return {"path": file_path_str, "edges": edges}
    except Exception:
        return None
