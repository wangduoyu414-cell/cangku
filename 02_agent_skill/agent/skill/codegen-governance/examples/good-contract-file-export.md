# Good Contract: File Export And Encoding

This example demonstrates a well-formed pre-generation contract for generating a CSV export file.

---

## Pre-Generation Contract

### Scope

- **Target**: `src/reports/exporter.go` — `WriteLedgerExport`
- **Requested change**: Validate output filename, write UTF-8 CSV with stable columns, and avoid partial-file ambiguity
- **Allowed blast radius**: Export function and tests only
- **Explicit non-goals**:
  - Do not add archive formats
  - Do not change calling workflow
  - Do not add remote storage uploads

---

### Selected Scenario Packs

- **Pack A: Input And Branching** ✅ Selected
  - Why: Filename, row shape, and column ordering are input semantics

- **Pack C: Side Effect And Runtime** ✅ Selected
  - Why: The function creates or overwrites a file and must manage cleanup on failure

- **Pack D: Boundary And Observability** ✅ Selected
  - Why: CSV delimiter, UTF-8 encoding, and exported value formatting are boundary semantics

---

### Input Contract

- `filename`: relative `.csv` filename without path traversal
- `rows`: validated list of export rows with fixed fields
- `baseDir`: writable directory already created by caller

Unknown columns, empty filename, wrong extension, or malformed rows are rejected before opening the file.

---

### Side Effects And Runtime

- Export writes to a temp file first, then replaces the final file after successful serialization
- Failed writes remove the temp file
- Audit event is appended only after final rename succeeds

---

### Boundary And Observability

- Output encoding is UTF-8
- Header order is stable and documented
- Money and timestamp fields use pre-normalized export strings, not host-locale formatting

---

### Validation Plan

- `go test ./... -run TestWriteLedgerExport`
- Manual check: verify a malformed row does not leave a final file behind
