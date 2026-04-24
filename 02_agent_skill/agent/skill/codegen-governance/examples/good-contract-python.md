# Good Contract: Python Function

```md
##-Contract-Metadata

<!-- generated_at: 2026-04-19T00:00:00Z -->
<!-- task_mode: patch-safe -->
<!-- continuation_mode: continue -->
<!-- contract_depth: standard -->
<!-- stop_before_code: false -->

---

##-Target-Language

### Target Language

- Language: Python
- Language version assumptions (if any): current repo runtime and typing rules apply

---

##-Scope

### Scope

- Target: `src/services/user_service.py` — `get_user_by_email`
- Requested change: reject `None` and empty email inputs explicitly without changing the success / miss contract
- Allowed blast radius: this function and direct tests only
- Explicit non-goals:
  - do not change database query logic
  - do not add caching
  - do not redesign the service layer
- Change mode: edit_existing
- Existing contract snapshot: returns a `User` or `None`; invalid input behavior is currently ambiguous
- Expected contract drift: None
- Repo constraints that override generic guidance: preserve current return shape and exception families already used by the service layer

---

##-Selected-Scenario-Packs

### Selected Scenario Packs

- Pack: A
  Why it applies: input validation and falsey handling are the main risk
  Specific risks from this pack that are relevant: `None` vs empty string, whitespace-only email, invalid type

- Pack: B
  Why it applies: caller-visible distinction between not-found and invalid input must remain stable
  Specific risks from this pack that are relevant: `None` as empty result vs `ValueError` for invalid input

<!-- - Pack: C -->
<!--   Reason: read-only query path; no new side-effect scope is introduced -->
<!-- - Pack: D -->
<!--   Reason: no protocol mapping, timezone, money, or audit boundary change -->

---

##-Input-Contract

### Input Contract

- Accepted inputs:
  - `email: str`
- Missing or empty handling:
  - `None` rejects with `ValueError`
  - empty string rejects with `ValueError`
  - whitespace-only strings are stripped and then rejected if empty
- Unknown or invalid value strategy:
  - non-string values reject with `TypeError`
- Normalization or parsing rules:
  - email is stripped before validation

---

##-Return-And-Failure-Contract

### Return And Failure Contract

- Success shape: `User`
- Empty or miss shape: `None` only when no user exists for a valid email
- Failure signaling:
  - `ValueError` for invalid email input
  - `TypeError` for non-string input
- Partial success semantics: none

---

##-Validation-Plan

### Validation Plan

- Commands or tests to run:
  - Command: `pytest tests/test_user_service.py -k get_user_by_email -v`
    Expected result: valid lookup, not-found, `None`, and empty-string cases remain distinct
  - Command: `python -m py_compile src/services/user_service.py`
    Expected result: module still compiles cleanly

- Manual checks to run:
  - verify error messages do not leak internal query details

- Validation that cannot be run now:
  - Validation: integration test with the real database
    Reason: test database credentials are not available in this local evaluation context
```
