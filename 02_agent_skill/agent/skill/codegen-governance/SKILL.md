---
name: codegen-governance
description: >-
  Route threshold-crossing or not-yet-ruled-out contract-sensitive Python, Go,
  TypeScript, JavaScript, or Vue code-writing tasks through risk
  classification before pre-generation constraints. `minimal` is a closed-
  whitelist half-exempt path for micro-edits that still preserve the minimum
  contract/report loop; otherwise use `standard` or `expanded` for higher-risk
  semantics, side effects, boundaries, or runtime behavior. Do not use for
  unsupported stacks, ordinary low-risk edits already proven outside
  governance, review-only work, or non-codegen requests.
---

# Codegen Governance

## Overview

Gate local code generation with a governance workflow. This skill covers the
`risk_gate` and `contract` stages only when upstream routing has already
determined that a supported local code-writing task likely crosses the
governance threshold, or when that threshold cannot yet be ruled out safely.
Start with risk
classification, not with a full activated depth by default. The goal is to
reduce high-cost implementation mistakes without forcing ordinary low-risk
edits through governance by default.

This skill is a **pre-generation constraint layer**. It is responsible for:

1. Recovering the local implementation anchor.
2. Confirming the dominant stack and target language are supported.
3. Routing the request into a light or full governance path based on risk.
4. Forcing a concrete contract before code generation.
5. Preventing hidden semantic drift, hidden side effects, and dishonest validation.
6. Leaving room for the codemodel to choose the smallest valid implementation.

For simple tasks, keep the contract lean and proportional. For complex or risky
tasks, expand the contract depth and scenario coverage instead of skipping the
skill.

The transitional routing model is layered:

- `skip` maps to `do_not_activate` for read-only, design-only, unsupported-stack, or review-only requests
- `recover_anchor_then_activate` is a temporary `risk_gate` recovery state when implementation intent exists but the dominant code surface is still unclear
- `light` maps to `activate` with `minimal` depth only after the closed whitelist proves the task is a half-exempt micro-edit
- `full` maps to `activate` with `standard` or `expanded` depth for routine and high-risk implementation work

This skill is **not** responsible for repository-wide architecture design,
migration planning, tech selection, or post-hoc review-only work.

Target languages: **Python**, **Go**, **TypeScript**, **JavaScript**, **Vue 3**

> Note: JavaScript reuses the TypeScript language rules where they describe
> JavaScript runtime behavior or shared type-safety risks. Use repo context to
> decide which TypeScript-only guidance does not apply to plain JavaScript.

## Quick Reference

1. Enter this skill only for threshold-crossing or not-yet-ruled-out governance cases, then start with `risk_gate` classification and route the request into `skip`, `light`, or `full`; operationally this still resolves to `do_not_activate`, `recover_anchor_then_activate`, `activate + minimal`, or `activate + standard/expanded`.
2. Recover the target stack and language before triggering the contract workflow.
3. If the task is contract-first, treat that as implementation intent even when code has not started yet, but do not use this skill as a universal front door for every supported code edit.
4. If the dominant code surface is not Python, Go, TypeScript, JavaScript, or Vue 3, route to `skip`.
5. Prove whether the task qualifies for the closed `minimal` whitelist. If any whitelist condition is uncertain or fails, route to `full` and upgrade to `standard`.
6. Read [source-priority.md](./references/source-priority.md) and [exception-policy.md](./references/exception-policy.md) before escalating a recommendation to a hard block.
7. Read [environment-routing.md](./references/environment-routing.md) only when runtime or framework details dominate the task, then load the relevant file under `references/env-rules/`.
8. Identify the `task_mode`:
   - `patch-safe`
   - `repo-conformant`
   - `greenfield-strict`
9. Identify the target language and read the corresponding language rules:
   - Python: [lang-rules/python.md](./references/lang-rules/python.md)
   - Go: [lang-rules/go.md](./references/lang-rules/go.md)
   - TypeScript / JavaScript: [lang-rules/typescript.md](./references/lang-rules/typescript.md)
   - Vue: [lang-rules/vue.md](./references/lang-rules/vue.md)
10. Use [scenario-selection.md](./references/scenario-selection.md) to choose 1 to 4 scenario packs, starting with the lightest pack set that still covers the task.
11. Check prohibited patterns in [references/prohibited-patterns/](./references/prohibited-patterns/).
12. Before generating code, fill [pre-generation-contract-template.md](./references/pre-generation-contract-template.md). For `minimal`, keep the existing MUST anchors, add a compact `##-Validation-Plan`, and use the half-exempt micro-change path; for `standard` or `expanded`, use the full path.
13. Choose the `continuation_mode`:
   - `continue`
   - `continue_with_explicit_assumptions`
   - `stop_and_ask`
14. If the task edits existing code, explicitly record the current contract snapshot and any authorized drift before writing code. For `minimal`, the expected drift must stay `none`.
15. Prefer repo-derived validation commands over generic defaults when local tooling is available. Maintainers can use `scripts/suggest_validation_plan.py` to infer candidate commands.
16. After implementation, fill [implementation-report-template.md](./references/implementation-report-template.md). `minimal` still requires an implementation report with an honest executed versus not-run distinction so the downstream audit stage can verify the minimum closed loop.

## Workflow

1. **Recover the implementation anchor**: target file, function, module, requested change, and allowed blast radius.
2. **Detect stack and target language**: identify the dominant code surface for the intended edit.
3. **Run `risk_gate` classification**:
   - `skip` / `do_not_activate` when the request is read-only, architecture-only, review-only, or unsupported-stack.
   - `recover_anchor_then_activate` when implementation intent exists but the dominant code surface or local anchor is still ambiguous.
   - `light` / `activate + minimal` only when the closed whitelist is explicitly proven.
   - `full` / `activate + standard-or-expanded` for everything else that remains in scope.
4. **Exit early for unsupported stacks**: if the dominant code surface is outside Python, Go, TypeScript, JavaScript, or Vue 3, route to `skip`.
5. **Run closed whitelist classification**: determine whether the task qualifies for the `minimal` half-exempt path or must stay on the `full` route.
6. **Determine the change type**: single expression, single function, file scope, or cross-module.
7. **Determine task mode**:
   - `patch-safe`: preserve existing repo behavior and minimize blast radius.
   - `repo-conformant`: follow current repo conventions and tooling when discoverable.
   - `greenfield-strict`: a new implementation may adopt stronger defaults when the task explicitly allows it.
8. **Choose contract depth**:
   - `minimal`: use only on the `light` route when all closed-whitelist conditions are explicitly satisfied. This is a half-exempt path for highly closed micro-edits and still requires the minimum contract/report loop.
   - `standard`: default depth on the `full` route for most feature work and medium-risk patches.
   - `expanded`: use on the `full` route when semantics, side effects, concurrency, or boundary behavior are the main risk.
9. **Read base rules**: [base-rules.md](./references/base-rules.md).
10. **Apply source priority and exceptions**:
   - Use [source-priority.md](./references/source-priority.md) to resolve conflicts.
   - Use [exception-policy.md](./references/exception-policy.md) before turning a recommendation into a stop condition.
11. **Read language-specific rules** from `references/lang-rules/`.
12. **If runtime or framework details dominate**, read [environment-routing.md](./references/environment-routing.md) and then the matching file in `references/env-rules/`.
13. **Select scenario packs** using [scenario-selection.md](./references/scenario-selection.md).
14. **Check prohibited patterns** for the target language.
15. **Build the pre-generation contract** using [pre-generation-contract-template.md](./references/pre-generation-contract-template.md).
16. **For `minimal`, keep the minimum closed loop**:
    - Fill the existing MUST anchors in the pre-generation contract.
    - Add a compact `##-Validation-Plan` section that distinguishes executed-now versus not-run-now validation.
    - Record the current contract snapshot for edit tasks and keep expected drift at `none`.
    - Name the lightest scenario packs that still cover the task and explain why the quick set is sufficient.
    - Set `continuation_mode` explicitly.
    - Plan at least a compact executed versus not-run validation distinction.
17. **Choose continuation mode**:
    - `continue` when semantics are clear enough to implement safely.
    - `continue_with_explicit_assumptions` when ambiguity exists but the assumptions are narrow, explicit, and low-risk.
    - `stop_and_ask` when ambiguity would change behavior, contract semantics, or side-effect scope.
18. **Only after the contract is complete**, generate the smallest viable code change that satisfies it.
19. **After generation or patching**, report coverage and validation with [implementation-report-template.md](./references/implementation-report-template.md) so the sibling audit stage can check semantic consistency and validation honesty.

## Closed Whitelist For `minimal`

### Qualification Rule

Use `minimal` only when both gates are satisfied:

1. Every general negative condition below is explicitly true.
2. The task fits one closed category below.

If any gate is uncertain, stay off the `light` route and upgrade to `standard`.

### General Negative Conditions

Only allow the `minimal` path when the task does **not**:

- change public inputs, return behavior, failure semantics, defaults, config keys, or state semantics
- change the meaning of missing, `null`, empty, `0`, `false`, `invalid`, or `unknown`
- add or widen logging, audit, time, precision, encoding, or serialization semantics
- add or widen side effects involving files, databases, caches, networks, events, or resource lifecycle
- touch concurrency, retries, timeouts, cancellation, auth, or signatures
- change configuration priority
- create new cross-file cumulative behavior
- create a conflict that requires `source-priority.md` or `exception-policy.md` to settle

### Closed Categories

First-round `minimal` eligibility is limited to these highly closed categories:

- pure formatting or layout adjustments
- single-file private naming consistency fixes
- side-effect-free import cleanup
- comment changes and non-protocol display copy fixes
- single-file local expression cleanup that is equivalent and does not change evaluation semantics

### Immediate Upgrade Conditions

Upgrade from `minimal` to `standard` when any of the following is true:

- any whitelist condition is uncertain
- the current contract snapshot cannot be stated clearly
- expected drift is not `none`
- the lightest scenario-pack explanation is not enough to cover the task honestly
- the task touches any excluded category such as defaults, null-handling, error returns, logging, audit semantics, `||`, `??`, empty-string, `0`, or `false` semantics
- runtime or framework behavior becomes material enough that environment-specific rules may change the answer

### Anti-Splitting Rule

Do not use repeated `minimal` patches to sneak around escalation. If the same task or
the same implementation anchor accumulates multiple whitelist-claim patches, upgrade
the later patch to the `full` route and use `standard`.

## `minimal` Half-Exempt Path Requirements

`minimal` is a half-exempt path, not a full bypass. Keep the minimum closed loop:

- Preserve the existing MUST anchor sections in the pre-generation contract. Use concise content rather than omitting anchors.
- Include a compact `##-Validation-Plan` so the executed-versus-not-run distinction is explicit even on the half-exempt path.
- For edit tasks, record the current contract snapshot and keep expected drift at `none`.
- In `##-Selected-Scenario-Packs`, name the lightest applicable pack set and explain why it is sufficient.
- Set `continuation_mode` explicitly.
- Fill the implementation report after the change.
- Keep an honest executed-versus-not-run validation distinction, even when validation is compact.

## Resource Routing

### Base Read Set

- [base-rules.md](./references/base-rules.md): cross-language hard constraints and task/continuation modes
- [source-priority.md](./references/source-priority.md): how to resolve conflicts between repo reality and general guidance
- [exception-policy.md](./references/exception-policy.md): when a recommendation stays a recommendation
- [durable-reference-index.md](./references/durable-reference-index.md): how long-lived references are categorized inside this skill
- Language rules from `references/lang-rules/` based on the target language

### On-Demand Routing

- [environment-routing.md](./references/environment-routing.md): read only when runtime or framework-specific behavior could change the implementation choice or contract

### Scenario Packs

- [scenario-selection.md](./references/scenario-selection.md): decision tree and pack selection criteria
- [scenario-input-branching.md](./references/scenario-input-branching.md): Pack A - input handling, parsing, branching, collections
- [scenario-fallback-contract.md](./references/scenario-fallback-contract.md): Pack B - defaults, fallback, return contracts, error handling
- [scenario-side-effect-runtime.md](./references/scenario-side-effect-runtime.md): Pack C - state mutations, async, concurrency, caching
- [scenario-boundary-observability.md](./references/scenario-boundary-observability.md): Pack D - external protocols, time, logs

### Language-Specific Resources

- [lang-rules/python.md](./references/lang-rules/python.md): Python language semantics, traps, and testing heuristics
- [lang-rules/go.md](./references/lang-rules/go.md): Go semantics, error handling, runtime behavior, and testing heuristics
- [lang-rules/typescript.md](./references/lang-rules/typescript.md): TypeScript and JavaScript semantics, type-system traps, and testing heuristics
- [lang-rules/vue.md](./references/lang-rules/vue.md): Vue 3 semantics, component constraints, and testing heuristics

### Environment-Specific Resources

- [env-rules/python.md](./references/env-rules/python.md): Python framework, async, and toolchain boundaries
- [env-rules/go.md](./references/env-rules/go.md): Go service, HTTP, IO, and concurrency environment boundaries
- [env-rules/typescript.md](./references/env-rules/typescript.md): TypeScript or JavaScript runtime and package-tooling boundaries
- [env-rules/vue.md](./references/env-rules/vue.md): Vue application runtime, router, store, SSR, and tooling boundaries

### Prohibited Patterns

- [prohibited-patterns/python.md](./references/prohibited-patterns/python.md): Python absolute prohibitions
- [prohibited-patterns/go.md](./references/prohibited-patterns/go.md): Go absolute prohibitions
- [prohibited-patterns/typescript.md](./references/prohibited-patterns/typescript.md): TypeScript absolute prohibitions
- [prohibited-patterns/vue.md](./references/prohibited-patterns/vue.md): Vue absolute prohibitions

### Templates

- [pre-generation-contract-template.md](./references/pre-generation-contract-template.md): fill before writing code
- [implementation-report-template.md](./references/implementation-report-template.md): fill after implementation or when stopping early

### Maintainer Guide

- [references/development-guide.md](./references/development-guide.md): longer-form maintainer guidance
- [references/reference-governance.md](./references/reference-governance.md): lightweight placement and maintenance rules for long-lived references

## Critical Rules

- **Enter this skill only after stack detection confirms a supported target language and the task remains inside governance-routing scope.**
- **Start with `risk_gate` classification.** Do not default straight into a fully activated contract depth.
- After the `full` route activates, use `standard` depth by default.
- Use `minimal` only when all closed-whitelist conditions are explicitly satisfied.
- Treat `minimal` as a half-exempt path that still preserves the minimum contract/report loop.
- If any closed-whitelist condition is uncertain, upgrade to `standard`.
- Use `expanded` when the dominant risk is boundary behavior, retries or idempotency, concurrency, auth or signature, money or timezone precision, or audit or redaction.
- **Do not trigger this skill for unsupported languages or when the dominant code surface cannot be recovered with reasonable confidence.**
- **Treat contract-first requests as implementation requests.** If the user explicitly asks for a pre-generation contract before coding, route here once the supported code surface is known or recoverable.
- **Default to the smallest change** that preserves existing public contracts unless the task explicitly authorizes a contract change.
- **Do not collapse missing, empty, zero, false, invalid, and unknown into one bucket** unless the business rule explicitly says so. Exception: in Python, falsy checks are idiomatic; only force distinction when `None` carries business meaning.
- **Do not let defaults, fallback paths, optional chaining, or compatibility shims hide real data or contract failures.**
- **Do not invent validation results.** Only report what actually ran.
- **Do not hide side effects** inside helpers, short-circuit expressions, or silent compatibility logic.
- **Use hard stops only for high-cost mistakes.** Style advice, ideal repo states, and optional toolchain improvements remain recommendations unless repo configuration already makes them mandatory.
- Fatal labels in language prohibited-pattern files are effective hard stops only when they imply a violation of public contract stability, explicit side-effect ownership, trust-boundary correctness, or validation honesty. Otherwise treat them as warnings and document the deviation when relevant.
- **Prefer explicit rejection, explicit downgrade, or explicit uncertainty over guessing.**
- **Always check the target language's prohibited patterns before implementing.**
- **If the task expands beyond local implementation quality into broader design or migration planning, hand off to a more appropriate workflow.**

## Default Activation Policy

- Do not use this skill as the default front door for every supported-language code edit.
- Use this skill automatically only when a supported local code-writing task likely crosses the governance threshold, or when upstream routing cannot yet prove that the task stays outside contract-sensitive risk.
- First confirm the dominant code surface is Python, Go, TypeScript, JavaScript, or Vue 3; if not, do not auto-trigger this skill.
- Before selecting `minimal`, `standard`, or `expanded`, perform `risk_gate` classification.
- If `risk_gate` can positively route the task to `skip`, stay on the normal implementation path instead of manufacturing governance paperwork.
- If implementation intent is clear but the dominant code surface is still ambiguous, recover the anchor first instead of hard-rejecting the task.
- For contract-first requests, enter this skill as soon as the supported code surface is known or recoverable.
- Use `minimal` only for closed-whitelist-qualified micro-patches on the `light` route.
- If the whitelist does not clearly pass, use the `full` route and choose `standard` or `expanded` instead of stretching `minimal`.
- Use `standard` as the default depth after the `full` route is selected for local implementation work.
- Upgrade to `expanded` only for clearly high-risk boundary or runtime tasks.
- Do not auto-trigger this skill for ordinary low-risk edits that are already proven to stay outside governance-sensitive risk, and do not auto-trigger it for read-only analysis, documentation-only work, architecture discussion, or post-hoc review with no planned code change.

## Redline Boundaries

Use `stop_and_ask` only when missing information would change one of these:

1. Public contract meaning: accepted inputs, return shape, failure signaling, or caller-visible defaults
2. Side-effect scope: state writes, persistence, network calls, resource lifecycle, retry ownership, or audit/log semantics
3. Trust or boundary behavior: auth, signature verification, protocol mapping, money/timezone precision, or sensitive-data handling

If none of the above would change, prefer `continue_with_explicit_assumptions` over a hard stop.

## Constraint Severity Levels

Rules are marked with severity levels:

| Level | Mark | Meaning | Consequence if violated |
|-------|------|---------|------------------------|
| **Fatal** | `[FATAL]` | High-cost semantic, safety, or honesty failure | Must stop or explicitly downgrade to `stop_and_ask` |
| **Warning** | `[WARN]` | Quality or maintainability risk | Must document the deviation or reason |
| **Advisory** | `[ADV]` | Helpful guidance | Leave room for the codemodel to choose another valid path |

## Task Modes

| Mode | Use when | Default posture |
|------|----------|-----------------|
| `patch-safe` | patching existing code with a narrow blast radius | preserve behavior and avoid widening config or toolchain scope |
| `repo-conformant` | the repo has discoverable conventions and tooling | follow existing repo reality over generic recommendations |
| `greenfield-strict` | creating a new isolated implementation or module | stronger recommended defaults may be adopted if they stay local |

## Continuation Modes

| Mode | Use when | Required behavior |
|------|----------|-------------------|
| `continue` | semantics are clear enough to implement safely | proceed normally |
| `continue_with_explicit_assumptions` | narrow ambiguity exists but assumptions are explicit and low-risk | list the assumptions in the contract and report |
| `stop_and_ask` | ambiguity would change behavior, side effects, or public contract | stop and request the minimum clarification |

## Validation

- Confirm the contract names the selected scenario packs and justifies why they apply.
- Confirm required inputs and unknowns are explicit.
- Confirm return semantics, failure channels, and side effects are specified when relevant.
- Confirm edit tasks explicitly document the existing contract snapshot and expected drift.
- Confirm `task_mode` and `continuation_mode` are set and justified.
- Confirm source-priority decisions are explicit when repo reality conflicts with generic guidance.
- Confirm stack detection was explicit enough to justify using this skill for the target code surface.
- Confirm language-specific rules have been applied.
- Confirm prohibited patterns have been checked.
- Confirm a validation plan exists.
- For `minimal`, keep the existing MUST anchors, include a compact `##-Validation-Plan`, record the current contract snapshot and expected drift, justify the selected lightweight scenario packs, and preserve an implementation report with a compact but honest executed-versus-not-run distinction.
- For `standard` and `expanded`, require explicit executable versus cannot-run checks and prefer repo-derived commands when local tooling is available.
- Confirm code generation did not start before the contract was produced, unless the user explicitly opted out.
- Confirm contract depth is proportional: `minimal` only for closed-whitelist-qualified micro-patches on the `light` route, `standard` as the default depth on the `full` route, and `expanded` only for clearly high-risk work.

## Structured Output Protocol

Both output templates use Markdown anchor tags (`##-Anchor-Name`) for machine-readable parsing.
Do not rename, remove, or reorder anchor sections. Each section serves as a checkpoint that can be
verified by `scripts/eval_contract_output.py`.

### Pre-Generation Contract Anchors

| Severity | Anchor | Purpose |
|----------|--------|---------|
| MUST (FATAL) | `##-Contract-Metadata` | Lifecycle metadata, task mode, continuation mode |
| MUST (FATAL) | `##-Target-Language` | Language identification |
| MUST (FATAL) | `##-Scope` | Implementation boundaries |
| MUST (FATAL) | `##-Selected-Scenario-Packs` | Pack selection with justification |
| MUST (FATAL) | `##-Input-Contract` | Input acceptance and invalid handling |
| MUST (FATAL) | `##-Return-And-Failure-Contract` | Success, empty, and failure shapes |
| SHOULD | `##-Branching-And-Ordering` | Decision points and priority rules |
| SHOULD | `##-Defaults-And-Fallback` | Default sources and downgrade triggers |
| SHOULD | `##-Side-Effects-And-Runtime` | State mutations and resource lifecycle |
| SHOULD | `##-Validation-Plan` | Executable vs. unverifiable validation |
| MAY | `##-Boundary-And-Observability` | Cross-boundary concerns |
| MAY | `##-Open-Risks` | Known unknowns, assumptions, and escalation reasons |

### Implementation Report Anchors

| Severity | Anchor | Purpose |
|----------|--------|---------|
| MUST | `##-Report-Metadata` | Report lifecycle metadata, task mode, continuation mode |
| MUST | `##-Language-Specific-Rules-Applied` | Language and prohibited pattern status |
| MUST | `##-Covered-Edge-Cases` | What edge cases were handled |
| MUST | `##-Residual-Risks` | Remaining risks |
| MUST | `##-Executed-Validation` | Verification that actually ran (with commands) |
| MUST | `##-Validation-Not-Run` | Verification that was skipped (with reasons) |
| FATAL | `##-Validation-Distinction` | Non-negotiable honesty checkpoint |
| MUST | `##-Contract-Deviations` | Any deviation from the original contract |

## Output Contract

Done means:

- A pre-generation contract exists before code generation, with all MUST anchor sections filled.
- The selected scenario packs match the task's dominant risks.
- `task_mode` and `continuation_mode` are set explicitly.
- Edit tasks explicitly document current contract expectations and any authorized drift.
- Source-priority and exception decisions are recorded when relevant.
- Language-specific rules have been applied.
- Prohibited patterns have been checked.
- The implementation, if requested, stays within the stated blast radius or explicitly calls out a deviation.
- The final response states covered edge cases, residual risks, executed validation, and missing validation.
- The Validation Distinction section in the report explicitly confirms no un-run validation was claimed as executed.
- `stop_before_code` is set correctly: true if implementation was blocked; false if implementation proceeded.

## Failure Handling

- If the task is missing the implementation anchor, stop and recover the target before reasoning about rules.
- If the dominant stack or target language cannot be recovered with reasonable confidence, stop and recover that information before using this skill.
- If the target language is unsupported, exit this workflow and hand off to a more appropriate process.
- If the dominant risk class is unclear, choose the most conservative scenario pack and state the ambiguity.
- If required contract information is missing and guessing would change behavior, switch to `stop_and_ask`.
- If ambiguity is narrow and low-risk, prefer `continue_with_explicit_assumptions` over a hard stop.
- If the task requires broader architecture or cross-system migration decisions, hand off instead of stretching this skill beyond local implementation constraints.

When stopping, use this template:

```
Cannot proceed safely. Missing: [list the minimum required information].
Stop here. Ask for: [minimum clarification needed].
```

