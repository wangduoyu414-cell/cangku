# Good Contract: Time, Money, And Precision

This example demonstrates a well-formed pre-generation contract for a function that normalizes timestamps and money-like values.

---

## Pre-Generation Contract

### Scope

- **Target**: `src/services/settlement_formatter.py` — `format_settlement_row`
- **Requested change**: Normalize `settled_at` to UTC and convert integer cents into a fixed two-decimal export string
- **Allowed blast radius**: Only this formatter and its tests
- **Explicit non-goals**:
  - Do not redesign the settlement data model
  - Do not introduce locale-aware display formatting
  - Do not change persistence precision

---

### Selected Scenario Packs

- **Pack A: Input And Branching** ✅ Selected
  - Why: The formatter accepts raw timestamp and integer amount inputs that require explicit parsing

- **Pack D: Boundary And Observability** ✅ Selected
  - Why: UTC conversion, precision rules, and export formatting are boundary semantics

---

### Input Contract

- `settled_at`: ISO 8601 string with timezone
- `amount_cents`: integer minor-unit amount
- `currency`: uppercase ISO code

Naive timestamps are rejected. Float inputs are rejected. Negative amounts are allowed only when the business rule explicitly marks them as refunds.

---

### Return And Failure Contract

- **Success**:
  - `settled_at_utc`: ISO 8601 UTC string ending with `Z`
  - `amount`: string with exactly two decimal places
- **Failure**:
  - `ValueError` for naive timestamps, invalid currency codes, or non-integer amount inputs

---

### Boundary And Observability

- UTC is the canonical export timezone
- Money precision is fixed to two decimal places from integer minor units
- No host locale or floating-point formatting is used

---

### Validation Plan

- `pytest tests/test_settlement_formatter.py -v`
- Manual check: verify a negative refund amount stays negative after formatting
