---
name: current-file-dependency-analysis
description: Analyze a single current file's dependency facts within the repository. Use when the task is to confirm what the current file directly depends on, what directly depends on it, which config or build wiring is directly connected, whether bounded impact analysis or dependency-cycle checks are needed, and where evidence is incomplete. Do not use for repository-wide architecture summaries, module responsibility explanations, file-layout planning, or governance workflows that are not anchored to one current file.
---

# Current File Dependency Analysis

## Responsibility

Produce a single-file dependency fact slice anchored to the current file.

- Default deliverable: minimized `schema_version: 4.3` output.
- Keep `hard_facts`, `supporting_signals`, and `estimated_impact` strictly separated.
- Stay out of module-semantic explanation, file-boundary planning, and repository-wide architecture narrative.

## Default Workflow

### 1. Recover the anchor

- If the current file path is missing, stop and recover the anchor first.
- `scripts/resolve_anchor.py`: normalize editor context into the current-file anchor.
- `scripts/detect_stack.py`: detect the dominant stack only when the stack family is unclear.

### 2. Collect repository evidence

- `scripts/collect_code_edges.py`: collect import-style file edges.
- `scripts/collect_symbol_edges.py`: collect symbol-level relations that support or refine file edges.
- `scripts/collect_context_edges.py`: collect config, build, generated, and test links tied to the anchor.
- Prefer repository evidence over inference. Dynamic, unresolved, or weak matches stay out of confirmed facts.

### 3. Assemble the minimized slice

- `scripts/build_slice.py`: assemble the minimized `schema_version: 4.3` slice.
- Preserve the core output shape and section names.
- Put only confirmed file edges, config links, build targets, and dependency cycles in `hard_facts`.
- Put candidates, unresolved edges, symbol hints, context mentions, and blind spots in `supporting_signals`.
- Keep `estimated_impact` bounded and explicitly non-deterministic.

### 4. Verify the claims

- `scripts/verify_claims.py`: verify schema shape and evidence coverage for the minimized slice.
- Treat missing or downgraded evidence as a reason to narrow claims, not to widen interpretation.

## Enhancement Boundaries

- Config and build wiring belong in the main path only when there is direct repository evidence from the current file to the target.
- Dependency-cycle detection and impact estimation are bounded add-ons after edge collection. They may be empty or omitted when evidence is insufficient, but they must never be promoted into confirmed dependency facts.
- Downstream repackaging is outside the default stage-1 path. Ignore `scripts/build_context_packet.py`, `ctx-v1`, `--profile`, and `--auto-expand` unless a downstream consumer explicitly asks to repackage an already-built slice.

## Critical Rules

- Stay anchored to the current file throughout the workflow.
- Keep confirmed relationships separate from candidate signals and estimated impact.
- Treat unresolved or stack-specific blind spots as explicit limits, not hidden assumptions.
- Do not broaden into module-role explanation, file-layout planning, or whole-repository summarization.
- Omit empty sections only when the existing `schema_version: 4.3` contract allows it.

## Output Contract

Done means:

- The current file's confirmed inbound and outbound file edges are described.
- Direct config/build links are included only when evidence is strong enough to confirm them.
- Candidate relationships remain isolated in `supporting_signals`.
- `estimated_impact` remains an estimate, not a restatement of dependency facts.
- The payload remains compatible with [output-shape.md](./references/output-shape.md).

### Core Shape

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
    "summary": {
      "total_impacted": 0,
      "direct_consumers": 0,
      "indirect_consumers": 0
    },
    "direct_impact": [],
    "transitive_impact": []
  },
  "pipeline_status": {
    "overall": "success"
  }
}
```

## References

- [output-shape.md](./references/output-shape.md): authoritative `schema_version: 4.3` slice shape.
- [ts-edge-rules.md](./references/ts-edge-rules.md): TypeScript and JavaScript edge rules.
- [py-edge-rules.md](./references/py-edge-rules.md): Python edge rules.
- [go-edge-rules.md](./references/go-edge-rules.md): Go edge rules.
- [blind-spot-policy.md](./references/blind-spot-policy.md): blind-spot labels and downgrade rules.

Read [context-packet-protocol.md](./references/context-packet-protocol.md) only when a downstream consumer explicitly requests packetized repackaging of an already-built slice.
