from __future__ import annotations

from typing import Any
from common import write_json


def detect_dependency_cycles(
    all_edges: list[dict],
    max_cycle_length: int = 20,
) -> list[dict[str, Any]]:
    """
    基于 Kahn 算法检测依赖图中的环。

    仅使用 confirmed edges (confidence=high 且 resolution=resolved) 构建图。
    检测到的环按长度分级：3 步以内为 critical，超过 3 步为 warning。

    Args:
        all_edges: 完整边列表（来自 build_slice 的 confirmed_dependencies）
        max_cycle_length: 允许检测的最大环长度（防止超长路径）

    Returns:
        [
            {
                "cycle": ["A.py", "B.py", "C.py", "A.py"],
                "length": 3,
                "severity": "critical",
                "description": "直接循环依赖: A -> B -> C -> A"
            }
        ]
    """
    # 构建邻接表（仅使用 confirmed edges）
    confirmed = [
        e for e in all_edges
        if e.get("confidence") == "high"
        and e.get("resolution") == "resolved"
    ]

    if not confirmed:
        return []

    # 构建节点集合和邻接表
    nodes: set[str] = set()
    for e in confirmed:
        frm = e.get("from", "")
        to = e.get("to", "")
        if frm:
            nodes.add(frm)
        if to:
            nodes.add(to)

    # 邻接表和入度
    adj: dict[str, set[str]] = {n: set() for n in nodes}
    in_degree: dict[str, int] = {n: 0 for n in nodes}

    for e in confirmed:
        frm = e.get("from", "")
        to = e.get("to", "")
        if not frm or not to:
            continue
        if to not in adj.get(frm, set()):
            adj[frm].add(to)
            in_degree[to] = in_degree.get(to, 0) + 1

    # Kahn 拓扑排序
    queue: list[str] = [n for n in nodes if in_degree[n] == 0]
    removed_count = 0

    while queue:
        node = queue.pop(0)
        removed_count += 1
        for neighbor in list(adj[node]):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    remaining = [n for n in nodes if in_degree[n] > 0]

    cycles: list[dict[str, Any]] = []

    # 从每个剩余节点（环中节点）出发，找环
    for start in remaining:
        path = _find_cycle_dfs(adj, start, max_cycle_length)
        if path:
            cycle_key = tuple(sorted(path[:len(path) - 1]))
            if any(tuple(sorted(c["cycle"][:-1])) == cycle_key for c in cycles):
                continue  # 已记录过该环

            length = len(path) - 1
            severity = "critical" if length <= 3 else "warning"
            description = _describe_cycle(path)
            cycles.append({
                "cycle": path,
                "length": length,
                "severity": severity,
                "description": description,
            })

    # 按 severity 和长度排序
    cycles.sort(key=lambda c: (0 if c["severity"] == "critical" else 1, c["length"]))
    return cycles


def _find_cycle_dfs(
    adj: dict[str, set[str]],
    start: str,
    max_depth: int,
) -> list[str] | None:
    """DFS 查找经过 start 的环"""
    visited: set[str] = set()
    path: list[str] = []

    def dfs(node: str) -> bool:
        if node in path:
            idx = path.index(node)
            return True
        if node in visited or len(path) > max_depth:
            return False

        visited.add(node)
        path.append(node)

        for neighbor in adj.get(node, set()):
            if dfs(neighbor):
                return True

        path.pop()
        return False

    if dfs(start):
        idx = path.index(start)
        cycle = path[idx:] + [start]
        return cycle
    return None


def _describe_cycle(cycle: list[str]) -> str:
    """生成环的人类可读描述"""
    if len(cycle) <= 1:
        return "自引用"
    parts = []
    for i, node in enumerate(cycle[:-1]):
        parts.append(node)
        parts.append(" -> ")
    parts.append(cycle[-1])
    return "".join(parts)
