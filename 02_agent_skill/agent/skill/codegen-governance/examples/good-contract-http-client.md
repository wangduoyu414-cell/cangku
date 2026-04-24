# Good Contract: Outbound HTTP Client

This example demonstrates a well-formed pre-generation contract for a function that sends data to an external API.

---

## Pre-Generation Contract

### Scope

- **Target**: `src/integrations/billing_client.py` — `push_invoice_status`
- **Requested change**: Add request validation, timeout, retry policy, upstream status mapping, and audit logging
- **Allowed blast radius**: Client module and its tests only
- **Explicit non-goals**:
  - Do not change the caller workflow
  - Do not add background job infrastructure
  - Do not redesign the remote API schema

---

### Selected Scenario Packs

- **Pack A: Input And Branching** ✅ Selected
  - Why: Request payload, URL, headers, and invoice identifiers must be validated before the call

- **Pack B: Fallback And Contract** ✅ Selected
  - Why: Retry exhaustion, upstream rejection, and local validation must map to stable local outcomes

- **Pack C: Side Effect And Runtime** ✅ Selected
  - Why: The function performs network I/O with timeout and bounded retries

- **Pack D: Boundary And Observability** ✅ Selected
  - Why: HTTP status codes, response schema, and audit records are boundary semantics

---

### Input Contract

- `invoiceId`: non-empty string
- `targetUrl`: absolute HTTPS URL
- `payload`: JSON-serializable object with explicit required keys
- `timeoutSeconds`: optional positive number; default is `3`
- `maxRetries`: optional integer in range `0..2`; default is `1`

Invalid URL, invalid timeout, or non-serializable payload fails before any request attempt.

---

### Defaults And Fallback

- Defaults apply only when `timeoutSeconds` or `maxRetries` are absent
- Invalid explicit values are rejected, not replaced with defaults
- Retry exhaustion returns a stable local failure state instead of pretending the call succeeded

---

### Return And Failure Contract

- **Success**: `status="synced"` with remote request id
- **Retryable upstream failure after budget exhausted**: `status="retry_exhausted"`
- **Terminal upstream rejection**: `status="remote_rejected"`
- **Local validation failure**: raise `ValueError`
- **Response schema mismatch**: raise `RuntimeError`

---

### Side Effects And Runtime

- Performs at most `1 + maxRetries` HTTP attempts
- Retries only on timeout, `429`, `502`, `503`
- Never retries on `400`, `401`, `403`, `404`
- Writes one audit event per retry and one final audit event for success or terminal failure

---

### Boundary And Observability

- Request body is JSON with UTF-8 encoding
- Upstream `429` means rate limit and is retryable
- Audit log records request id, invoice id, attempt count, final outcome
- Authorization header value is never written to logs

---

### Validation Plan

- `pytest tests/test_billing_client.py -v`
- `ruff check src/integrations/billing_client.py`
- Manual check: verify failure audit omits token and full payload
