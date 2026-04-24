from __future__ import annotations

from typing import Any


def sorted_unique(values: list[str]) -> list[str]:
    return sorted(dict.fromkeys(value for value in values if value))


def edge_targets(edges: list[dict[str, Any]], field: str) -> list[str]:
    return sorted_unique([edge.get(field, "") for edge in edges if edge.get(field)])


def slice_hard_facts(slice_data: dict[str, Any]) -> dict[str, Any]:
    return slice_data.get("hard_facts", {})


def slice_supporting_signals(slice_data: dict[str, Any]) -> dict[str, Any]:
    return slice_data.get("supporting_signals", {})


def slice_target_file(slice_data: dict[str, Any]) -> str:
    return (
        slice_data.get("target", {}).get("file")
        or slice_data.get("meta", {}).get("target_file")
        or ""
    )


def slice_file_edges(slice_data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    file_edges = slice_hard_facts(slice_data).get("file_edges", {})
    outbound = file_edges.get("outbound")
    inbound = file_edges.get("inbound")
    if outbound is not None or inbound is not None:
        return outbound or [], inbound or []

    confirmed = slice_data.get("confirmed_dependencies", {})
    return confirmed.get("direct_outbound", []), confirmed.get("direct_inbound", [])


def slice_config_links(slice_data: dict[str, Any]) -> list[dict[str, Any]]:
    hard_links = slice_hard_facts(slice_data).get("config_links")
    if hard_links is not None:
        return hard_links

    confirmed = slice_data.get("confirmed_dependencies", {})
    return confirmed.get("config_links", [])


def slice_candidate_edges(slice_data: dict[str, Any]) -> list[dict[str, Any]]:
    candidate = slice_supporting_signals(slice_data).get("candidate_file_edges")
    if candidate is not None:
        return candidate

    return slice_data.get("candidate_dependencies", [])


def slice_build_targets(slice_data: dict[str, Any]) -> list[dict[str, Any]]:
    hard_targets = slice_hard_facts(slice_data).get("build_targets")
    candidate_targets = slice_supporting_signals(slice_data).get("candidate_build_targets")
    if hard_targets is not None or candidate_targets is not None:
        return [*(hard_targets or []), *(candidate_targets or [])]

    return slice_data.get("build_targets", [])


def slice_cycles(slice_data: dict[str, Any]) -> list[dict[str, Any]]:
    cycles = slice_hard_facts(slice_data).get("dependency_cycles")
    if cycles is not None:
        return cycles

    return slice_data.get("dependency_cycles", [])


def slice_estimated_impact(slice_data: dict[str, Any]) -> dict[str, Any]:
    impact = slice_data.get("estimated_impact")
    if impact is not None:
        return impact

    return slice_data.get("change_impact", {})


def slice_direct_impact(slice_data: dict[str, Any]) -> list[dict[str, Any]]:
    impact = slice_estimated_impact(slice_data)
    return impact.get("direct_impact", impact.get("direct_confirmed_impact", []))


def slice_transitive_impact(slice_data: dict[str, Any]) -> list[dict[str, Any]]:
    impact = slice_estimated_impact(slice_data)
    return impact.get("transitive_impact", impact.get("transitive_estimated_impact", []))


def slice_impact_summary(slice_data: dict[str, Any]) -> dict[str, Any]:
    impact = slice_estimated_impact(slice_data)
    summary = impact.get("summary")
    if summary is not None:
        return summary

    return impact.get("impact_summary", {})


def slice_impact_files(slice_data: dict[str, Any]) -> list[str]:
    impact = slice_estimated_impact(slice_data)
    all_impacted = impact.get("all_impacted", [])
    if all_impacted:
        return edge_targets(all_impacted, "file")

    return edge_targets(
        [
            *slice_direct_impact(slice_data),
            *slice_transitive_impact(slice_data),
        ],
        "file",
    )


def slice_pipeline_status(slice_data: dict[str, Any]) -> dict[str, Any]:
    return slice_data.get("pipeline_status", {})


def slice_pipeline_stages(slice_data: dict[str, Any]) -> dict[str, Any]:
    return slice_pipeline_status(slice_data).get("stages", {})


def slice_pipeline_details(slice_data: dict[str, Any]) -> dict[str, Any]:
    return slice_pipeline_status(slice_data).get("details", {})


def slice_relation_summary(slice_data: dict[str, Any]) -> dict[str, int]:
    legacy = slice_data.get("relation_summary")
    if legacy:
        return legacy

    outbound, inbound = slice_file_edges(slice_data)
    return {
        "outbound_count": len(outbound),
        "inbound_count": len(inbound),
        "config_link_count": len(slice_config_links(slice_data)),
        "build_target_count": len(slice_build_targets(slice_data)),
        "cycle_count": len(slice_cycles(slice_data)),
    }
