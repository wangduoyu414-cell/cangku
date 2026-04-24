# Good Contract: Minimal Go Micro-Edit

```md
##-Contract-Metadata

<!-- generated_at: 2026-04-19T00:00:00Z -->
<!-- task_mode: patch-safe -->
<!-- continuation_mode: continue -->
<!-- contract_depth: minimal -->
<!-- stop_before_code: false -->

---

##-Target-Language

### Target Language

- Language: Go
- Language version assumptions (if any): current module and toolchain stay unchanged

---

##-Scope

### Scope

- Target: `internal/summary/format.go` — one local conditional in `formatSummary`
- Requested change: rename the checked local variable and keep the same branch outcome
- Allowed blast radius: single function body only
- Explicit non-goals:
  - do not change exported symbols
  - do not change formatting output
  - do not introduce logging or resource handling
- Change mode: edit_existing
- Existing contract snapshot: function output and error behavior are already stable
- Expected contract drift: None
- Repo constraints that override generic guidance: preserve current formatting semantics exactly

---

##-Selected-Scenario-Packs

### Selected Scenario Packs

- Pack: A
  Why it applies: the edit touches a conditional branch and must preserve branch meaning
  Specific risks from this pack that are relevant: renaming the wrong local and changing the branch condition

---

##-Input-Contract

### Input Contract

- Accepted inputs:
  - existing function parameters and locals remain unchanged
- Missing or empty handling:
  - unchanged
- Unknown or invalid value strategy:
  - unchanged
- Normalization or parsing rules:
  - none

---

##-Return-And-Failure-Contract

### Return And Failure Contract

- Success shape: unchanged existing string / error result
- Empty or miss shape: unchanged
- Failure signaling: unchanged
- Partial success semantics: none

---

##-Validation-Plan

### Validation Plan

- Commands or tests to run:
  - Command: `go test ./internal/summary/...`
    Expected result: touched formatter path still matches existing behavior
```
