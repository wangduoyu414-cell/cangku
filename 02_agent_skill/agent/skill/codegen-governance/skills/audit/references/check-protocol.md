# Audit Protocol

This document defines the validation protocol for the `audit` sibling skill.
It describes how to parse, validate, and grade outputs from `codegen-governance`.

---

## 1. Protocol Overview

`audit` operates as a gatekeeper after `codegen-governance`
produces output. Its role is to catch violations that would otherwise be silently accepted,
including:

- Missing required contract fields
- Placeholder or filler content
- Vague or non-actionable descriptions
- Semantic contradictions between scope, depth, scenario packs, implementation claims, and validation evidence
- Misuse of the `minimal` whitelist path
- Falsely claimed validation
- Missing stop condition handling
- Missing `task_mode` or `continuation_mode`

The check skill does **not**:

- Generate contracts or reports
- Make implementation decisions
- Edit or modify files
- Replace code review or independently prove runtime correctness

It **does** audit whether the contract, report, and validation record honestly
describe the implementation work and whether the claimed depth still matches the
described risk.

---

## 2. Validation Stages

### Stage 1: Type Detection

Determine the output type by scanning for anchor tags:

| Anchor Found | Output Type |
|-------------|-------------|
| `##-Target-Language` or `##-Contract-Metadata` | Pre-Generation Contract |
| `##-Report-Metadata` | Implementation Report |
| Neither | Unknown - report as FATAL |

### Stage 2: Anchor Completeness

Check that all required anchors are present.
If any MUST anchor is missing, report FATAL or MUST based on the anchor definition.

### Stage 3: Metadata Completeness

For Contracts:

- `generated_at`
- `task_mode`
- `continuation_mode`
- `stop_before_code`

For Reports:

- `generated_at`
- `task_mode`
- `continuation_mode`
- `contract_generated`
- `implementation_completed`
- `stopped_before_implementation`

### Stage 4: Content Quality

For each present anchor, check:

1. Placeholder detection: no `[todo]`, `[varies]`, `TBD`, or bare `- :`
2. Vague filler detection: no "handle errors appropriately", "validate the input", "maybe", or "probably"
3. Specificity check: Executed Validation must include concrete commands
4. Evidence check: Executed Validation must include real result descriptions

### Stage 5: Semantic Consistency And Depth Fit

Check that the document is internally coherent:

1. Scope, input contract, return contract, and selected scenario packs do not contradict each other
2. `contract_depth` matches the described risk and blast radius
3. `minimal` remains inside the closed whitelist and still preserves the minimum closure loop
4. Reported deviations, covered edge cases, residual risks, and executed validation do not contradict the earlier contract
5. If a `minimal` artifact introduces caller-visible drift, widened side effects, trust-boundary content, or cross-file behavior, flag whitelist misuse and recommend upgrading to `standard`

### Stage 6: Validation Distinction (Reports Only)

This is the most critical check for Implementation Reports.

Rules:

1. `##-Validation-Distinction` must be present
2. `Tests claimed as executed but NOT actually run` must be explicitly listed
3. `claimed_verified_count` must equal `actually_verified_count`
4. `discrepancy` must equal `0`
5. Items in `##-Executed-Validation` must not overlap with `##-Validation-Not-Run`

If the report claims that no validation was skipped, no caller-visible drift
occurred, or the contract stayed fully aligned, the rest of the report must not
contradict that claim.

### Stage 7: Stop Condition Enforcement

For Pre-Generation Contracts:

- If `stop_before_code: true`, a stop template must be present
- If `stop_before_code: false`, the contract should read like a real implementation handoff, not an implicit stop

---

## 3. Scoring

The shared evaluator uses a weighted score that combines:

- MUST anchor completeness
- SHOULD anchor completeness
- semantic-consistency checks
- penalties for FATAL and MUST findings
- penalties for placeholders, vague filler, and fake validation claims

Interpret scores as a quality signal, not as an override of blocking findings.
If a report has a FATAL violation, it still fails even if its numeric score looks high.

---

## 4. Integration Points

### With codegen-governance

This skill is intended to run immediately after `codegen-governance`:

```text
User Request -> codegen-governance -> Contract or Report
                                              -> audit
                                              -> Validation Report
```

### With CI Pipelines

Use the parent repository's unified runner:

```bash
python scripts/run_evals.py --ci
```

Or run only the check-skill fixture suite:

```bash
python skills/audit/scripts/run_evals.py
```

---

## 5. Common Violation Patterns

### Pattern 1: Placeholder Contract

The contract has all anchors but still contains placeholders such as `[todo]` or `TBD`.

### Pattern 2: Silent Stop

The contract effectively stops, but `stop_before_code` is missing or false.

### Pattern 3: Vague Validation

Executed Validation says "run the tests" or "passed" without concrete commands or evidence.

### Pattern 4: Semantic Drift Hidden By `minimal`

The artifact claims `contract_depth: minimal`, `expected contract drift: none`, or
similar half-exempt language while also describing default changes, widened side
effects, new boundary behavior, or other caller-visible drift.

### Pattern 5: Falsely Claimed Validation

The same validation appears in both Executed Validation and Validation Not Run, or
`claimed_verified_count` exceeds `actually_verified_count`.

### Pattern 6: Missing Continuation Metadata

The output omits `task_mode` or `continuation_mode`, making it harder to audit why implementation proceeded or stopped.

---

## 6. Tool Support

| Tool | Purpose |
|------|---------|
| `scripts/eval_contract_output.py` | Automated anchor completeness and content quality check |
| `scripts/eval_trigger_and_scenario.py` | Trigger and scenario selection evaluation |
| `scripts/validate_metadata.py` | Repository-level metadata consistency |
| `scripts/run_evals.py` | Unified runner for CI integration |
| `skills/audit/scripts/run_evals.py` | Check-skill fixture suite |

Use the human review layer when:

- automated tools return borderline results
- the output requires judgment about semantic consistency, not just completeness
- you need a formal validation report for a review or compliance process

