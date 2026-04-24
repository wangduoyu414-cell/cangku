from __future__ import annotations

from functools import partial
from typing import Any, Callable, Iterable

from common import iter_files, normalize_path, repo_relative
from collect_code_edges import (
    GO_SUFFIXES,
    PY_SUFFIXES,
    TS_SUFFIXES,
    iter_go_edges,
    iter_python_edges,
    iter_ts_edges,
    read_go_module,
)


IMPACT_TYPE_WEIGHTS = {
    "test": 1.5,
    "public_api": 2.5,
    "config": 1.5,
    "core_lib": 1.0,
    "generated": 0.5,
    "internal": 0.5,
}


def _classify_impact_type(file_path: str) -> str:
    """Classify impact type from a file path."""
    lower = file_path.lower()
    parts = lower.split("/")

    if any(part in parts for part in {"test", "tests", "spec", "__tests__", "__specs__"}):
        return "test"
    if any(lower.endswith(ext) for ext in {".config.", "_config.", "rc."}):
        return "config"
    if any(part in lower for part in {"/api/", "/public/", "/client/"}):
        return "public_api"
    if any(part in lower for part in {"/lib/", "/core/", "/base/", "/shared/"}):
        return "core_lib"
    if "/generated/" in lower or "/gen/" in lower or lower.endswith(".gen."):
        return "generated"
    return "internal"


def _merge_edges(edges: Iterable[dict]) -> list[dict]:
    unique: dict[tuple, dict] = {}
    for edge in edges:
        key = (
            edge.get("edge_kind", ""),
            edge.get("from", ""),
            edge.get("to", ""),
            edge.get("evidence_ref", ""),
        )
        unique[key] = edge
    return list(unique.values())


def _supported_repo_scan(anchor: dict, depth_limit: int) -> tuple[str, set[str], Callable[[Any, Any], Iterable[dict]] | None]:
    if depth_limit <= 1:
        return "confirmed_file_edges_only", set(), None

    language = anchor.get("language", "")
    if language == "typescript":
        return "repo_code_graph_plus_confirmed_context", TS_SUFFIXES, iter_ts_edges
    if language == "python":
        return "repo_code_graph_plus_confirmed_context", PY_SUFFIXES, iter_python_edges
    if language == "go":
        repo_root_value = anchor.get("repo_root", "")
        if not repo_root_value:
            return "confirmed_file_edges_only", set(), None
        module_name = read_go_module(normalize_path(repo_root_value))
        return "repo_code_graph_plus_confirmed_context", GO_SUFFIXES, partial(iter_go_edges, module_name=module_name)
    return "confirmed_file_edges_only", set(), None


def _collect_repo_scan_edges(anchor: dict, depth_limit: int) -> tuple[list[dict], str, str]:
    graph_scope, suffixes, edge_iter = _supported_repo_scan(anchor, depth_limit)
    if edge_iter is None:
        return [], graph_scope, "repo_scan_skipped"

    language = anchor.get("language", "")
    repo_root_value = anchor.get("repo_root", "")
    if not repo_root_value:
        return [], "confirmed_file_edges_only", "repo_root_missing"

    repo_root = normalize_path(repo_root_value)
    if not repo_root.exists():
        return [], "confirmed_file_edges_only", "repo_root_missing"

    expanded_edges: list[dict] = []
    for file_path in iter_files(repo_root, suffixes):
        source_rel = repo_relative(file_path, repo_root)
        for edge in edge_iter(file_path, repo_root):
            if edge.get("confidence") != "high" or edge.get("resolution") != "resolved":
                continue
            target = edge.get("target", "")
            if not target or target.startswith("external:"):
                continue
            targets = [target]
            if language == "go":
                package_dir = repo_root / target
                package_files = sorted(package_dir.glob("*.go")) if package_dir.exists() and package_dir.is_dir() else []
                if package_files:
                    targets = [repo_relative(candidate, repo_root) for candidate in package_files]

            for resolved_target in targets:
                expanded_edges.append(
                    {
                        "from": source_rel,
                        "to": resolved_target,
                        "direction": "outbound",
                        "edge_kind": edge.get("edge_kind", "import"),
                        "symbol": edge.get("symbol", ""),
                        "evidence_ref": edge.get("evidence_ref", ""),
                        "confidence": "high",
                        "resolution": "resolved",
                        "graph_origin": "repo_scan",
                    }
                )

    return _merge_edges(expanded_edges), graph_scope, "repo_scan_success"


def estimate_change_impact(
    anchor: dict,
    all_edges: list[dict],
    depth_limit: int = 3,
    max_results: int = 50,
) -> dict[str, Any]:
    """
    Reverse impact analysis from the anchor file.

    The function starts with confirmed anchor-local edges and, when possible,
    expands the graph with repository-wide confirmed code edges for TS/Python
    so second-hop consumers can be surfaced.
    """
    anchor_path = anchor.get("repo_relative_path", anchor.get("file_path", ""))

    confirmed_edges = [
        edge for edge in all_edges
        if edge.get("confidence") == "high" and edge.get("resolution") == "resolved"
    ]
    repo_scan_edges, graph_scope, expansion_status = _collect_repo_scan_edges(anchor, depth_limit)
    merged_edges = _merge_edges([*confirmed_edges, *repo_scan_edges])

    reverse_adj: dict[str, set[str]] = {}
    for edge in merged_edges:
        frm = edge.get("from", "")
        to = edge.get("to", "")
        if not frm or not to:
            continue
        if to not in reverse_adj:
            reverse_adj[to] = set()
        reverse_adj[to].add(frm)

    impact_map: dict[str, int] = {anchor_path: 0}
    queue: list[str] = [anchor_path]
    impacted_files: list[dict[str, Any]] = []

    while queue:
        current = queue.pop(0)
        current_depth = impact_map[current]

        if current_depth > 0:
            is_direct = current_depth == 1
            impact_type = _classify_impact_type(current)
            impact_score = _calculate_impact_score(current, is_direct, merged_edges)

            impacted_files.append(
                {
                    "file": current,
                    "impact_depth": current_depth,
                    "impact_type": impact_type,
                    "impact_score": impact_score,
                    "is_direct_consumer": is_direct,
                }
            )

        if current_depth >= depth_limit:
            continue

        for dependent in reverse_adj.get(current, set()):
            if dependent not in impact_map:
                impact_map[dependent] = current_depth + 1
                queue.append(dependent)

    total = len(impacted_files)
    direct = sum(1 for item in impacted_files if item["is_direct_consumer"])
    indirect = total - direct
    max_depth = max((item["impact_depth"] for item in impacted_files), default=0)

    high_risk = [
        item
        for item in impacted_files
        if item["impact_score"] >= 7 or item["impact_type"] in {"test", "public_api", "config"}
    ]
    high_risk.sort(key=lambda item: (-item["impact_score"], item["impact_depth"]))
    high_risk = high_risk[:max_results]

    impacted_files.sort(key=lambda item: (-item["impact_score"], item["impact_depth"]))
    all_impacted = impacted_files[:max_results]

    limitations = [
        "Direct impact uses confirmed file-level edges and any confirmed config/build links already present in the slice.",
    ]
    if repo_scan_edges:
        limitations.append(
            "Transitive impact uses repository-wide confirmed code edges to extend beyond the anchor-local slice when the stack-specific scanner is available."
        )
    else:
        limitations.append(
            "Transitive impact is limited to the anchor-local graph because no repository-wide code graph expansion was available."
        )

    return {
        "anchor": anchor_path,
        "graph_scope": graph_scope,
        "expansion_status": expansion_status,
        "expanded_edge_count": len(repo_scan_edges),
        "impact_summary": {
            "total_impacted": total,
            "direct_consumers": direct,
            "indirect_consumers": indirect,
            "max_depth_reached": min(max_depth, depth_limit),
            "depth_limit": depth_limit,
            "depth_limited": max_depth >= depth_limit and total > max_results,
        },
        "high_risk_consumers": high_risk,
        "all_impacted": all_impacted,
        "limitations": limitations,
    }


def _calculate_impact_score(
    file_path: str,
    is_direct: bool,
    all_edges: list[dict],
) -> float:
    """Calculate an impact risk score in the range 0-10."""
    score = 0.0

    if is_direct:
        score += 3.0

    impact_type = _classify_impact_type(file_path)
    score += IMPACT_TYPE_WEIGHTS.get(impact_type, 0.5)

    incoming = sum(
        1
        for edge in all_edges
        if edge.get("to") == file_path and edge.get("confidence") == "high"
    )
    score += min(incoming * 0.5, 3.0)

    return round(min(score, 10.0), 1)
