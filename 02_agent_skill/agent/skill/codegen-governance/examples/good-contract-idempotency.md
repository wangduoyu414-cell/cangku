# Good Contract: Cache-Backed Idempotency

This example demonstrates a well-formed pre-generation contract for duplicate suppression and replay behavior.

---

## Pre-Generation Contract

### Scope

- **Target**: `src/services/payment_submit.go` — `SubmitPayment`
- **Requested change**: Add idempotency-key duplicate suppression and cached replay result handling
- **Allowed blast radius**: Submit path, in-memory replay store abstraction, and unit tests
- **Explicit non-goals**:
  - Do not add distributed locking
  - Do not change downstream payment gateway schema
  - Do not redesign the HTTP handler layer

---

### Selected Scenario Packs

- **Pack B: Fallback And Contract** ✅ Selected
  - Why: Fresh success, duplicate replay, and terminal failure must stay distinguishable

- **Pack C: Side Effect And Runtime** ✅ Selected
  - Why: Idempotency storage, replay state, and duplicate suppression are runtime behaviors with side effects

---

### Input Contract

- `idempotencyKey`: non-empty string scoped to merchant + operation
- `request`: structured payment request with validated amount and currency
- `store`: replay store supporting get and put

Missing or empty idempotency key is rejected. Unknown replay store errors are surfaced as failures, not treated as duplicate hits.

---

### Return And Failure Contract

- **Fresh success**: `status="submitted"` with new gateway transaction id
- **Duplicate replay**: `status="replayed"` with prior transaction id and replay metadata
- **Failure before store write**: `status="failed"` and no replay record written
- **Failure after store write is impossible by contract**: store write occurs only after downstream success is known

---

### Side Effects And Runtime

- Replay store key is `merchantId + operation + idempotencyKey`
- Replay entry is written only after confirmed downstream success
- Duplicate requests do not call downstream gateway again
- Replay result stays visible to the caller through explicit `status="replayed"`

---

### Validation Plan

- `go test ./... -run TestSubmitPayment`
- Manual check: verify replay path does not emit a second gateway submission event
