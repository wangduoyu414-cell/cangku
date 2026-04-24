# Good Contract: Minimal TypeScript Micro-Edit

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

- Language: TypeScript
- Language version assumptions (if any): current repo compiler settings apply

---

##-Scope

### Scope

- Target: `src/ui/form.ts` — local `if` branch guarding an optional label
- Requested change: rename the checked variable inside one branch without changing behavior
- Allowed blast radius: one local branch and any directly touched type-check output only
- Explicit non-goals:
  - do not change return shape
  - do not change side effects
  - do not change public props or events
- Change mode: edit_existing
- Existing contract snapshot: branch keeps current UI behavior; this is a local readability fix
- Expected contract drift: None
- Repo constraints that override generic guidance: preserve emitted UI state exactly

---

##-Selected-Scenario-Packs

### Selected Scenario Packs

- Pack: A
  Why it applies: the edit stays inside one branch condition and must preserve existing branch behavior
  Specific risks from this pack that are relevant: avoid renaming the wrong variable or changing truthiness semantics

---

##-Input-Contract

### Input Contract

- Accepted inputs:
  - existing local variables already in scope
- Missing or empty handling:
  - none changed by this edit
- Unknown or invalid value strategy:
  - none introduced by this edit
- Normalization or parsing rules:
  - none

---

##-Return-And-Failure-Contract

### Return And Failure Contract

- Success shape: unchanged existing function / component output
- Empty or miss shape: unchanged
- Failure signaling: unchanged
- Partial success semantics: none
```
