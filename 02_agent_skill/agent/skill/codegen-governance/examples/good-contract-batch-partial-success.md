# Good Contract: Batch Partial Success

This example demonstrates a well-formed pre-generation contract for a batch function where items can succeed, fail, or be skipped independently.

---

## Pre-Generation Contract

### Scope

- **Target**: `src/services/order_batch.py` — `process_order_batch`
- **Requested change**: Return explicit per-item results and a stable batch summary while dead-lettering permanent failures
- **Allowed blast radius**: Batch processor and tests only
- **Explicit non-goals**:
  - Do not add distributed scheduling
  - Do not redesign the downstream order model
  - Do not change the caller transport

---

### Selected Scenario Packs

- **Pack A: Input And Branching** ✅ Selected
  - Why: Each item in the batch must be classified under explicit rules

- **Pack B: Fallback And Contract** ✅ Selected
  - Why: Whole success, partial success, retry-required, and terminal failure must remain distinct

- **Pack C: Side Effect And Runtime** ✅ Selected
  - Why: Permanent failures are written to dead-letter storage and batch progress is a side effect

---

### Input Contract

- `items`: non-empty list of batch items with stable identifiers
- `handler`: callable returning per-item success or raising typed errors
- `deadLetterStore`: append-only sink for permanent item failures

Invalid item shape fails item classification explicitly instead of being silently dropped.

---

### Return And Failure Contract

- **Whole success**: `status="processed"` with all items successful or skipped-as-duplicate
- **Partial success**: `status="partial"` with explicit `processed`, `failed`, `skipped`
- **Retry required**: `status="retry_required"` when a retryable processing error prevents reliable batch acknowledgement
- **Terminal failure**: explicit error only when the whole batch contract cannot be determined

---

### Side Effects And Runtime

- Permanent failures append one dead-letter record per failed item
- Retry-required batches do not append dead-letter entries for retryable failures
- Batch summary counts must match actual per-item outcomes

---

### Validation Plan

- `pytest tests/test_order_batch.py -v`
- Manual check: verify dead-letter count matches permanent failure count exactly
