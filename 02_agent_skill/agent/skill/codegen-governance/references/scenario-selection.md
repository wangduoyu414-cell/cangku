# Scenario Selection

Always include:

- [base-rules.md](./base-rules.md)
- Language-specific rules from `references/lang-rules/` based on the target language
- Prohibited patterns from `references/prohibited-patterns/` based on the target language

If runtime, framework, or toolchain details dominate the task, also read
[environment-routing.md](./environment-routing.md) and the relevant file in
`references/env-rules/`.

Choose 1 to 4 packs based on the task shape.

Transition-state routing has three working routes plus one recovery state:

- `skip` - stay on the normal implementation path; use this for read-only, design-only, review-only, unsupported-stack, whole-system tasks, or ordinary low-risk edits already proven outside governance-sensitive risk
- `recover_anchor_then_activate` - implementation intent is real, but the dominant code surface is still ambiguous
- `light` - enter the skill and use `minimal`; only for whitelist-qualified micro-patches, and only when every whitelist item is explicit
- `full` - enter the skill and use `standard` or `expanded`; `standard` is the default after the `full` route is selected, and `expanded` is reserved for clearly high-risk boundary or runtime work

---

## Trigger Decision Tree

```
Start: "Does this task involve writing, patching, or contract-first preparation for code?"

No -> `skip`

Yes -> "Is the dominant code surface supported and recoverable?"

  No, and the stack is unsupported -> `skip`
  No, but it could be recovered from path / current file / repo context -> `recover_anchor_then_activate`
  Yes -> continue

Then ask: "Is the task already proven to be an ordinary low-risk edit outside governance-sensitive risk?"

  Yes
    -> `skip`

  No -> continue

Then ask: "Does the task explicitly satisfy every minimal-path whitelist condition?"

  Yes
    -> `light`

  No or uncertain
    -> `full`
```

---

## Change Type Classifier

Before selecting packs, determine the change type:

| Change Type | Trigger | Pack Selection Depth |
|-------------|---------|---------------------|
| Single expression | Whitelist check | `skip` if already proven outside governance-sensitive risk; otherwise `minimal` only if every whitelist condition passes; otherwise `standard` |
| Single function | Full constraint | `skip` for ordinary low-risk closed edits; otherwise `standard` by default and `expanded` only when risk demands it |
| File/module scope | Full constraint + context | `standard` by default plus dependency check |
| Cross-module | Full constraint + regression | `standard` or `expanded` plus regression assessment |

If cross-module: also consult `current-file-dependency-analysis` before proceeding.

## Minimal Path Guardrails

Use the `light` route with `minimal` only when all of the following are explicitly true:

- the edit is confined to one local expression, one local branch, or one local function patch
- no public-contract meaning changes
- no new or widened side-effect scope
- no trust-boundary, protocol, time, money, precision, encoding, auth, signature, or sensitive-data concerns
- no reinterpretation of missing, null, empty, 0, false, unknown, or invalid values
- no retry, timeout, cancellation, concurrency, listener lifecycle, or resource-lifecycle ownership
- no source-priority conflict needs to be resolved
- no exception-policy judgment is needed to permit the path

If any item above is uncertain, upgrade to `standard`.

---

## Pack A: Input And Branching

**SELECT WHEN** any of the following is true:

- [ ] Code reads from request/response body, query parameters, or form data
- [ ] Code parses JSON, form data, environment variables, or config
- [ ] Code transforms, normalizes, or maps data between formats
- [ ] Code applies PATCH, merge, or partial update semantics where field presence changes meaning
- [ ] Code validates file names, row shapes, CSV columns, or import/export filters before processing
- [ ] Code validates arrays of events, messages, or items where each item may produce a different result
- [ ] Code contains if/switch/match with multiple branches
- [ ] Code sorts, filters, reduces, or aggregates collections
- [ ] Code compares values for equality or ordering
- [ ] Code handles optional fields or nullable values

Read [scenario-input-branching.md](./scenario-input-branching.md).

---

## Pack B: Fallback And Contract

**SELECT WHEN** any of the following is true:

- [ ] Code has default parameter values or fallback paths
- [ ] Code must distinguish absent, retain, clear, and invalid values during partial updates
- [ ] Code can fail and needs to signal failure
- [ ] Code returns structured results with multiple possible shapes
- [ ] Code wraps or re-throws exceptions/errors
- [ ] Code has partial success semantics (some ok, some failed)
- [ ] Code modifies an existing interface or return shape
- [ ] Code handles empty results, null returns, or absent values
- [ ] Code exposes duplicate suppression, cached replay, or retry exhaustion through the result
- [ ] Code returns per-item status, batch summary, or partial success semantics

Read [scenario-fallback-contract.md](./scenario-fallback-contract.md).

---

## Pack C: Side Effect And Runtime

**SELECT WHEN** any of the following is true:

- [ ] Code reads from or writes to a file, database, or cache
- [ ] Code touches persistent or cross-call state
- [ ] Code makes a network call or sends an event
- [ ] Code uses idempotency keys, duplicate suppression, or cache-backed replay
- [ ] Code creates, overwrites, appends, or cleans up exported files
- [ ] Code acknowledges, retries, or dead-letters queued work, deliveries, or webhook batches
- [ ] Code registers or unregisters listeners/handlers
- [ ] Code involves retry, timeout, or idempotency logic
- [ ] Code involves concurrency control (locks, mutexes, semaphores)
- [ ] Code acquires or releases resources (file handles, connections)

Read [scenario-side-effect-runtime.md](./scenario-side-effect-runtime.md).

---

## Pack D: Boundary And Observability

**SELECT WHEN** any of the following is true:

- [ ] Code constructs URLs, file paths, or shell commands
- [ ] Code handles dates, times, timezones, or durations
- [ ] Code handles money, decimals, or high-precision numbers
- [ ] Code handles Unicode, encoding, or character case
- [ ] Code serializes to or deserializes from JSON, XML, YAML
- [ ] Code serializes to or deserializes from CSV, TSV, line-delimited text, or spreadsheet-like exports
- [ ] Code writes logs, metrics, traces, or audit events
- [ ] Code must redact or omit sensitive data from logs or audit output
- [ ] Code processes HTML, Markdown, or template strings
- [ ] Code interacts with external APIs or third-party services
- [ ] Code validates webhook signatures, provider delivery ids, or event ordering assumptions
- [ ] Code maps upstream status codes or schema failures to local result semantics

Read [scenario-boundary-observability.md](./scenario-boundary-observability.md).

---

## Minimum Safe Defaults

| Task Type | Required Packs |
|-----------|---------------|
| Parse or validate input | A + B |
| Patch or partial update payload | A + B |
| Handle errors or failures | B |
| Update state or resources | C + B |
| Async operations | C |
| Outbound HTTP client or partner API call | A + B + C + D |
| Idempotency key or duplicate suppression | B + C |
| Config / env precedence | A + B |
| Layered config precedence with file / CLI | A + B + C + D |
| Schema version compatibility | A + B + D |
| Sorting / aggregation | A + B |
| Grouped buckets / top-N / pagination | A + B |
| Deterministic local lock contention | B + C |
| Time / money / precision formatting | A + D |
| File import or export | A + C + D |
| File import with row-level reject summary | A + B + C + D |
| Audit redaction or masked diagnostics | C + D |
| Batch partial success | A + B + C |
| Webhook or worker delivery | A + B + C + D |
| External protocols | D |
| Logging or observability | D |

---

## Pack Boundaries

- **Pack A** focuses on input shape and data flow decisions.
- **Pack B** focuses on default/fallback semantics and return contracts.
- **Pack C** focuses on runtime behavior (mutations, concurrency, resources).
- **Pack D** focuses on cross-boundary concerns (protocols, time, logs).

If a task touches multiple packs, always read Pack A first.

---

## High-Frequency Sub-Scenarios

| Sub-scenario | Typical Packs | Why |
|--------------|---------------|-----|
| Patch / partial update semantics | A + B | Presence, clear/retain rules, and stable result semantics interact tightly |
| Outbound HTTP / partner API client | A + B + C + D | Input shaping, failure mapping, retries, and protocol semantics all matter |
| Cache-backed idempotency / duplicate suppression | B + C | Duplicate outcomes and runtime dedupe state must both be explicit |
| Config / env precedence | A + B | Precedence order, invalid present values, and fallback transparency must stay explicit |
| Layered config precedence with file / CLI | A + B + C + D | File loading, CLI parsing, precedence order, and source visibility must all remain explicit |
| Schema version compatibility | A + B + D | Version detection, canonical mapping, and unsupported-version failure semantics must stay explicit |
| Sorting / aggregation | A + B | Stable ordering keys and summary or empty-result contracts must not drift |
| Grouped buckets / top-N / pagination | A + B | Bucket ordering, truncation, and page-range semantics must all remain deterministic |
| Time / money / precision | A + D | Parsing and canonical value-domain rules must remain stable across boundaries |
| File import / export | A + C + D | Row shapes, file side effects, and encoding/serialization all matter together |
| File import with row-level reject summary | A + B + C + D | Row classification, partial import contract, file lifecycle, and encoding all matter together |
| Audit redaction | C + D | Logging is a side effect and redaction is a boundary contract |
| Batch partial success | A + B + C | Per-item classification, result contract, and side effects must align |
| Webhook / worker delivery | A + B + C + D | Delivery protocol, retry/ack behavior, and audit semantics all matter together |
| Deterministic local lock contention | B + C | Claim result contracts and state mutation rules must align without hidden overwrite behavior |

---

## Selection Justification

For each selected pack, the contract MUST include:

```
- Pack name:
  Why it applies:
  Specific risks from this pack that are relevant:
```

For unselected packs:

- `minimal`: no explanation required
- `standard`: explanation optional when useful
- `expanded`: explain unselected packs when omission could be surprising
