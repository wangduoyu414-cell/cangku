# Context Packet Protocol v1

This document defines how codemodel or other downstream consumers should use
`ctx-v1` packets produced by `scripts/build_context_packet.py`.

## Goals

- Minimize first-batch token usage.
- Keep deterministic facts separate from non-deterministic findings.
- Prevent omitted sections from being misread as negative evidence.
- Allow evidence lookup only when a decision depends on a specific claim.

## Packet Types

`ctx-v1` currently supports three packet types:

1. `first_batch`
2. `section_detail`
3. `evidence_lookup`

`build_context_packet.py` also supports consumer profiles through `--profile`:

- `safe-default`
- `bugfix`
- `feature`
- `review`

It also supports `--auto-expand` for `first_batch`, which returns the first
batch plus the profile-recommended second-stage detail packets in one bundle.
`--include-evidence-for-deterministic` can be added on top of `--auto-expand`
to include evidence lookup results for deterministic expanded sections.
`--output-mode compact|pretty` controls serialization format for packet delivery.

## Consumer Rules

### Rule 1: Treat `first_batch` as the routing layer only

`first_batch` is a deterministic summary packet. It is not a complete dependency
report and does not include non-deterministic findings.

Use it to answer:

- What file is under analysis?
- Is the analysis state `success`, `degraded`, or `partial`?
- What deterministic sections are present?
- Which sections are worth expanding next?

Do not use `first_batch` alone to conclude:

- there are no non-deterministic findings
- there is no estimated impact
- there is no evidence for a claim

### Rule 2: Use `total`, `returned`, and `truncated` together

For every list summary in `first_batch`:

- `total` means the total items available in that section
- `returned` means the number of items included in this packet
- `truncated=true` means this packet contains only a subset

Absence of a list item from a truncated summary is not evidence of absence.

### Rule 3: Only deterministic sections belong in first-batch decisions

In `first_batch`, `deterministic_summary` is the safe basis for early routing.
Do not mix in assumptions from unexpanded non-deterministic sections.

### Rule 4: Expand by section, not by guesswork

Use `available_expansions` to decide what second-stage detail packet to request.
Only request a section that is explicitly listed.

If a profile is used, prefer `recommended_expansions` over raw `available_expansions`.
`deferred_expansions` remains available but is lower priority for the selected profile.

Current second-stage sections:

- `direct_outbound_details`
- `direct_inbound_details`
- `config_link_details`
- `build_target_details`
- `dependency_cycle_details`
- `impact_estimate`
- `non_deterministic_signals`

### Rule 5: Respect section certainty

Every `section_detail` packet carries a `certainty` field:

- `deterministic`
- `non_deterministic`
- `mixed`

Interpretation:

- `deterministic`: can be treated as fact unless evidence lookup contradicts it
- `non_deterministic`: can guide follow-up inspection, not final factual claims
- `mixed`: contains both deterministic and non-deterministic subparts

### Rule 5.5: Treat profile recommendations as routing defaults, not proofs

Profiles choose expansion order. They do not change certainty.

- `recommended_expansions` means "expand these first for this profile"
- `request_templates` gives ready-to-send second-stage requests
- `deferred_expansions` means "still available, but lower priority"

Not being recommended first does not mean a section is irrelevant.

### Rule 5.6: Use `--auto-expand` only when a second round-trip is more expensive than a larger first response

`--auto-expand` is a convenience mode. It trades a larger first response for
fewer consumer-side requests.

Use it when:

- latency matters more than first-batch size
- the consumer would almost always request the recommended sections anyway
- the consumer usually verifies deterministic relations immediately after expansion

### Rule 5.7: Prefer `--output-mode compact` for machine delivery

Use `pretty` when humans need to inspect the payload directly.
Use `compact` when the packet is being sent to a model or another machine consumer
and human readability is not needed.

Do not use it when:

- first-batch token minimization is the priority
- the consumer wants to inspect the summary before deciding what to expand

### Rule 6: Use `evidence_lookup` before relying on a critical claim

When a code change, review judgment, or explanation depends on one specific
relationship, use `evidence_lookup` with its `evidence_ref`.

`evidence_lookup` returns:

- the matched section
- certainty classification
- the original item
- a line-level snippet when available

If `missing` is non-empty, do not claim the evidence was verified.

### Rule 7: `analysis_state` gates confidence

Read `target.analysis_state` in every packet:

- `success`: normal confidence for deterministic sections
- `degraded`: deterministic sections may still be usable, but omitted sections or
  fallback-derived sections should be treated more carefully
- `partial`: do not assume full coverage

If `analysis_exceptions` is present, prefer targeted expansion or evidence lookup
before taking a high-confidence action.

## Recommended Consumption Flow

### Safe default flow

1. Request `first_batch`
2. Read `target.analysis_state`
3. Read `deterministic_summary`
4. Prefer `recommended_expansions`; fall back to `available_expansions` if no profile was supplied
5. Request `section_detail` only for those sections
6. Request `evidence_lookup` only when a specific claim must be verified

### Bug-fix flow

Start with:

- `first_batch`

Then expand:

- `direct_inbound_details`
- `config_link_details`

Only expand `non_deterministic_signals` if the deterministic picture is
insufficient.

### Feature-change flow

Start with:

- `first_batch`

Then expand:

- `direct_outbound_details`
- `direct_inbound_details`
- `impact_estimate`

Use `evidence_lookup` for any relationship that determines the final edit set.

### Review flow

Start with:

- `first_batch`

Then expand:

- `impact_estimate`
- `non_deterministic_signals`

Do not treat non-deterministic findings as defects by themselves.

## Negative Guidance

Do not:

- treat omitted second-stage sections as empty sections
- treat a truncated list as a complete list
- promote `non_deterministic` packets into deterministic facts
- claim evidence verification without `evidence_lookup` or direct file inspection
- use `analysis_state=degraded` packets as if they were full coverage

## Example Packet Sequence

### First batch

```json
{
  "protocol_version": "ctx-v1",
  "packet_kind": "first_batch",
  "consumer_profile": "feature",
  "target": {
    "file": "src/services/price.ts",
    "stack_family": "typescript",
    "analysis_state": "success"
  },
  "deterministic_summary": {
    "direct_outbound": {
      "total": 1,
      "returned": 1,
      "truncated": false,
      "items": ["src/utils/currency.ts"]
    }
  },
  "available_expansions": [
    "direct_outbound_details",
    "direct_inbound_details",
    "impact_estimate",
    "non_deterministic_signals",
    "evidence_lookup"
  ],
  "recommended_expansions": [
    "direct_outbound_details",
    "direct_inbound_details",
    "impact_estimate"
  ],
  "request_templates": [
    {
      "packet_kind": "section_detail",
      "section": "direct_outbound_details",
      "profile": "feature"
    }
  ]
}
```

### Section detail

```json
{
  "protocol_version": "ctx-v1",
  "packet_kind": "section_detail",
  "consumer_profile": "feature",
  "section": "direct_inbound_details",
  "certainty": "deterministic",
  "content_type": "list"
}
```

### Evidence lookup

```json
{
  "protocol_version": "ctx-v1",
  "packet_kind": "evidence_lookup",
  "consumer_profile": "feature",
  "lookup_mode": "exact_evidence_ref"
}
```

### Auto-expand bundle

```json
{
  "protocol_version": "ctx-v1",
  "packet_kind": "auto_expand_bundle",
  "consumer_profile": "feature",
  "first_batch": {},
  "expanded_sections": [
    "direct_outbound_details",
    "direct_inbound_details",
    "impact_estimate"
  ],
  "expanded_packets": [
    {
      "packet_kind": "section_detail",
      "section": "direct_outbound_details"
    }
  ]
}
```
