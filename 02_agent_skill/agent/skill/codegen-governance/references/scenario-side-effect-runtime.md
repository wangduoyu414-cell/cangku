# Scenario Pack: Side Effect And Runtime

Use this pack when code mutates state, acquires resources, runs asynchronously, retries work, or relies on caches and idempotency.

## State And Side Effects

- Do not mutate input parameters or shared objects without saying so.
- Keep side effects visible and traceable.
- Avoid leaving invalid intermediate states during multi-step updates.
- Pair resource acquisition with cleanup for locks, listeners, handles, subscriptions, timers, and temporary files.
- Do not expose internal mutable objects for external mutation unless that contract is explicit.

### High-Frequency Sub-Scenario: File Export And Import Lifecycle

- State when files are opened, created, replaced, appended, or cleaned up.
- Do not leave partial exports behind without saying whether they are safe to keep, overwrite, or delete.
- Keep temp-file, final-file, and in-memory buffering stages explicit so partial failure behavior is diagnosable.
- If export or import side effects emit audit events, define whether those events happen before or after filesystem success is confirmed.

## Async, Timing, And Concurrency

- Define await relationships, cancellation semantics, timeout bounds, and error propagation.
- Do not assume the call happens once or in ideal order.
- Protect against duplicate triggers, stale closures, check-then-act races, and reentry.
- One-shot resources and single-consume objects must not be read or submitted twice.
- If a task is cancelled or fails midway, define cleanup, rollback, compensation, or idempotent recovery behavior.

### High-Frequency Sub-Scenario: Outbound HTTP Work

- Define per-attempt timeout, total retry budget, retry backoff, and which status codes or exceptions are retryable.
- Keep request construction, network execution, response mapping, and post-call side effects logically separate.
- Retries must preserve idempotency assumptions. Do not repeat a non-idempotent action without an explicit protection mechanism.
- State whether 4xx, 429, 5xx, timeout, and schema mismatch failures share one path or have distinct handling.

### High-Frequency Sub-Scenario: Webhook And Worker Delivery Semantics

- Define acknowledgement timing, retry triggers, retry budget, and whether retries happen per delivery or per item.
- Keep signature verification, dedupe checks, item processing, ack writes, and dead-letter writes as separate runtime steps.
- Do not emit "processed" side effects for a delivery that will be retried as unacknowledged work.
- State whether duplicate deliveries and duplicate events within one delivery share the same suppression rules.

## Cache, Retry, Idempotency, And Uniqueness

- Distinguish cache miss, empty result, error result, expired result, and reusable result.
- Cache keys must cover the real semantic dimensions of the output.
- Retries need bounds, backoff, stop conditions, and error classification.
- Idempotency must be designed rather than assumed.
- Unique identifiers, nonce values, request ids, and retry semantics must stay consistent across retries and duplicate suppression paths.

### High-Frequency Sub-Scenario: Idempotency Keys And Duplicate Suppression

- Define the uniqueness scope, duplicate window, and when the dedupe store is written.
- Distinguish first execution, in-flight duplicate, cached replay, retry of the same logical request, and true new request.
- Cache or dedupe stores must not be populated with half-finished state unless partial replay semantics are explicitly intended.
- Duplicate suppression must stay observable to the caller through status, metadata, or audit output.

### High-Frequency Sub-Scenario: Batch Progress And Dead-Letter Side Effects

- State when per-item failure records, dead-letter entries, or retry markers are written relative to batch completion.
- Keep aggregate progress counters, emitted audit events, and persisted side effects consistent with the real per-item results.
- Do not let a dead-letter side effect happen twice for the same permanent failure unless replay semantics are explicit.

## Explain Before Coding

State:

- what side effects exist
- whether file creation, overwrite, append, temp-file, or cleanup behavior exists
- what resources must be released
- timeout, cancellation, and retry rules
- which outbound failures are retryable and how retry budgets are bounded
- cache key semantics and invalidation conditions
- how idempotency or duplicate protection is achieved
- when a worker/webhook delivery is acknowledged, retried, or dead-lettered
