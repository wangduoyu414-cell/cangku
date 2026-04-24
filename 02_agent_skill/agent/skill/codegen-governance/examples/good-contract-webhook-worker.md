# Good Contract: Webhook Worker Delivery

```md
##-Contract-Metadata

<!-- generated_at: 2026-04-19T00:00:00Z -->
<!-- task_mode: repo-conformant -->
<!-- continuation_mode: continue -->
<!-- contract_depth: expanded -->
<!-- stop_before_code: false -->

---

##-Target-Language

### Target Language

- Language: Python
- Language version assumptions (if any): existing worker runtime and queue tooling remain in place

---

##-Scope

### Scope

- Target: `src/workers/webhook_worker.py` — `process_webhook_delivery`
- Requested change: verify signature, dedupe `delivery_id` / `event_id`, and make batch-level ack / retry / dead-letter semantics explicit
- Allowed blast radius: worker module and direct tests only
- Explicit non-goals:
  - do not redesign the provider protocol
  - do not add new queue infrastructure
  - do not change unrelated event handlers
- Change mode: edit_existing
- Existing contract snapshot: duplicate and retry semantics exist but are not explicit enough at batch level
- Expected contract drift: None
- Repo constraints that override generic guidance: preserve current batch input shape and queue ownership boundaries

---

##-Selected-Scenario-Packs

### Selected Scenario Packs

- Pack: A
  Why it applies: signature, delivery metadata, and event arrays are explicit boundary inputs
  Specific risks from this pack that are relevant: malformed payloads, duplicate ids, invalid signatures

- Pack: B
  Why it applies: duplicate, processed, partial, and retry-required outcomes are caller-visible batch contracts
  Specific risks from this pack that are relevant: duplicate suppression, partial success, terminal failure vs retry

- Pack: C
  Why it applies: ack, retry, cache-backed dedupe, and dead-letter writes are runtime side effects
  Specific risks from this pack that are relevant: ack timing, retry ownership, cache write ordering

- Pack: D
  Why it applies: webhook protocol semantics, provider ordering assumptions, and audit events cross a trust boundary
  Specific risks from this pack that are relevant: signature verification, audit naming, provider delivery semantics

---

##-Input-Contract

### Input Contract

- Accepted inputs:
  - `delivery_id: str`
  - `signature: str`
  - `events: list[WebhookEvent]`
- Missing or empty handling:
  - empty `delivery_id` rejects before any side effect
  - empty `events` rejects before ack
- Unknown or invalid value strategy:
  - invalid signature rejects the whole delivery
  - malformed event items reject or dead-letter per contract, not silently skip
- Normalization or parsing rules:
  - preserve raw ids for dedupe and audit

---

##-Defaults-And-Fallback

### Defaults And Fallback

- Default sources:
  - none for delivery semantics
- Fallback or downgrade triggers:
  - duplicate delivery returns duplicate outcome without reprocessing
  - retry-required outcome does not downgrade to processed
- Caller visibility of downgrade:
  - final batch status must remain explicit and audit-visible

---

##-Return-And-Failure-Contract

### Return And Failure Contract

- Success shape:
  - batch status `processed`
- Empty or miss shape:
  - duplicate delivery returns `duplicate`
- Failure signaling:
  - `retry_required` when the batch must be retried
  - terminal item failures may produce `partial` plus dead-letter side effects
- Partial success semantics:
  - `partial` remains distinct from `processed` and `retry_required`

---

##-Side-Effects-And-Runtime

### Side Effects And Runtime

- State writes or mutations:
  - dedupe state for processed delivery / event ids
  - optional dead-letter writes for terminal item failures
- Resources to acquire and release:
  - worker ack handle
  - dedupe store client
- Concurrency, timeout, cancellation, retry, or idempotency notes:
  - ack happens only after the final batch outcome is known
  - retry-required path does not ack
  - dedupe writes must not make retry-required deliveries look processed

---

##-Boundary-And-Observability

### Boundary And Observability

- External protocol or serialization assumptions:
  - provider signature and delivery ids are authoritative boundary inputs
- Unit, timezone, precision, or encoding assumptions:
  - none outside provider payload decoding
- Logging, telemetry, or audit notes:
  - audit names for duplicate / processed / partial / retry_required remain stable

---

##-Validation-Plan

### Validation Plan

- Commands or tests to run:
  - Command: `pytest tests/test_webhook_worker.py -k process_webhook_delivery -v`
    Expected result: duplicate, partial, retry-required, and invalid-signature paths remain distinct
  - Command: `pytest tests/test_webhook_worker.py -k ack_semantics -v`
    Expected result: retry-required path does not ack; processed path does

- Manual checks to run:
  - verify audit events never label retry-required deliveries as processed

- Validation that cannot be run now:
  - Validation: provider replay behavior against the real queue integration
    Reason: external provider sandbox is not available in this local task

---

##-Open-Risks

### Open Risks

- Unknowns that could change behavior:
  - provider ordering guarantees may differ from historical assumptions
- Assumptions that allow continuation:
  - duplicate semantics are keyed by stable delivery and event ids
- Source-priority or exception decisions:
  - keep current queue ownership boundaries over a broader redesign
- Reasons to stop and ask instead of guessing:
  - none
```
