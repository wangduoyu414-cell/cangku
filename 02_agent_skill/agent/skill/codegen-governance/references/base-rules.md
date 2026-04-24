# Base Rules

Read this file before any scenario pack.

---

## Constraint Levels

Rules are marked with severity levels:

| Level | Mark | Meaning | Consequence if violated |
|-------|------|---------|------------------------|
| **Fatal** | `[FATAL]` | High-cost semantic, safety, or honesty failure | Must stop or downgrade to `stop_and_ask` |
| **Warning** | `[WARN]` | Important quality or maintainability risk | Must document deviation or reason |
| **Advisory** | `[ADV]` | Helpful but non-blocking guidance | Leave room for the codemodel to choose another valid path |

---

## Task Modes

Always choose one task mode before implementation:

- `patch-safe` - patch existing code with the smallest viable change
- `repo-conformant` - follow current repo conventions and tooling when discoverable
- `greenfield-strict` - allow stronger recommended defaults for new isolated implementations

Default to `patch-safe` unless the task explicitly authorizes broader change.

---

## Continuation Modes

Always choose one continuation mode before implementation:

- `continue` - semantics are clear enough to proceed safely
- `continue_with_explicit_assumptions` - ambiguity exists, but the assumptions are narrow and low-risk
- `stop_and_ask` - ambiguity would change behavior, side effects, or public contract

Use `stop_and_ask` for high-cost ambiguity. Do not use it for style, formatting, or greenfield-only recommendations.

---

## Source Priority

Use the following precedence order when rules conflict:

1. The user's explicit authorization for this task
2. Existing public contract and stable repo behavior
3. Repo configuration and toolchain
4. Official language or runtime semantics
5. Official framework documentation
6. Official style guides or engineering recommendations
7. Model defaults

Read [source-priority.md](./source-priority.md) when the repo's existing behavior conflicts with a generic best practice.

---

## Fatal Rules

[FATAL] Make the smallest necessary change. Do not expand scope or refactor surrounding code just to avoid a local implementation problem.

[FATAL] Keep existing interfaces, default behavior, config keys, state semantics, and return shapes stable unless the task explicitly authorizes change.

[FATAL] Do not merge `null`, `undefined`, `None`, `nil`, empty string, `0`, `false`, empty array, and empty object into one semantic bucket unless the business rule explicitly says so. Exception: in Python, falsy checks are idiomatic - only enforce distinction when `None` carries specific business meaning.

[FATAL] Do not implement only the happy path. Account for invalid input, empty values, unknown values, failure paths, timeout, retry, rollback, recovery, and fallback behavior where relevant.

[FATAL] Do not use silent defaults, loose parsing, implicit conversion, or vague return values to hide real errors.

[FATAL] Do not hide side effects. State writes, resource acquisition, cache writes, event emission, logging, and in-place mutation must be explicit and documented in the contract.

[FATAL] Only report validation that actually ran. Never claim tests, scripts, commands, or manual checks that did not happen.

[FATAL] Do not guess through behavior-changing ambiguity. If missing information would change contract semantics, switch to `stop_and_ask`.

[FATAL] Do not promote a recommendation to a hard block unless repo reality, enabled configuration, or language semantics make it mandatory.

---

## Warning Rules

[WARN] Prefer explicit rejection, explicit downgrade, or explicit uncertainty when input shape, enum values, ordering rules, units, or error semantics are unclear.

[WARN] Do not rely on unstable host defaults such as key order, loose date parsing, implicit type conversion, current timezone, global mutable state, or random values.

[WARN] If compatibility, migration, caching, concurrency, recovery, data writes, security boundaries, or log semantics are touched, surface the risk and the validation plan in the contract.

[WARN] If continuing under assumptions, record the assumptions explicitly in the contract and report.

[WARN] If repo reality conflicts with a generic recommendation, document the source-priority decision instead of silently choosing one side.

---

## Advisory Rules

[ADV] Consider immutable data structures when the language supports them idiomatically.

[ADV] When refactoring, preserve behavior equivalence and document any intentional changes in the contract.

[ADV] Prefer composition over complex inheritance hierarchies.

[ADV] Prefer repo-native validation commands over generic language-wide defaults.

---

## Exception Policy

Read [exception-policy.md](./exception-policy.md) before treating a style recommendation, greenfield-only default, or optional toolchain improvement as mandatory.

Common cases that remain recommendations unless repo context says otherwise:

- enabling stricter compiler flags in an existing repo
- adopting a new linter or formatter
- enforcing a preferred naming or layout style
- replacing an existing but working abstraction for purity alone

---

## Language-Specific Rules

After reading this file, always read the language-specific rules before implementation:

- For Python: read `references/lang-rules/python.md`
- For Go: read `references/lang-rules/go.md`
- For TypeScript and JavaScript: read `references/lang-rules/typescript.md`
- For Vue: read `references/lang-rules/vue.md`

---

## Pre-Implementation Self-Check

Before generating code, confirm:

1. [ ] All Fatal rules are satisfied.
2. [ ] `task_mode` is set and justified.
3. [ ] `continuation_mode` is set and justified.
4. [ ] Any Warning rule violations are documented in Open Risks.
5. [ ] Language-specific rules have been read and applied.
6. [ ] Prohibited patterns have been checked.
7. [ ] Source-priority or exception decisions are documented when relevant.

If any Fatal check fails, stop or downgrade to `stop_and_ask` before implementation.

---

## Escalation Triggers

Switch to `stop_and_ask` when any of the following are true:

- the task cannot define a stable input contract
- the return contract would silently change
- side effects cross file, service, or persistence boundaries without approval
- fallback logic would change business meaning
- the implementation needs a broader design or migration decision to stay correct

Use `continue_with_explicit_assumptions` only when:

- the assumption is narrow
- the assumption does not expand blast radius
- the assumption does not hide a public contract change
- the assumption is recorded in both the contract and the report

When stopping, use this template:

```
Cannot proceed safely. Missing: [list the minimum required information].
Stop here. Ask for: [minimum clarification needed].
```
