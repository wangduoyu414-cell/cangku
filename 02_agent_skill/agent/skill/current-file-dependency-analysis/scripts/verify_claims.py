from __future__ import annotations

import argparse

from common import read_json, write_json


DEPRECATED_TOP_LEVEL_FIELDS = [
    "meta",
    "claim_certainty",
    "reading_guide",
    "interpretation_note",
    "confirmed_dependencies",
    "candidate_dependencies",
    "blind_spots",
    "unresolved_edges",
    "relation_summary",
    "budget_meta",
    "dependency_cycles",
    "change_impact",
    "build_targets",
    "pipeline_status_details",
]


def _collect_edges(dependency_slice: dict) -> list[dict]:
    hard_facts = dependency_slice.get("hard_facts", {})
    supporting = dependency_slice.get("supporting_signals", {})
    file_edges = hard_facts.get("file_edges", {})
    edges = [
        *file_edges.get("outbound", []),
        *file_edges.get("inbound", []),
        *hard_facts.get("config_links", []),
        *hard_facts.get("build_targets", []),
        *hard_facts.get("dependency_cycles", []),
        *supporting.get("candidate_file_edges", []),
        *supporting.get("candidate_build_targets", []),
        *supporting.get("context_mentions", []),
        *supporting.get("symbol_relations", []),
        *supporting.get("unresolved_edges", []),
    ]
    unique: dict[tuple, dict] = {}
    for edge in edges:
        key = (
            edge.get("edge_kind", ""),
            edge.get("from", ""),
            edge.get("to", ""),
            edge.get("evidence_ref", ""),
            edge.get("relation_type", ""),
            edge.get("symbol_from", ""),
            edge.get("symbol_to", ""),
            edge.get("target", ""),
            edge.get("script", ""),
            edge.get("system", ""),
        )
        unique[key] = edge
    return list(unique.values())


def _has_evidence_requirement(edge: dict) -> bool:
    if edge.get("edge_kind") == "symbol":
        return True
    if "from" in edge or "to" in edge:
        return True
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify evidence coverage for a minimized dependency slice.")
    parser.add_argument("--slice", required=True, help="Path to dependency slice JSON.")
    parser.add_argument("--output", help="Optional output JSON path.")
    args = parser.parse_args()

    dependency_slice = read_json(args.slice)
    required_sections = [
        "schema_version",
        "target",
        "pipeline_status",
    ]
    missing_sections = [section for section in required_sections if section not in dependency_slice]

    edges = _collect_edges(dependency_slice)
    missing_evidence = [
        edge for edge in edges
        if _has_evidence_requirement(edge) and not edge.get("evidence_ref") and not edge.get("description")
    ]
    low_confidence_claims = [edge for edge in edges if edge.get("confidence") == "low"]
    deprecated_fields_present = [
        field for field in DEPRECATED_TOP_LEVEL_FIELDS
        if field in dependency_slice
    ]

    if missing_sections or missing_evidence:
        shape_status = "fail"
    elif deprecated_fields_present:
        shape_status = "partial"
    else:
        shape_status = "pass"

    payload = {
        "status": shape_status,
        "shape_status": shape_status,
        "verification_scope": "minimized_schema_and_evidence_coverage_only",
        "capability_status": "unknown",
        "capability_notes": [
            "This verifier checks the minimized schema shape and evidence coverage only.",
            "Use dedicated evals to measure recall, symbol retention, build/config promotion, and impact quality.",
        ],
        "missing_sections": missing_sections,
        "deprecated_fields_present": deprecated_fields_present,
        "missing_evidence": missing_evidence,
        "low_confidence_claims": low_confidence_claims,
    }
    write_json(payload, args.output)


if __name__ == "__main__":
    main()
