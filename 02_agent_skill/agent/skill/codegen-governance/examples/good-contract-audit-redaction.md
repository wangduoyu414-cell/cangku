# Good Contract: Audit Redaction

This example demonstrates a well-formed pre-generation contract for masking sensitive data in audit output.

---

## Pre-Generation Contract

### Scope

- **Target**: `src/audit/mask_event.ts` — `buildAuditEvent`
- **Requested change**: Redact email, access token, and raw payload fragments while preserving request correlation fields
- **Allowed blast radius**: Audit builder and its tests only
- **Explicit non-goals**:
  - Do not redesign the global logging system
  - Do not add encryption or key management
  - Do not change unrelated event names

---

### Selected Scenario Packs

- **Pack C: Side Effect And Runtime** ✅ Selected
  - Why: Building and emitting audit events is an observable side effect

- **Pack D: Boundary And Observability** ✅ Selected
  - Why: Redaction rules and stable diagnostics are part of the external audit contract

---

### Input Contract

- `eventName`: stable string from a known set
- `requestId`: non-empty string
- `context`: object that may contain `email`, `token`, and raw payload snippets

Unknown context keys are allowed only if the redaction rule says they may be copied as-is.

---

### Return And Failure Contract

- **Success**: audit object with stable event name, request id, redacted contact fields, and masked sensitive fragments
- **Failure**: throw validation error if required stable identifiers are missing

---

### Boundary And Observability

- `email` is replaced with a masked form
- `token` is omitted entirely
- Raw payload body is not copied into the final audit event
- Success and failure paths apply the same redaction rules

---

### Validation Plan

- `pnpm test build-audit-event.spec.ts`
- Manual check: verify a failed request does not log more raw data than a successful request
