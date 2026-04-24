# Good Contract: TypeScript Function

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
- Language version assumptions (if any): existing repo TypeScript config applies

---

##-Scope

### Scope

- Target: `src/services/userService.ts` — `fetchUserById`
- Requested change: add explicit timeout, abort, and typed error handling around the existing fetch path
- Allowed blast radius: this function and its local tests only
- Explicit non-goals:
  - do not add caching
  - do not change the `User` shape
  - do not rewrite the API client abstraction
- Change mode: edit_existing
- Existing contract snapshot: returns `User | null`; network and timeout failures are currently under-specified
- Expected contract drift: None
- Repo constraints that override generic guidance: preserve current exported function name and return type

---

##-Selected-Scenario-Packs

### Selected Scenario Packs

- Pack: A
  Why it applies: input normalization and branch ordering determine whether the fetch can proceed
  Specific risks from this pack that are relevant: empty id, whitespace-only id, abort signal handling

- Pack: B
  Why it applies: not-found, timeout, network failure, and invalid input must remain caller-visible and distinct
  Specific risks from this pack that are relevant: `null` vs thrown error, timeout vs generic network failure

- Pack: C
  Why it applies: async runtime behavior and cancellation semantics are part of the patch
  Specific risks from this pack that are relevant: timeout cleanup, abort propagation, promise rejection surface

<!-- - Pack: D -->
<!--   Reason: no protocol remapping, money/time precision, or audit boundary change in scope -->

---

##-Input-Contract

### Input Contract

- Accepted inputs:
  - `id: string`
  - `options?: { timeout?: number; signal?: AbortSignal }`
- Missing or empty handling:
  - empty or whitespace-only `id` rejects with `ValidationError`
  - missing `options` uses repo-default fetch behavior
- Unknown or invalid value strategy:
  - non-string `id` is rejected
  - negative or zero timeout is rejected
- Normalization or parsing rules:
  - trim `id` before building the URL

---

##-Branching-And-Ordering

### Branching And Ordering

- Decision points:
  - validate and normalize `id`
  - wire abort / timeout handling before the network call
  - map `404` to `null`
  - map timeout and network failures to distinct error types

---

##-Defaults-And-Fallback

### Defaults And Fallback

- Default sources:
  - repo-default timeout if `options.timeout` is absent
- Fallback or downgrade triggers:
  - `404` becomes `null`
  - timeout and transport failures do not downgrade to `null`
- Caller visibility of downgrade:
  - all downgrade paths remain explicit in the return / throw contract

---

##-Return-And-Failure-Contract

### Return And Failure Contract

- Success shape: `User`
- Empty or miss shape: `null` for user-not-found only
- Failure signaling:
  - `ValidationError` for invalid caller input
  - `TimeoutError` for timeout
  - `NetworkError` for transport failure
  - `ApiError` for non-404 upstream failures
- Partial success semantics: none

---

##-Side-Effects-And-Runtime

### Side Effects And Runtime

- State writes or mutations: none outside local timeout / abort lifecycle
- Resources to acquire and release:
  - timeout handle must always be cleared
  - any local abort wiring must be cleaned up
- Concurrency, timeout, cancellation, retry, or idempotency notes:
  - no retry is introduced in this patch

---

##-Validation-Plan

### Validation Plan

- Commands or tests to run:
  - Command: `npx tsc --noEmit`
    Expected result: updated function and tests type-check cleanly
  - Command: `npx vitest run src/services/userService.test.ts`
    Expected result: timeout, not-found, and invalid-input behavior stay covered

- Manual checks to run:
  - verify timeout does not leak timers

- Validation that cannot be run now:
  - Validation: real upstream timeout behavior under production latency
    Reason: local environment does not reproduce the partner network profile

---

##-Open-Risks

### Open Risks

- Unknowns that could change behavior:
  - existing callers may already rely on a generic error type
- Assumptions that allow continuation:
  - preserving `User | null` is the intended public contract
- Source-priority or exception decisions:
  - keep repo return shape over stronger greenfield redesign
- Reasons to stop and ask instead of guessing:
  - none
```
