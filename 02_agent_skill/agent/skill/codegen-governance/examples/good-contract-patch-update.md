# Good Contract: Patch Update Semantics

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

- Language: TypeScript
- Language version assumptions (if any): existing PATCH handler types stay in place

---

##-Scope

### Scope

- Target: `src/services/profile_service.ts` — `applyProfilePatch`
- Requested change: distinguish field absence, explicit `null` clear, and invalid empty-string values
- Allowed blast radius: patch merge function and its direct tests only
- Explicit non-goals:
  - do not change persistence schema
  - do not add new patch operations
  - do not rewrite unrelated profile model code
- Change mode: edit_existing
- Existing contract snapshot: missing fields currently retain prior value, but null/empty-string semantics are inconsistent
- Expected contract drift: None
- Repo constraints that override generic guidance: preserve existing PATCH payload shape

---

##-Selected-Scenario-Packs

### Selected Scenario Packs

- Pack: A
  Why it applies: field presence and patch payload shape drive the branch behavior
  Specific risks from this pack that are relevant: absent key vs explicit `null`, falsey booleans, empty string rejection

- Pack: B
  Why it applies: retain / clear / replace behavior is a caller-visible contract
  Specific risks from this pack that are relevant: silent fallback to previous value, inconsistent result summary

<!-- - Pack: C -->
<!--   Reason: no cache, retry, persistence write, or resource lifecycle change in scope -->
<!-- - Pack: D -->
<!--   Reason: no external protocol or observability boundary change in scope -->

---

##-Input-Contract

### Input Contract

- Accepted inputs:
  - `currentProfile`
  - `patch`
- Missing or empty handling:
  - missing field retains old value
  - `displayName: null` clears the field
  - `displayName: ""` rejects as invalid
  - `marketingOptIn: false` is a valid explicit update
- Unknown or invalid value strategy:
  - unknown keys reject with `ValidationError`
  - nullable policy is field-specific and explicit
- Normalization or parsing rules:
  - trim string inputs before final validation

---

##-Branching-And-Ordering

### Branching And Ordering

- Decision points:
  - resolve field presence before value validation
  - validate nullable vs non-nullable rules per field
  - produce merged object and explicit change summary from the resolved intent

---

##-Defaults-And-Fallback

### Defaults And Fallback

- Default sources:
  - none for business fields
- Fallback or downgrade triggers:
  - invalid explicit values do not silently downgrade to retain-old-value
- Caller visibility of downgrade:
  - invalid input rejects loudly; missing remains explicit retain behavior

---

##-Return-And-Failure-Contract

### Return And Failure Contract

- Success shape:
  - merged profile
  - `changeSummary` with retained / cleared / replaced fields
- Empty or miss shape: none
- Failure signaling:
  - `ValidationError` with field-specific reason
- Partial success semantics:
  - none; patch is accepted or rejected as a whole

---

##-Validation-Plan

### Validation Plan

- Commands or tests to run:
  - Command: `pnpm test apply-profile-patch.spec.ts`
    Expected result: field absence, explicit null, false boolean, and invalid empty string cases stay distinct
  - Command: `pnpm lint src/services/profile_service.ts`
    Expected result: patch implementation stays repo-conformant

- Manual checks to run:
  - verify API docs still describe missing vs clear semantics consistently

- Validation that cannot be run now:
  - Validation: consumer compatibility test across downstream services
    Reason: downstream integration environment is not available in this local task
```
