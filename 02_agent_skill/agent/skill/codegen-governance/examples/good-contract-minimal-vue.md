# Good Contract: Minimal Vue Micro-Edit

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

- Language: Vue
- Language version assumptions (if any): current app runtime and SFC tooling stay unchanged

---

##-Scope

### Scope

- Target: `src/components/UserBadge.vue` — one template / script branch controlling optional label rendering
- Requested change: rename the local flag used by the conditional render without changing props, emits, or rendered states
- Allowed blast radius: this component only
- Explicit non-goals:
  - do not change props or emits
  - do not change SSR / hydration behavior
  - do not add store, router, or watcher logic
- Change mode: edit_existing
- Existing contract snapshot: component rendering states are already stable
- Expected contract drift: None
- Repo constraints that override generic guidance: preserve existing rendered output and event behavior

---

##-Selected-Scenario-Packs

### Selected Scenario Packs

- Pack: A
  Why it applies: the patch stays inside one local branch that controls conditional rendering
  Specific risks from this pack that are relevant: accidentally changing truthiness or swapping the wrong local flag

---

##-Input-Contract

### Input Contract

- Accepted inputs:
  - existing component props remain unchanged
- Missing or empty handling:
  - unchanged
- Unknown or invalid value strategy:
  - unchanged
- Normalization or parsing rules:
  - none

---

##-Return-And-Failure-Contract

### Return And Failure Contract

- Success shape: unchanged rendered output for existing prop combinations
- Empty or miss shape: unchanged optional-label behavior
- Failure signaling: unchanged
- Partial success semantics: none

---

##-Validation-Plan

### Validation Plan

- Commands or tests to run:
  - Command: `pnpm test UserBadge`
    Expected result: conditional-render path stays unchanged for touched branch
```
