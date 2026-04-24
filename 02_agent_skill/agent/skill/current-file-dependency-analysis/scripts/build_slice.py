from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Ensure scripts directory is on sys.path.
_script_dir = Path(__file__).parent.resolve()
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

from common import normalize_path, read_json, write_json
from cycle_detection import detect_dependency_cycles
from impact_estimation import estimate_change_impact
from build_integration import trace_file_to_build_targets
from resilient_runner import ResilientTaskRunner, StageStatus


def _edge_key(edge: dict) -> tuple:
    return (
        edge.get("edge_kind", ""),
        edge.get("from", ""),
        edge.get("to", ""),
        edge.get("evidence_ref", ""),
    )


def _dedupe_and_sort(edges: list[dict]) -> list[dict]:
    unique: dict[tuple, dict] = {}
    for edge in edges:
        unique[_edge_key(edge)] = edge
    return [unique[key] for key in sorted(unique.keys())]


def _is_confirmed(edge: dict) -> bool:
    return edge.get("resolution") == "resolved" and edge.get("confidence") == "high"


def _is_config_or_build_edge(edge: dict) -> bool:
    return edge.get("edge_kind") in {"config", "build"}


def _limit_edges(edges: list[dict], payload_level: str, l15_limit: int, l2_limit: int) -> list[dict]:
    if payload_level == "L1":
        return []
    if payload_level == "L1.5":
        return edges[:l15_limit]
    if payload_level == "L2":
        return edges[:l2_limit]
    return edges


def _candidate_reason(edge: dict) -> str:
    edge_kind = edge.get("edge_kind", "")
    if edge_kind == "dynamic-import":
        return "dynamic_resolution"
    if edge_kind in {"config", "build", "test"}:
        return "text_only_match"
    return "lower_confidence_edge"


def _annotate_candidates(edges: list[dict]) -> list[dict]:
    annotated: list[dict] = []
    for edge in edges:
        item = dict(edge)
        item.setdefault("unconfirmed_reason", _candidate_reason(edge))
        annotated.append(item)
    return annotated


def _build_estimated_impact(change_impact: dict | None) -> dict:
    if not change_impact:
        return {
            "graph_scope": "confirmed_file_edges_only",
            "direct_confirmed_impact": [],
            "transitive_estimated_impact": [],
            "impact_confidence": "unknown",
            "limitations": [
                "Impact estimation was not available for this slice.",
            ],
        }
    if "error" in change_impact:
        return {
            "graph_scope": "confirmed_file_edges_only",
            "direct_confirmed_impact": [],
            "transitive_estimated_impact": [],
            "impact_confidence": "failed",
            "limitations": [
                "Impact estimation failed for this slice.",
            ],
            "error": change_impact["error"],
        }

    all_impacted = change_impact.get("all_impacted", [])
    direct = [
        item for item in all_impacted
        if item.get("impact_depth") == 1 or item.get("is_direct_consumer")
    ]
    transitive = [
        item for item in all_impacted
        if item.get("impact_depth", 0) > 1
    ]
    graph_scope = change_impact.get("graph_scope", "confirmed_file_edges_only")
    limitations = change_impact.get("limitations", [
        "Impact expansion only walks confirmed file-level edges available in this slice.",
        "Transitive impact is bounded by the anchor-local graph captured for this slice.",
    ])
    return {
        "graph_scope": graph_scope,
        "direct_confirmed_impact": direct,
        "transitive_estimated_impact": transitive,
        "impact_confidence": "mixed" if transitive else "high",
        "limitations": limitations,
    }


def _count_tokens(obj: dict) -> int:
    serialized = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return max(1, len(serialized) // 4)


def _confidence_rank(value: str) -> int:
    return {"high": 0, "medium": 1, "low": 2}.get(value, 3)


def _evidence_strength_rank(value: str) -> int:
    return {"high": 0, "medium": 1, "low": 2}.get(value, 3)


def _context_priority(edge: dict) -> tuple:
    match_reason = edge.get("match_reason", "")
    return (
        _confidence_rank(edge.get("confidence", "")),
        _evidence_strength_rank(edge.get("evidence_strength", "")),
        0 if match_reason == "relative_path" else 1 if match_reason == "file_name" else 2,
        edge.get("evidence_ref", ""),
    )


def _collapse_context_edges(edges: list[dict]) -> list[dict]:
    best_by_group: dict[tuple, dict] = {}
    for edge in edges:
        group_key = (
            edge.get("from", ""),
            edge.get("to", ""),
            edge.get("direction", ""),
            edge.get("edge_kind", ""),
        )
        current = best_by_group.get(group_key)
        if current is None or _context_priority(edge) < _context_priority(current):
            best_by_group[group_key] = edge
    return sorted(best_by_group.values(), key=_context_priority)


def _symbol_priority(edge: dict) -> tuple:
    relation_type = edge.get("relation_type", "")
    symbol_from = edge.get("symbol_from", "")
    symbol_to = edge.get("symbol_to", "")
    low_signal = symbol_to in {"this", "import", "module", "require", "exports"} or symbol_from == "module"
    relation_rank = 0 if relation_type in {"inherits", "implements"} else 1
    return (
        _confidence_rank(edge.get("confidence", "")),
        relation_rank,
        1 if low_signal else 0,
        edge.get("evidence_ref", ""),
    )


def _is_low_signal_symbol_relation(edge: dict) -> bool:
    if edge.get("relation_type") != "call":
        return False

    symbol_to = edge.get("symbol_to", "")
    if symbol_to in {"this", "import", "module", "require", "exports"}:
        return True

    return False


def _filter_symbol_relations(edges: list[dict]) -> list[dict]:
    return [
        edge for edge in edges
        if not _is_low_signal_symbol_relation(edge)
    ]


def _trim_symbol_relations(edges: list[dict], limit: int) -> list[dict]:
    edges = _filter_symbol_relations(edges)
    preferred = [
        edge for edge in edges
        if edge.get("symbol_to") not in {"this", "import"}
    ]
    source = preferred if preferred else edges
    return sorted(source, key=_symbol_priority)[:limit]


def _candidate_priority(edge: dict) -> tuple:
    edge_kind = edge.get("edge_kind", "")
    reason = edge.get("unconfirmed_reason", "")
    edge_rank = 0 if edge_kind == "dynamic-import" else 1 if edge_kind == "import" else 2
    reason_rank = 0 if reason == "dynamic_resolution" else 1 if reason == "lower_confidence_edge" else 2
    return (
        _confidence_rank(edge.get("confidence", "")),
        edge_rank,
        reason_rank,
        edge.get("evidence_ref", ""),
    )


def _trim_candidate_edges(edges: list[dict], limit: int) -> list[dict]:
    return sorted(edges, key=_candidate_priority)[:limit]


def _trim_build_targets(targets: list[dict], medium_limit: int) -> list[dict]:
    high = [target for target in targets if target.get("confidence") == "high"]
    medium = [target for target in targets if target.get("confidence") == "medium"]
    return [*high, *medium[:medium_limit]]


def _partition_build_targets(targets: list[dict]) -> tuple[list[dict], list[dict]]:
    confirmed = [target for target in targets if target.get("confidence") == "high"]
    candidates = [target for target in targets if target.get("confidence") != "high"]
    return confirmed, candidates


def _build_claim_certainty() -> dict:
    return {
        "classification_mode": "deterministic_vs_non_deterministic",
        "contains_recommendations": False,
        "sections": {
            "confirmed_dependencies": "deterministic",
            "hard_facts": "deterministic",
            "dependency_cycles": "deterministic",
            "candidate_dependencies": "non_deterministic",
            "supporting_signals": "non_deterministic",
            "estimated_impact": "non_deterministic",
            "change_impact": "non_deterministic",
            "blind_spots": "non_deterministic",
            "unresolved_edges": "non_deterministic",
        },
        "deterministic_definition": (
            "Deterministic content is limited to resolved, high-confidence relationships "
            "and directly evidenced mappings."
        ),
        "non_deterministic_definition": (
            "Non-deterministic content includes candidates, text matches, unresolved items, "
            "blind spots, and impact estimates."
        ),
        "omitted_sections_note": (
            "Sections not listed in this map are metadata, process status, summaries, "
            "or legacy aggregate views."
        ),
    }


def _prune_empty(value):
    if isinstance(value, dict):
        pruned: dict = {}
        for key, item in value.items():
            compacted = _prune_empty(item)
            if compacted is None:
                continue
            pruned[key] = compacted
        return pruned or None
    if isinstance(value, list):
        pruned_items = []
        for item in value:
            compacted = _prune_empty(item)
            if compacted is None:
                continue
            pruned_items.append(compacted)
        return pruned_items or None
    if value is None or value == "":
        return None
    return value


def _build_minimal_pipeline_status(payload: dict) -> dict:
    pipeline_status = payload.get("pipeline_status", {})
    minimal = {
        "overall": pipeline_status.get("overall", "unknown"),
    }

    stage_exceptions = {
        stage: status
        for stage, status in pipeline_status.items()
        if stage != "overall" and status != "success"
    }
    if stage_exceptions:
        minimal["stages"] = stage_exceptions

    details: dict[str, dict] = {}
    for stage, detail in payload.get("pipeline_status_details", {}).items():
        if (
            stage in stage_exceptions
            or detail.get("status") != "success"
            or detail.get("attempts", 1) > 1
            or detail.get("error")
        ):
            details[stage] = detail
    if details:
        minimal["details"] = details
    return minimal


def _build_minimal_estimated_impact(payload: dict) -> dict | None:
    estimated = payload.get("estimated_impact", {}) or {}
    change = payload.get("change_impact", {}) or {}

    if not estimated and not change:
        return None

    if "error" in change:
        return _prune_empty({
            "graph_scope": estimated.get("graph_scope", "confirmed_file_edges_only"),
            "impact_confidence": estimated.get("impact_confidence", "failed"),
            "error": change.get("error"),
            "limitations": estimated.get("limitations", []) or change.get("limitations", []),
        })

    return _prune_empty({
        "graph_scope": change.get("graph_scope") or estimated.get("graph_scope"),
        "expansion_status": change.get("expansion_status"),
        "summary": change.get("impact_summary", {}),
        "direct_impact": estimated.get("direct_confirmed_impact", []),
        "transitive_impact": estimated.get("transitive_estimated_impact", []),
        "high_risk_consumers": change.get("high_risk_consumers", []),
        "impact_confidence": estimated.get("impact_confidence"),
        "limitations": change.get("limitations", []) or estimated.get("limitations", []),
    })


def _minimize_context_mentions(
    context_mentions: list[dict],
    confirmed_config_links: list[dict],
) -> list[dict]:
    confirmed_refs = {
        edge.get("evidence_ref", "")
        for edge in confirmed_config_links
        if edge.get("evidence_ref")
    }
    return [
        edge for edge in context_mentions
        if edge.get("evidence_ref", "") not in confirmed_refs
    ]


def _minimize_candidate_file_edges(candidate_edges: list[dict]) -> list[dict]:
    return [
        edge for edge in candidate_edges
        if edge.get("edge_kind") not in {"config", "build", "test"}
    ]


def _build_minimal_payload(payload: dict) -> dict:
    anchor = payload.get("anchor", {})
    hard_facts = payload.get("hard_facts", {})
    file_edges = hard_facts.get("confirmed_file_edges", {})
    supporting = payload.get("supporting_signals", {})

    compact_payload = {
        "schema_version": "4.3",
        "target": {
            "file": anchor.get("repo_relative_path", anchor.get("file_path", "")),
            "repo_root": anchor.get("repo_root", ""),
            "stack_family": anchor.get("language", ""),
            "analysis_mode": payload.get("meta", {}).get("analysis_mode", ""),
            "payload_level": payload.get("meta", {}).get("payload_level", ""),
            "graph_scope": payload.get("meta", {}).get("graph_scope", ""),
        },
        "hard_facts": {
            "file_edges": {
                "outbound": file_edges.get("direct_outbound", []),
                "inbound": file_edges.get("direct_inbound", []),
            },
            "config_links": hard_facts.get("confirmed_config_links", []),
            "build_targets": hard_facts.get("confirmed_build_targets", []),
            "dependency_cycles": hard_facts.get("confirmed_dependency_cycles", []),
        },
        "supporting_signals": {
            "candidate_file_edges": _minimize_candidate_file_edges(
                supporting.get("candidate_file_edges", [])
            ),
            "candidate_build_targets": supporting.get("candidate_build_targets", []),
            "symbol_relations": supporting.get("symbol_relations", []),
            "context_mentions": _minimize_context_mentions(
                supporting.get("context_mentions", []),
                hard_facts.get("confirmed_config_links", []),
            ),
            "unresolved_edges": payload.get("unresolved_edges", []),
            "blind_spots": supporting.get("blind_spots", []) or payload.get("blind_spots", []),
        },
        "estimated_impact": _build_minimal_estimated_impact(payload),
        "pipeline_status": _build_minimal_pipeline_status(payload),
    }
    return _prune_empty(compact_payload) or {
        "schema_version": "4.3",
        "pipeline_status": {"overall": "unknown"},
    }


def _impact_priority(item: dict) -> tuple:
    return (
        item.get("impact_depth", 999),
        -float(item.get("impact_score", 0.0)),
        item.get("file", ""),
    )


def _trim_change_impact(change_impact: dict, all_limit: int, high_risk_limit: int) -> dict:
    if not change_impact or "error" in change_impact:
        return change_impact
    trimmed = dict(change_impact)
    direct_items = [
        item for item in change_impact.get("all_impacted", [])
        if item.get("impact_depth", 0) <= 1
    ]
    transitive_items = [
        item for item in change_impact.get("all_impacted", [])
        if item.get("impact_depth", 0) > 1
    ]
    direct_sorted = sorted(direct_items, key=_impact_priority)
    transitive_sorted = sorted(transitive_items, key=_impact_priority)
    transitive_kept = transitive_sorted[: min(4, len(transitive_sorted))]
    direct_budget = max(all_limit - len(transitive_kept), 0)
    direct_kept = direct_sorted[:direct_budget]
    if len(direct_kept) + len(transitive_kept) < min(all_limit, len(direct_sorted) + len(transitive_sorted)):
        remaining_slots = all_limit - len(direct_kept) - len(transitive_kept)
        if remaining_slots > 0:
            direct_kept.extend(direct_sorted[direct_budget: direct_budget + remaining_slots])
    all_impacted = [*direct_kept, *transitive_kept]
    high_risk = sorted(change_impact.get("high_risk_consumers", []), key=_impact_priority)[:high_risk_limit]
    summary = dict(change_impact.get("impact_summary", {}))
    summary["reported_impacted"] = len(all_impacted)
    summary["reported_high_risk"] = len(high_risk)
    trimmed["all_impacted"] = all_impacted
    trimmed["high_risk_consumers"] = high_risk
    trimmed["impact_summary"] = summary
    return trimmed


def _trim_context_for_profile(edges: list[dict], limit: int) -> list[dict]:
    collapsed = _collapse_context_edges(edges)
    return collapsed[:limit]


def _strip_promoted_context_mentions(context_mentions: list[dict], confirmed_config_links: list[dict]) -> list[dict]:
    confirmed_refs = {
        edge.get("evidence_ref", "")
        for edge in confirmed_config_links
        if edge.get("evidence_ref")
    }
    filtered = [
        edge for edge in context_mentions
        if edge.get("evidence_ref", "") not in confirmed_refs
    ]
    return filtered if filtered else context_mentions


def _apply_budget_profile(
    payload: dict,
    *,
    context_limit: int,
    symbol_limit: int,
    candidate_limit: int,
    config_limit: int,
    build_medium_limit: int,
    impact_all_limit: int,
    impact_high_risk_limit: int,
    drop_legacy_candidates: bool = False,
    drop_legacy_config_links: bool = False,
) -> None:
    trimmed_config = _trim_context_for_profile(
        payload["hard_facts"].get("confirmed_config_links", []),
        config_limit,
    )
    payload["hard_facts"]["confirmed_config_links"] = trimmed_config
    payload["confirmed_dependencies"]["config_links"] = [] if drop_legacy_config_links else trimmed_config

    trimmed_context_mentions = _trim_context_for_profile(
        payload["supporting_signals"].get("context_mentions", []),
        context_limit,
    )
    payload["supporting_signals"]["context_mentions"] = _strip_promoted_context_mentions(
        trimmed_context_mentions,
        trimmed_config,
    )
    payload["supporting_signals"]["symbol_relations"] = _trim_symbol_relations(
        payload["supporting_signals"].get("symbol_relations", []),
        symbol_limit,
    )
    trimmed_candidates = _trim_candidate_edges(
        payload["supporting_signals"].get("candidate_file_edges", []),
        candidate_limit,
    )
    payload["supporting_signals"]["candidate_file_edges"] = trimmed_candidates
    payload["candidate_dependencies"] = [] if drop_legacy_candidates else _trim_candidate_edges(
        payload.get("candidate_dependencies", []),
        candidate_limit,
    )
    trimmed_build_targets = _trim_build_targets(payload.get("build_targets", []), build_medium_limit)
    payload["build_targets"] = trimmed_build_targets
    confirmed_build_targets, candidate_build_targets = _partition_build_targets(trimmed_build_targets)
    payload["hard_facts"]["confirmed_build_targets"] = confirmed_build_targets
    payload["supporting_signals"]["candidate_build_targets"] = candidate_build_targets
    payload["change_impact"] = _trim_change_impact(
        payload.get("change_impact", {}),
        impact_all_limit,
        impact_high_risk_limit,
    )
    payload["estimated_impact"] = _build_estimated_impact(payload.get("change_impact"))


def _apply_budget_trimming(payload: dict) -> None:
    max_tokens = payload.get("budget_meta", {}).get("max_token_estimate", 3000)
    applied: list[str] = []
    token_estimate = _count_tokens(payload)

    if token_estimate <= max_tokens:
        payload["budget_meta"]["token_estimate"] = token_estimate
        payload["budget_meta"]["truncated"] = False
        return

    profiles = [
        (
            "collapse_redundant_context",
            dict(
                context_limit=10,
                symbol_limit=8,
                candidate_limit=8,
                config_limit=8,
                build_medium_limit=2,
                impact_all_limit=12,
                impact_high_risk_limit=6,
            ),
        ),
        (
            "trim_supporting_signals_medium",
            dict(
                context_limit=6,
                symbol_limit=5,
                candidate_limit=5,
                config_limit=6,
                build_medium_limit=1,
                impact_all_limit=8,
                impact_high_risk_limit=4,
            ),
        ),
        (
            "trim_supporting_signals_aggressive",
            dict(
                context_limit=4,
                symbol_limit=3,
                candidate_limit=3,
                config_limit=4,
                build_medium_limit=1,
                impact_all_limit=5,
                impact_high_risk_limit=3,
                drop_legacy_candidates=True,
                drop_legacy_config_links=True,
            ),
        ),
    ]

    for label, profile in profiles:
        if token_estimate <= max_tokens:
            break
        _apply_budget_profile(payload, **profile)
        applied.append(label)
        token_estimate = _count_tokens(payload)

    payload["budget_meta"]["token_estimate"] = token_estimate
    payload["budget_meta"]["truncated"] = token_estimate > max_tokens
    if applied:
        payload["budget_meta"]["trimming_applied"] = applied
        payload["budget_meta"]["budget_note"] = (
            payload["budget_meta"]["budget_note"]
            + " Payload trimming was applied to supporting signals, legacy mirrors, and expanded impact lists to stay closer to the token budget."
        )


def _parse_forced_failures() -> set[str]:
    raw = os.environ.get("ANALYZE_DEP_FORCE_STAGE_FAILURES", "")
    return {item.strip() for item in raw.split(",") if item.strip()}


def _maybe_force_stage_failure(stage: str, forced_failures: set[str]) -> None:
    if stage in forced_failures or "all" in forced_failures:
        raise RuntimeError(f"Forced failure for stage: {stage}")


def _fallback_impact_type(file_path: str) -> str:
    lower = file_path.lower()
    parts = lower.split("/")
    if any(part in parts for part in {"test", "tests", "spec", "__tests__", "__specs__"}):
        return "test"
    if any(marker in lower for marker in {"/api/", "/public/", "/client/"}):
        return "public_api"
    if any(marker in lower for marker in {".config.", "_config.", "rc.", "package.json", "tsconfig.json", "go.mod"}):
        return "config"
    return "internal"


def _fallback_impact_score(file_path: str) -> float:
    impact_type = _fallback_impact_type(file_path)
    if impact_type == "public_api":
        return 4.0
    if impact_type == "test":
        return 3.5
    if impact_type == "config":
        return 3.0
    return 2.5


def _fallback_change_impact(anchor: dict, confirmed_edges: list[dict]) -> dict:
    anchor_path = anchor.get("repo_relative_path", anchor.get("file_path", ""))
    direct_consumers = sorted(
        {
            edge.get("from", "")
            for edge in confirmed_edges
            if edge.get("to") == anchor_path and edge.get("from")
        }
    )
    impacted = [
        {
            "file": file_path,
            "impact_depth": 1,
            "impact_type": _fallback_impact_type(file_path),
            "impact_score": _fallback_impact_score(file_path),
            "is_direct_consumer": True,
        }
        for file_path in direct_consumers
    ]
    high_risk = [
        item for item in impacted
        if item["impact_type"] in {"test", "public_api", "config"}
    ]
    return {
        "anchor": anchor_path,
        "graph_scope": "confirmed_file_edges_only",
        "expansion_status": "fallback_direct_only",
        "expanded_edge_count": 0,
        "impact_summary": {
            "total_impacted": len(impacted),
            "direct_consumers": len(impacted),
            "indirect_consumers": 0,
            "max_depth_reached": 1 if impacted else 0,
            "depth_limit": 1,
            "depth_limited": False,
        },
        "high_risk_consumers": high_risk,
        "all_impacted": impacted,
        "limitations": [
            "Fallback impact estimation only preserves direct confirmed consumers from the current slice.",
            "Transitive impact is unavailable in degraded mode.",
        ],
    }


def _infer_build_system(source_file: str) -> str:
    lowered = source_file.lower()
    if lowered == "makefile":
        return "make"
    if lowered == "package.json":
        return "npm"
    if lowered == "go.mod":
        return "go"
    if lowered.endswith("cmakelists.txt") or lowered.endswith(".cmake"):
        return "cmake"
    return "context-search"


def _fallback_build_targets(anchor: dict, config_links: list[dict]) -> list[dict]:
    target_file = anchor.get("repo_relative_path", anchor.get("file_path", ""))
    fallback_targets: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for edge in config_links:
        source_file = edge.get("from", "")
        if not source_file:
            continue
        system = _infer_build_system(source_file)
        key = (system, source_file)
        if key in seen:
            continue
        seen.add(key)
        fallback_targets.append(
            {
                "system": system,
                "target": source_file,
                "matched_dependency": target_file,
                "confidence": "medium",
                "fallback": True,
                "fallback_source": source_file,
                "evidence_ref": edge.get("evidence_ref", ""),
            }
        )
    return fallback_targets


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a canonical file-centered dependency slice.")
    parser.add_argument("--anchor", required=True, help="Path to anchor JSON.")
    parser.add_argument("--code", required=True, help="Path to code-edges JSON.")
    parser.add_argument("--context", required=True, help="Path to context-edges JSON.")
    parser.add_argument("--symbol", help="Path to symbol-edges JSON.")
    parser.add_argument(
        "--analysis-mode",
        choices=["strict", "extended"],
        default="strict",
        help="strict only exposes confirmed edges in main output; extended includes candidates.",
    )
    parser.add_argument(
        "--payload-level",
        choices=["L1", "L1.5", "L2", "L3"],
        default="L1.5",
        help="Progressive disclosure level for downstream context composition.",
    )
    parser.add_argument(
        "--max-token-estimate",
        type=int,
        default=3000,
        help="Soft output budget for token estimate metadata.",
    )
    parser.add_argument(
        "--impact-depth",
        type=int,
        default=3,
        help="Maximum depth for change impact estimation (default: 3).",
    )
    parser.add_argument(
        "--no-cycle-detection",
        action="store_true",
        help="Disable cycle detection.",
    )
    parser.add_argument(
        "--no-impact-estimation",
        action="store_true",
        help="Disable change impact estimation.",
    )
    parser.add_argument(
        "--no-build-integration",
        action="store_true",
        help="Disable build system integration.",
    )
    parser.add_argument("--output", help="Optional output JSON path.")
    args = parser.parse_args()

    runner = ResilientTaskRunner(max_retries=1, timeout=30.0)
    forced_failures = _parse_forced_failures()

    anchor = read_json(args.anchor)
    code = read_json(args.code)
    context = read_json(args.context)
    symbol = read_json(args.symbol) if args.symbol else {"edges": [], "blind_spots": []}

    code_edges = _dedupe_and_sort(code.get("edges", []))
    context_edges = _dedupe_and_sort(context.get("edges", []))
    symbol_edges = _dedupe_and_sort(symbol.get("edges", []))
    file_edges = [*code_edges, *context_edges]

    confirmed_edges = [edge for edge in file_edges if _is_confirmed(edge)]
    candidate_edges = [edge for edge in file_edges if not _is_confirmed(edge)]

    direct_outbound = [
        edge for edge in confirmed_edges
        if edge.get("direction") == "outbound" and not _is_config_or_build_edge(edge)
    ]
    direct_inbound = [
        edge for edge in confirmed_edges
        if edge.get("direction") == "inbound" and not _is_config_or_build_edge(edge)
    ]
    config_links = [edge for edge in confirmed_edges if _is_config_or_build_edge(edge)]
    unresolved = [edge for edge in file_edges if edge.get("resolution") != "resolved"]

    candidate_payload: list[dict] = []
    if args.analysis_mode == "extended" or args.payload_level in {"L1.5", "L2", "L3"}:
        medium_candidates = [edge for edge in candidate_edges if edge.get("confidence") == "medium"]
        low_candidates = [edge for edge in candidate_edges if edge.get("confidence") == "low"]
        if args.payload_level == "L1.5":
            candidate_payload = medium_candidates[:8]
        elif args.payload_level == "L2":
            candidate_payload = [*medium_candidates[:20], *low_candidates[:5]]
        else:
            candidate_payload = candidate_edges
    candidate_payload = _annotate_candidates(candidate_payload)

    symbol_payload = _limit_edges(symbol_edges, args.payload_level, l15_limit=10, l2_limit=25)
    symbol_payload = _filter_symbol_relations(symbol_payload)
    context_payload = _limit_edges(context_edges, args.payload_level, l15_limit=12, l2_limit=30)
    blind_spots = list(
        dict.fromkeys([
            *code.get("blind_spots", []),
            *context.get("blind_spots", []),
            *symbol.get("blind_spots", []),
        ])
    )

    payload = {
        "schema_version": "4.2",
        "meta": {
            "target_file": anchor.get("repo_relative_path", anchor.get("file_path", "")),
            "repo_root": anchor.get("repo_root", ""),
            "stack_family": anchor.get("language", ""),
            "analysis_mode": args.analysis_mode,
            "payload_level": args.payload_level,
            "graph_scope": "anchor_local_confirmed_file_edges",
            "schema_mode": "layered",
            "scope_note": "This payload classifies dependency information around the current target file and contains no action recommendations.",
        },
        "claim_certainty": _build_claim_certainty(),
        "reading_guide": {
            "how_to_read": "Section order: hard_facts, supporting_signals, estimated_impact.",
            "confidence_rule": (
                "hard_facts and confirmed_dependencies are deterministic; supporting_signals, "
                "estimated_impact, change_impact, blind_spots, and unresolved_edges are non-deterministic."
            ),
            "evidence_rule": "Each relationship includes evidence_ref when direct evidence exists.",
            "action_rule": "This payload contains no action recommendations.",
            "legacy_compatibility": (
                "confirmed_dependencies, candidate_dependencies, dependency_cycles, and build_targets remain "
                "for backward compatibility; claim_certainty is the authoritative certainty map."
            ),
        },
        "interpretation_note": (
            "This payload classifies information about the current target file into deterministic "
            "facts and non-deterministic findings. It describes evidence state only."
        ),
        "anchor": anchor,
        "confirmed_dependencies": {
            "direct_outbound": direct_outbound,
            "direct_inbound": direct_inbound,
            "config_links": config_links,
        },
        "candidate_dependencies": candidate_payload,
        "unresolved_edges": unresolved,
        "blind_spots": blind_spots,
        "hard_facts": {
            "confirmed_file_edges": {
                "direct_outbound": direct_outbound,
                "direct_inbound": direct_inbound,
            },
            "confirmed_config_links": config_links,
            "confirmed_build_targets": [],
            "confirmed_dependency_cycles": [],
        },
        "supporting_signals": {
            "symbol_relations": symbol_payload,
            "context_mentions": context_payload,
            "candidate_file_edges": candidate_payload,
            "candidate_build_targets": [],
            "blind_spots": blind_spots,
        },
        "estimated_impact": _build_estimated_impact(None),
        "relation_summary": {
            "confirmed_count": len(confirmed_edges),
            "candidate_count": len(candidate_edges),
            "outbound_count": len(direct_outbound),
            "inbound_count": len(direct_inbound),
            "config_link_count": len(config_links),
            "unresolved_count": len(unresolved),
            "symbol_relation_count": len(symbol_edges),
            "context_mention_count": len(context_edges),
            "build_target_count": 0,
            "direct_impact_count": 0,
            "transitive_impact_count": 0,
        },
        "budget_meta": {
            "token_estimate": 0,
            "max_token_estimate": args.max_token_estimate,
            "truncated": False,
            "next_level_available": args.payload_level != "L3",
            "budget_note": "Additional detail exists in L2/L3 or deep-index payloads beyond this window.",
        },
    }

    payload["pipeline_status"] = {}
    payload["pipeline_status_details"] = {}

    runner.register_fallback(
        "cycle_detection",
        lambda: [],
        reason="empty-cycle-set",
    )
    runner.register_fallback(
        "impact_estimation",
        lambda: _fallback_change_impact(anchor, confirmed_edges),
        reason="direct-consumer-only-impact",
    )
    runner.register_fallback(
        "build_integration",
        lambda: _fallback_build_targets(anchor, config_links),
        reason="context-derived-build-targets",
    )

    if not args.no_cycle_detection:
        cycle_result = runner.run(
            "cycle_detection",
            lambda: (
                _maybe_force_stage_failure("cycle_detection", forced_failures),
                detect_dependency_cycles(confirmed_edges, max_cycle_length=20),
            )[1],
            stage_name="Cycle Detection",
        )
        payload["pipeline_status_details"]["cycle_detection"] = {
            "status": cycle_result.status.value,
            "attempts": cycle_result.attempts,
            "duration_ms": cycle_result.duration_ms,
            "degraded_from": cycle_result.degraded_from,
            "error": cycle_result.error,
        }
        if cycle_result.status == StageStatus.SUCCESS:
            payload["dependency_cycles"] = cycle_result.data
            payload["hard_facts"]["confirmed_dependency_cycles"] = cycle_result.data
            payload["pipeline_status"]["cycle_detection"] = "success"
        elif cycle_result.status == StageStatus.DEGRADED:
            payload["dependency_cycles"] = cycle_result.data
            payload["hard_facts"]["confirmed_dependency_cycles"] = cycle_result.data
            payload["pipeline_status"]["cycle_detection"] = "degraded"
        else:
            payload["dependency_cycles"] = []
            payload["hard_facts"]["confirmed_dependency_cycles"] = []
            payload["pipeline_status"]["cycle_detection"] = "failed"

    if not args.no_impact_estimation:
        impact_result = runner.run(
            "impact_estimation",
            lambda: estimate_change_impact(
                anchor,
                (_maybe_force_stage_failure("impact_estimation", forced_failures), confirmed_edges)[1],
                depth_limit=args.impact_depth,
                max_results=50,
            ),
            stage_name="Change Impact Estimation",
        )
        payload["pipeline_status_details"]["impact_estimation"] = {
            "status": impact_result.status.value,
            "attempts": impact_result.attempts,
            "duration_ms": impact_result.duration_ms,
            "degraded_from": impact_result.degraded_from,
            "error": impact_result.error,
        }
        if impact_result.status in (StageStatus.SUCCESS, StageStatus.DEGRADED):
            payload["change_impact"] = impact_result.data
            payload["estimated_impact"] = _build_estimated_impact(impact_result.data)
            payload["relation_summary"]["direct_impact_count"] = len(
                payload["estimated_impact"].get("direct_confirmed_impact", [])
            )
            payload["relation_summary"]["transitive_impact_count"] = len(
                payload["estimated_impact"].get("transitive_estimated_impact", [])
            )
            payload["pipeline_status"]["impact_estimation"] = (
                "success" if impact_result.status == StageStatus.SUCCESS else "degraded"
            )
        else:
            payload["change_impact"] = {"error": impact_result.error}
            payload["estimated_impact"] = _build_estimated_impact(payload["change_impact"])
            payload["pipeline_status"]["impact_estimation"] = "failed"

    if not args.no_build_integration:
        file_path = normalize_path(anchor.get("file_path", ""))
        repo_root = normalize_path(anchor.get("repo_root", ""))
        build_result = runner.run(
            "build_integration",
            lambda: (
                _maybe_force_stage_failure("build_integration", forced_failures),
                trace_file_to_build_targets(file_path, repo_root),
            )[1],
            stage_name="Build System Integration",
        )
        payload["pipeline_status_details"]["build_integration"] = {
            "status": build_result.status.value,
            "attempts": build_result.attempts,
            "duration_ms": build_result.duration_ms,
            "degraded_from": build_result.degraded_from,
            "error": build_result.error,
        }
        if build_result.status in (StageStatus.SUCCESS, StageStatus.DEGRADED):
            payload["build_targets"] = build_result.data
            confirmed_build_targets, candidate_build_targets = _partition_build_targets(build_result.data)
            payload["hard_facts"]["confirmed_build_targets"] = confirmed_build_targets
            payload["supporting_signals"]["candidate_build_targets"] = candidate_build_targets
            payload["relation_summary"]["build_target_count"] = len(build_result.data)
            payload["pipeline_status"]["build_integration"] = (
                "success" if build_result.status == StageStatus.SUCCESS else "degraded"
            )
        else:
            payload["build_targets"] = []
            payload["hard_facts"]["confirmed_build_targets"] = []
            payload["supporting_signals"]["candidate_build_targets"] = []
            payload["pipeline_status"]["build_integration"] = "failed"

    pipeline_statuses = list(payload.get("pipeline_status", {}).values())
    if all(status == "success" for status in pipeline_statuses):
        payload["pipeline_status"]["overall"] = "success"
    elif any(status == "failed" for status in pipeline_statuses):
        payload["pipeline_status"]["overall"] = "partial"
    else:
        payload["pipeline_status"]["overall"] = "degraded"

    max_tokens = payload.get("budget_meta", {}).get("max_token_estimate", 3000)
    compact_payload = _build_minimal_payload(payload)
    if _count_tokens(compact_payload) > max_tokens:
        payload["budget_meta"]["token_estimate"] = _count_tokens(payload)
        _apply_budget_trimming(payload)
        compact_payload = _build_minimal_payload(payload)

    write_json(compact_payload, args.output)


if __name__ == "__main__":
    main()
