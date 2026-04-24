# Output Shape v4.3

Use this minimized shape for the final payload.

Goals:

- Keep only task-relevant information.
- Omit duplicate mirrors and narrative guidance.
- Omit empty sections.
- Preserve deterministic facts, non-deterministic findings, impact data, and pipeline status.

Top-level structure:

1. `schema_version`
2. `target`
3. `hard_facts`
4. `supporting_signals` when present
5. `estimated_impact` when present
6. `pipeline_status`

Recommended payload:

```json
{
  "schema_version": "4.3",
  "target": {
    "file": "",
    "repo_root": "",
    "stack_family": "",
    "analysis_mode": "strict|extended",
    "payload_level": "L1|L1.5|L2|L3",
    "graph_scope": "anchor_local_confirmed_file_edges"
  },
  "hard_facts": {
    "file_edges": {
      "outbound": [],
      "inbound": []
    },
    "config_links": [],
    "build_targets": [],
    "dependency_cycles": []
  },
  "supporting_signals": {
    "candidate_file_edges": [],
    "candidate_build_targets": [],
    "symbol_relations": [],
    "context_mentions": [],
    "unresolved_edges": [],
    "blind_spots": []
  },
  "estimated_impact": {
    "graph_scope": "repo_code_graph_plus_confirmed_context",
    "expansion_status": "repo_scan_success",
    "summary": {
      "total_impacted": 0,
      "direct_consumers": 0,
      "indirect_consumers": 0,
      "max_depth_reached": 0,
      "depth_limit": 3
    },
    "direct_impact": [],
    "transitive_impact": [],
    "high_risk_consumers": [],
    "all_impacted": [],
    "impact_confidence": "high|mixed|unknown|failed",
    "limitations": []
  },
  "pipeline_status": {
    "overall": "success",
    "stages": {
      "impact_estimation": "degraded"
    },
    "details": {
      "impact_estimation": {
        "status": "degraded",
        "attempts": 2,
        "duration_ms": 18.2,
        "degraded_from": "direct-consumer-only-impact",
        "error": "Forced failure"
      }
    }
  }
}
```

Notes:

- `hard_facts` is the deterministic section.
- `supporting_signals` is the non-deterministic section.
- `estimated_impact` is non-deterministic and may be omitted when empty.
- `pipeline_status.stages` and `pipeline_status.details` are only included when they add information beyond `overall`.
- Empty sections should be omitted rather than emitted as empty arrays or empty objects.
- Legacy mirrors such as `confirmed_dependencies`, `candidate_dependencies`, `change_impact`, `build_targets`, `relation_summary`, and `budget_meta` are intentionally removed from v4.3 output.

For staged codemodel delivery on top of this minimized payload, see
[context-packet-protocol.md](./context-packet-protocol.md).
