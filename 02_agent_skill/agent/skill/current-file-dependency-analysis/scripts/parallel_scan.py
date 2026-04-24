from __future__ import annotations

import os
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
from typing import Callable, Iterable

# 确保 scripts 目录在 sys.path 中
_scripts_dir = Path(__file__).parent.resolve()
if str(_scripts_dir) not in sys.path:
    sys.path.insert(0, str(_scripts_dir))

from common import SKIP_DIRS, normalize_path


def _scan_subtree(args: tuple) -> list[dict]:
    """在单个子目录内扫描，返回文件路径和内容的列表（避免 pickle 路径对象问题）"""
    root_str, suffixes_tuple = args
    root = Path(root_str)
    suffixes = set(suffixes_tuple) if suffixes_tuple else None
    results: list[dict] = []
    for current_root, dir_names, file_names in os.walk(root):
        dir_names[:] = [d for d in dir_names if d not in SKIP_DIRS]
        for fname in file_names:
            path = Path(current_root) / fname
            if suffixes and path.suffix.lower() not in suffixes:
                continue
            results.append({"path": str(path.resolve())})
    return results


def _parse_file_worker(args: tuple) -> dict | None:
    """工作进程：解析单个文件的出边"""
    file_path_str, repo_root_str, stack_family = args
    file_path = Path(file_path_str)
    repo_root = Path(repo_root_str)

    # 子进程中重新导入（确保 sys.path 正确）
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


def estimate_repo_scale(repo_root: Path) -> str:
    """快速评估仓库规模，决定扫描策略"""
    try:
        top_dirs = [
            d for d in os.listdir(repo_root)
            if (repo_root / d).is_dir() and d not in SKIP_DIRS
        ]
    except OSError:
        return "small"

    if len(top_dirs) <= 3:
        return "small"
    elif len(top_dirs) <= 20:
        return "medium"
    else:
        return "large"


def parallel_iter_files(
    repo_root: str | Path,
    suffixes: set[str] | None = None,
    max_workers: int | None = None,
) -> Iterable[Path]:
    """按顶层子目录分片，并行扫描。"""
    root = normalize_path(repo_root)
    if max_workers is None:
        max_workers = min(os.cpu_count() or 4, 8)

    try:
        top_dirs = [
            root / d for d in os.listdir(root)
            if (root / d).is_dir() and d not in SKIP_DIRS
        ]
    except OSError:
        top_dirs = []

    if len(top_dirs) <= 2:
        yield from _iter_files_sequential(root, suffixes)
        return

    suffixes_tuple = tuple(suffixes) if suffixes else None
    work_items = [(str(subdir), suffixes_tuple) for subdir in top_dirs]

    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(_scan_subtree, item) for item in work_items]
        for future in as_completed(futures):
            try:
                for item in future.result(timeout=60):
                    yield Path(item["path"])
            except Exception:
                pass


def parallel_outbound_edges(
    file_paths: list[Path],
    repo_root: Path,
    stack_family: str,
    max_workers: int = 4,
) -> list[dict]:
    """并行解析多个文件的出边。适用于 inbound_edges 场景。"""
    if not file_paths:
        return []

    work_items = [(str(fp), str(repo_root), stack_family) for fp in file_paths]
    all_edges: list[dict] = []

    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(_parse_file_worker, item) for item in work_items]
        for future in as_completed(futures):
            try:
                result = future.result(timeout=30)
                if result:
                    all_edges.extend(result["edges"])
            except Exception:
                pass

    return all_edges


def _iter_files_sequential(
    repo_root: Path,
    suffixes: set[str] | None,
) -> Iterable[Path]:
    """单线程顺序扫描，作为小仓库的 fallback"""
    for current_root, dir_names, file_names in os.walk(repo_root):
        dir_names[:] = [name for name in dir_names if name not in SKIP_DIRS]
        for file_name in file_names:
            path = Path(current_root) / file_name
            if suffixes and path.suffix.lower() not in suffixes:
                continue
            yield path.resolve()


def iter_files_adaptive(
    repo_root: str | Path,
    suffixes: set[str] | None = None,
) -> tuple[Iterable[Path], str, int]:
    """自适应选择扫描策略。Returns: (iterator, scale, max_workers)"""
    root = normalize_path(repo_root)
    scale = estimate_repo_scale(root)

    if scale == "small":
        return _iter_files_sequential(root, suffixes), scale, 1
    elif scale == "medium":
        return parallel_iter_files(root, suffixes, max_workers=4), scale, 4
    else:
        return parallel_iter_files(root, suffixes, max_workers=8), scale, 8
