from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from common import read_json, safe_read_text


SECTION_NAMES = [
    "direct_outbound_details",
    "direct_inbound_details",
    "config_link_details",
    "build_target_details",
    "dependency_cycle_details",
    "impact_estimate",
    "non_deterministic_signals",
]

CONSUMER_PROFILE_PRIORITY = {
    "safe-default": [
        "direct_inbound_details",
        "direct_outbound_details",
        "config_link_details",
        "build_target_details",
        "dependency_cycle_details",
    ],
    "bugfix": [
        "direct_inbound_details",
        "config_link_details",
    ],
    "feature": [
        "direct_outbound_details",
        "direct_inbound_details",
        "impact_estimate",
    ],
    "review": [
        "impact_estimate",
        "non_deterministic_signals",
    ],
}

PROFILE_SECTION_LIMITS = {
    "safe-default": 2,
    "bugfix": 2,
    "feature": 3,
    "review": 2,
}


def _sort_paths(paths: list[str]) -> list[str]:
    return sorted(path for path in paths if path)


def _list_packet(items: list, limit: int, *, selection_rule: str, transform=lambda item: item) -> dict:
    total = len(items)
    returned = min(total, limit)
    packet = {
        "total": total,
        "returned": returned,
        "truncated": returned < total,
        "items": [transform(item) for item in items[:returned]],
    }
    if returned < total:
        packet["selection_rule"] = selection_rule
    return packet


def _build_target_label(target: dict) -> str:
    system = target.get("system", "")
    if target.get("target"):
        return f"{system}:{target['target']}"
    if target.get("script"):
        return f"{system}:{target['script']}"
    if target.get("package"):
        return f"{system}:{target['package']}"
    return system


def _cycle_item(cycle: dict) -> dict:
    return {
        "members": cycle.get("cycle", []),
        "length": cycle.get("length", 0),
        "severity": cycle.get("severity", ""),
    }


def _analysis_exceptions(pipeline_status: dict) -> dict | None:
    exceptions = {}
    if pipeline_status.get("stages"):
        exceptions["stages"] = pipeline_status.get("stages", {})
    if pipeline_status.get("details"):
        exceptions["details"] = pipeline_status.get("details", {})
    return exceptions or None


def _profile_expansions(
    available_expansions: list[str],
    *,
    profile: str,
) -> tuple[list[str], list[str]]:
    priorities = CONSUMER_PROFILE_PRIORITY.get(profile, CONSUMER_PROFILE_PRIORITY["safe-default"])
    limit = PROFILE_SECTION_LIMITS.get(profile, PROFILE_SECTION_LIMITS["safe-default"])
    recommended = [
        section for section in priorities
        if section in available_expansions
    ][:limit]
    deferred = [
        section for section in available_expansions
        if section not in recommended
    ]
    return recommended, deferred


def _request_templates(
    sections: list[str],
    *,
    profile: str,
) -> list[dict]:
    return [
        {
            "packet_kind": "section_detail",
            "section": section,
            "profile": profile,
        }
        for section in sections
    ]


def _evidence_collections(slice_data: dict) -> list[tuple[str, str, list[dict]]]:
    hard_facts = slice_data.get("hard_facts", {})
    supporting = slice_data.get("supporting_signals", {})
    file_edges = hard_facts.get("file_edges", {})
    return [
        ("direct_outbound_details", "deterministic", file_edges.get("outbound", [])),
        ("direct_inbound_details", "deterministic", file_edges.get("inbound", [])),
        ("config_link_details", "deterministic", hard_facts.get("config_links", [])),
        ("build_target_details", "deterministic", hard_facts.get("build_targets", [])),
        ("non_deterministic_signals", "non_deterministic", supporting.get("candidate_file_edges", [])),
        ("non_deterministic_signals", "non_deterministic", supporting.get("candidate_build_targets", [])),
        ("non_deterministic_signals", "non_deterministic", supporting.get("symbol_relations", [])),
        ("non_deterministic_signals", "non_deterministic", supporting.get("context_mentions", [])),
        ("non_deterministic_signals", "non_deterministic", supporting.get("unresolved_edges", [])),
    ]


def _collect_evidence_entries(slice_data: dict) -> list[dict]:
    entries: list[dict] = []
    for section, certainty, items in _evidence_collections(slice_data):
        for item in items:
            evidence_ref = item.get("evidence_ref", "")
            if not evidence_ref:
                continue
            entries.append({
                "evidence_ref": evidence_ref,
                "section": section,
                "certainty": certainty,
                "item": item,
            })
    return entries


def _parse_evidence_ref(evidence_ref: str) -> tuple[str, int | None]:
    if ":" not in evidence_ref:
        return evidence_ref, None
    file_part, line_part = evidence_ref.rsplit(":", 1)
    try:
        return file_part, int(line_part)
    except ValueError:
        return evidence_ref, None


def _read_evidence_snippet(slice_data: dict, evidence_ref: str) -> dict | None:
    target = slice_data.get("target", {})
    repo_root = target.get("repo_root", "")
    if not repo_root:
        return None

    file_part, line_number = _parse_evidence_ref(evidence_ref)
    if line_number is None:
        return None

    file_path = Path(repo_root) / Path(file_part)
    if not file_path.exists():
        return None

    lines = safe_read_text(file_path).splitlines()
    if line_number < 1 or line_number > len(lines):
        return None

    return {
        "file": file_part,
        "line": line_number,
        "text": lines[line_number - 1],
    }


def _packet_target(slice_data: dict) -> dict:
    target = slice_data.get("target", {})
    pipeline_status = slice_data.get("pipeline_status", {})
    packet_target = {
        "file": target.get("file", ""),
        "stack_family": target.get("stack_family", ""),
        "analysis_state": pipeline_status.get("overall", "unknown"),
    }
    analysis_exceptions = _analysis_exceptions(pipeline_status)
    if analysis_exceptions:
        packet_target["analysis_exceptions"] = analysis_exceptions
    return packet_target


def _sort_edges(edges: list[dict]) -> list[dict]:
    return sorted(
        edges,
        key=lambda edge: (
            edge.get("from", ""),
            edge.get("to", ""),
            edge.get("edge_kind", ""),
            edge.get("evidence_ref", ""),
        ),
    )


def _sort_build_targets(targets: list[dict]) -> list[dict]:
    return sorted(
        targets,
        key=lambda target: (
            target.get("system", ""),
            target.get("target", ""),
            target.get("script", ""),
            target.get("package", ""),
            target.get("matched_dependency", ""),
        ),
    )


def _drop_empty_sections(payload: dict) -> dict:
    compact: dict = {}
    for key, value in payload.items():
        if value in (None, [], {}, ""):
            continue
        compact[key] = value
    return compact


def _list_detail_packet(
    slice_data: dict,
    *,
    section: str,
    certainty: str,
    items: list,
    selection_rule: str,
    transform=lambda item: item,
) -> dict:
    return {
        "protocol_version": "ctx-v1",
        "packet_kind": "section_detail",
        "section": section,
        "target": _packet_target(slice_data),
        "available": bool(items),
        "certainty": certainty,
        "content_type": "list",
        "summary": _list_packet(items, len(items), selection_rule=selection_rule, transform=transform),
    }


def _object_detail_packet(
    slice_data: dict,
    *,
    section: str,
    certainty: str,
    payload: dict,
) -> dict:
    compact_payload = _drop_empty_sections(payload)
    return {
        "protocol_version": "ctx-v1",
        "packet_kind": "section_detail",
        "section": section,
        "target": _packet_target(slice_data),
        "available": bool(compact_payload),
        "certainty": certainty,
        "content_type": "object",
        "payload": compact_payload,
    }


def _available_expansions(slice_data: dict) -> list[str]:
    hard_facts = slice_data.get("hard_facts", {})
    supporting = slice_data.get("supporting_signals", {})
    estimated = slice_data.get("estimated_impact", {})

    expansions: list[str] = []
    if hard_facts.get("file_edges", {}).get("outbound"):
        expansions.append("direct_outbound_details")
    if hard_facts.get("file_edges", {}).get("inbound"):
        expansions.append("direct_inbound_details")
    if hard_facts.get("config_links"):
        expansions.append("config_link_details")
    if hard_facts.get("build_targets") or supporting.get("candidate_build_targets"):
        expansions.append("build_target_details")
    if hard_facts.get("dependency_cycles"):
        expansions.append("dependency_cycle_details")
    if estimated:
        expansions.append("impact_estimate")
    if supporting:
        expansions.append("non_deterministic_signals")
    if _collect_evidence_entries(slice_data):
        expansions.append("evidence_lookup")
    return expansions


def build_first_batch_packet(
    slice_data: dict,
    *,
    profile: str,
    outbound_limit: int,
    inbound_limit: int,
    config_limit: int,
    build_limit: int,
    cycle_limit: int,
) -> dict:
    target = slice_data.get("target", {})
    hard_facts = slice_data.get("hard_facts", {})
    file_edges = hard_facts.get("file_edges", {})

    outbound_items = _sort_paths([edge.get("to", "") for edge in file_edges.get("outbound", [])])
    inbound_items = _sort_paths([edge.get("from", "") for edge in file_edges.get("inbound", [])])
    config_items = _sort_paths([edge.get("from", "") for edge in hard_facts.get("config_links", [])])
    build_items = sorted(
        (_build_target_label(target) for target in hard_facts.get("build_targets", [])),
        key=str,
    )
    cycle_items = list(hard_facts.get("dependency_cycles", []))
    available_expansions = _available_expansions(slice_data)
    recommended_expansions, deferred_expansions = _profile_expansions(
        available_expansions,
        profile=profile,
    )

    packet = {
        "protocol_version": "ctx-v1",
        "packet_kind": "first_batch",
        "consumer_profile": profile,
        "target": _packet_target(slice_data),
        "deterministic_summary": {
            "direct_outbound": _list_packet(
                outbound_items,
                outbound_limit,
                selection_rule="lexical_path_order",
            ),
            "direct_inbound": _list_packet(
                inbound_items,
                inbound_limit,
                selection_rule="lexical_path_order",
            ),
            "config_links": _list_packet(
                config_items,
                config_limit,
                selection_rule="lexical_path_order",
            ),
            "build_targets": _list_packet(
                build_items,
                build_limit,
                selection_rule="lexical_identifier_order",
            ),
            "dependency_cycles": _list_packet(
                cycle_items,
                cycle_limit,
                selection_rule="severity_then_length_then_source_order",
                transform=_cycle_item,
            ),
        },
        "omitted_non_deterministic_sections": [
            "supporting_signals",
            "estimated_impact",
        ],
        "available_expansions": available_expansions,
        "recommended_expansions": recommended_expansions,
        "deferred_expansions": deferred_expansions,
        "request_templates": _request_templates(recommended_expansions, profile=profile),
    }

    return packet


def build_section_detail_packet(
    slice_data: dict,
    *,
    profile: str,
    section: str,
) -> dict:
    hard_facts = slice_data.get("hard_facts", {})
    supporting = slice_data.get("supporting_signals", {})
    file_edges = hard_facts.get("file_edges", {})

    if section == "direct_outbound_details":
        packet = _list_detail_packet(
            slice_data,
            section=section,
            certainty="deterministic",
            items=_sort_edges(file_edges.get("outbound", [])),
            selection_rule="source_then_target_then_evidence_order",
        )
        packet["consumer_profile"] = profile
        return packet
    if section == "direct_inbound_details":
        packet = _list_detail_packet(
            slice_data,
            section=section,
            certainty="deterministic",
            items=_sort_edges(file_edges.get("inbound", [])),
            selection_rule="source_then_target_then_evidence_order",
        )
        packet["consumer_profile"] = profile
        return packet
    if section == "config_link_details":
        packet = _list_detail_packet(
            slice_data,
            section=section,
            certainty="deterministic",
            items=_sort_edges(hard_facts.get("config_links", [])),
            selection_rule="source_then_target_then_evidence_order",
        )
        packet["consumer_profile"] = profile
        return packet
    if section == "build_target_details":
        deterministic_targets = _sort_build_targets(hard_facts.get("build_targets", []))
        candidate_targets = _sort_build_targets(supporting.get("candidate_build_targets", []))
        packet = _object_detail_packet(
            slice_data,
            section=section,
            certainty="mixed",
            payload={
                "deterministic": _list_packet(
                    deterministic_targets,
                    len(deterministic_targets),
                    selection_rule="system_then_identifier_order",
                ),
                "non_deterministic": _list_packet(
                    candidate_targets,
                    len(candidate_targets),
                    selection_rule="system_then_identifier_order",
                ),
            },
        )
        packet["consumer_profile"] = profile
        return packet
    if section == "dependency_cycle_details":
        packet = _list_detail_packet(
            slice_data,
            section=section,
            certainty="deterministic",
            items=hard_facts.get("dependency_cycles", []),
            selection_rule="severity_then_length_then_source_order",
        )
        packet["consumer_profile"] = profile
        return packet
    if section == "impact_estimate":
        packet = _object_detail_packet(
            slice_data,
            section=section,
            certainty="non_deterministic",
            payload=slice_data.get("estimated_impact", {}),
        )
        packet["consumer_profile"] = profile
        return packet
    if section == "non_deterministic_signals":
        packet = _object_detail_packet(
            slice_data,
            section=section,
            certainty="non_deterministic",
            payload={
                "candidate_file_edges": supporting.get("candidate_file_edges", []),
                "candidate_build_targets": supporting.get("candidate_build_targets", []),
                "symbol_relations": supporting.get("symbol_relations", []),
                "context_mentions": supporting.get("context_mentions", []),
                "unresolved_edges": supporting.get("unresolved_edges", []),
                "blind_spots": supporting.get("blind_spots", []),
            },
        )
        packet["consumer_profile"] = profile
        return packet

    raise SystemExit(f"Unsupported section: {section}")


def build_evidence_lookup_packet(
    slice_data: dict,
    *,
    profile: str,
    evidence_refs: list[str],
) -> dict:
    evidence_index = {
        entry["evidence_ref"]: entry
        for entry in _collect_evidence_entries(slice_data)
    }
    found = []
    missing = []
    for evidence_ref in evidence_refs:
        entry = evidence_index.get(evidence_ref)
        if entry is None:
            missing.append(evidence_ref)
            continue
        found.append({
            "evidence_ref": evidence_ref,
            "section": entry["section"],
            "certainty": entry["certainty"],
            "item": entry["item"],
            "snippet": _read_evidence_snippet(slice_data, evidence_ref),
        })

    return {
        "protocol_version": "ctx-v1",
        "packet_kind": "evidence_lookup",
        "consumer_profile": profile,
        "target": _packet_target(slice_data),
        "lookup_mode": "exact_evidence_ref",
        "requested_refs": evidence_refs,
        "found": found,
        "missing": missing,
    }


def _collect_deterministic_evidence_refs(expanded_packets: list[dict]) -> list[str]:
    refs: list[str] = []
    seen: set[str] = set()
    for packet in expanded_packets:
        if packet.get("certainty") != "deterministic":
            continue
        for item in packet.get("summary", {}).get("items", []):
            evidence_ref = item.get("evidence_ref", "")
            if not evidence_ref or evidence_ref in seen:
                continue
            seen.add(evidence_ref)
            refs.append(evidence_ref)
    return refs


def build_auto_expand_bundle(
    slice_data: dict,
    *,
    profile: str,
    include_evidence_for_deterministic: bool,
    outbound_limit: int,
    inbound_limit: int,
    config_limit: int,
    build_limit: int,
    cycle_limit: int,
) -> dict:
    first_batch = build_first_batch_packet(
        slice_data,
        profile=profile,
        outbound_limit=outbound_limit,
        inbound_limit=inbound_limit,
        config_limit=config_limit,
        build_limit=build_limit,
        cycle_limit=cycle_limit,
    )
    expanded_sections = list(first_batch.get("recommended_expansions", []))
    expanded_packets = [
        build_section_detail_packet(
            slice_data,
            profile=profile,
            section=section,
        )
        for section in expanded_sections
    ]
    deterministic_evidence_refs = _collect_deterministic_evidence_refs(expanded_packets)
    return {
        **({
            "evidence_packets": build_evidence_lookup_packet(
                slice_data,
                profile=profile,
                evidence_refs=deterministic_evidence_refs,
            )
        } if include_evidence_for_deterministic and deterministic_evidence_refs else {}),
        "protocol_version": "ctx-v1",
        "packet_kind": "auto_expand_bundle",
        "consumer_profile": profile,
        "target": first_batch.get("target", {}),
        "first_batch": first_batch,
        "expanded_sections": expanded_sections,
        "expanded_packets": expanded_packets,
    }


def _write_packet(
    data: dict,
    output: str | Path | None,
    *,
    output_mode: str,
) -> None:
    if output_mode == "compact":
        payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    else:
        payload = json.dumps(data, indent=2, ensure_ascii=False)

    if output:
        Path(output).write_text(payload + os.linesep, encoding="utf-8")
        return
    print(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a codemodel-first context packet from a minimized dependency slice.")
    parser.add_argument("--slice", required=True, help="Path to minimized slice JSON.")
    parser.add_argument("--packet-kind", choices=["first_batch", "section_detail", "evidence_lookup"], default="first_batch")
    parser.add_argument("--section", choices=SECTION_NAMES)
    parser.add_argument("--evidence-ref", action="append", dest="evidence_refs")
    parser.add_argument(
        "--profile",
        choices=sorted(CONSUMER_PROFILE_PRIORITY.keys()),
        default="safe-default",
        help="Consumer profile used to choose recommended expansions for first-batch packets and to tag downstream packets.",
    )
    parser.add_argument(
        "--auto-expand",
        action="store_true",
        help="When used with first_batch, return an auto-expand bundle containing the first batch and profile-recommended detail packets.",
    )
    parser.add_argument(
        "--include-evidence-for-deterministic",
        action="store_true",
        help="When used with --auto-expand, include an evidence lookup packet for deterministic expanded sections.",
    )
    parser.add_argument("--outbound-limit", type=int, default=8)
    parser.add_argument("--inbound-limit", type=int, default=8)
    parser.add_argument("--config-limit", type=int, default=8)
    parser.add_argument("--build-limit", type=int, default=6)
    parser.add_argument("--cycle-limit", type=int, default=4)
    parser.add_argument(
        "--output-mode",
        choices=["pretty", "compact"],
        default="pretty",
        help="Serialization mode for the final packet. Use compact to reduce token usage when sending packets to codemodel.",
    )
    parser.add_argument("--output", help="Optional output JSON path.")
    args = parser.parse_args()

    slice_data = read_json(args.slice)
    if args.packet_kind == "first_batch":
        if args.auto_expand:
            packet = build_auto_expand_bundle(
                slice_data,
                profile=args.profile,
                include_evidence_for_deterministic=args.include_evidence_for_deterministic,
                outbound_limit=args.outbound_limit,
                inbound_limit=args.inbound_limit,
                config_limit=args.config_limit,
                build_limit=args.build_limit,
                cycle_limit=args.cycle_limit,
            )
        else:
            packet = build_first_batch_packet(
                slice_data,
                profile=args.profile,
                outbound_limit=args.outbound_limit,
                inbound_limit=args.inbound_limit,
                config_limit=args.config_limit,
                build_limit=args.build_limit,
                cycle_limit=args.cycle_limit,
            )
    elif args.packet_kind == "section_detail":
        if args.auto_expand:
            raise SystemExit("--auto-expand is only supported with --packet-kind=first_batch")
        if not args.section:
            raise SystemExit("--section is required when --packet-kind=section_detail")
        packet = build_section_detail_packet(
            slice_data,
            profile=args.profile,
            section=args.section,
        )
    elif args.packet_kind == "evidence_lookup":
        if args.auto_expand:
            raise SystemExit("--auto-expand is only supported with --packet-kind=first_batch")
        if not args.evidence_refs:
            raise SystemExit("--evidence-ref is required when --packet-kind=evidence_lookup")
        packet = build_evidence_lookup_packet(
            slice_data,
            profile=args.profile,
            evidence_refs=args.evidence_refs,
        )
    else:
        raise SystemExit(f"Unsupported packet kind: {args.packet_kind}")

    _write_packet(packet, args.output, output_mode=args.output_mode)


if __name__ == "__main__":
    main()
