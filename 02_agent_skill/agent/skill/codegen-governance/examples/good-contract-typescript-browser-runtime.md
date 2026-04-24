# Good Contract: TypeScript Browser Runtime

This example demonstrates a well-formed pre-generation contract for browser-only TypeScript code that must stay safe across SSR, test, and client execution paths.

---

## Pre-Generation Contract

### Scope

- **Target**: `src/composables/useSidebarPreference.ts` - browser runtime helper
- **Requested change**: Persist sidebar open/closed state to `localStorage` and keep resize listener cleanup explicit
- **Allowed blast radius**: Only this composable and its focused test file
- **Explicit non-goals**:
  - Do not change server-rendered markup
  - Do not add global store integration
  - Do not introduce a new storage abstraction

---

### Selected Scenario Packs

- **Pack A: Input And Branching** ✅ Selected
  - Why: Reads persisted state and optional defaults
  - Specific risks:
    - invalid `localStorage` value handling
    - SSR-safe fallback when `window` is unavailable

- **Pack B: Fallback And Contract** ✅ Selected
  - Why: Browser value, caller default, and runtime fallback all interact
  - Specific risks:
    - distinction between missing preference and malformed preference
    - stable return semantics during SSR

- **Pack C: Side Effect And Runtime** ✅ Selected
  - Why: Registers a resize listener and writes to browser storage
  - Specific risks:
    - listener cleanup
    - storage write ownership

- **Pack D: Boundary And Observability** ⚠️ Selected
  - Why: Depends on DOM globals and browser storage
  - Specific risks:
    - `window` access in non-browser paths
    - localStorage read/write boundary

---

### Input Contract

- **Accepted inputs**:
  - `defaultOpen`: `boolean`
  - `storageKey`: `string` - non-empty key owned by this composable

- **Missing or empty handling**:
  - Empty `storageKey`: throw `ValidationError`
  - Missing browser globals during SSR or tests: return the caller default without touching storage

- **Unknown or invalid value strategy**:
  - Missing localStorage entry: use `defaultOpen`
  - Malformed localStorage value: ignore stored value and use `defaultOpen`
  - Unknown event payload: ignore, do not rewrite state

- **Normalization or parsing rules**:
  - Only accept `"open"` or `"closed"` from storage
  - Do not coerce arbitrary strings

---

### Branching And Ordering

- **Decision points**:
  1. Check whether browser globals exist
  2. Validate `storageKey`
  3. Read and parse persisted preference
  4. Register resize listener on mount
  5. Remove listener on cleanup

- **Priority or ordering rules**:
  - Environment check comes before any `window` or `localStorage` access
  - Invalid stored data falls back to caller default, not to an inferred boolean

- **Unknown enum or future value policy**:
  - Unknown stored string is treated as invalid, not as a new mode

---

### Defaults And Fallback

- **Default sources**:
  - Caller-provided `defaultOpen`
  - Browser storage only if it contains a recognized value

- **Fallback or downgrade triggers**:
  - SSR/test runtime without browser globals
  - malformed persisted value
  - storage access failure

- **Caller visibility of downgrade**:
  - Return shape is stable
  - No silent rewrite of malformed storage until caller explicitly changes state

---

### Return And Failure Contract

- **Success shape**:
  ```typescript
  {
    isOpen: Ref<boolean>;
    setOpen(next: boolean): void;
    cleanup(): void;
  }
  ```

- **Empty or miss shape**:
  - Not applicable; composable always returns the same shape

- **Failure signaling**:
  - Throw only for invalid `storageKey`
  - Browser storage read failures downgrade to caller default

- **Partial success semantics**:
  - Listener registration may be skipped in non-browser paths while the composable still returns a usable state object

---

### Side Effects And Runtime

- **State writes or mutations**:
  - Internal `Ref<boolean>` state
  - `localStorage.setItem(storageKey, ...)` only from `setOpen`

- **Resources to acquire and release**:
  - `window.addEventListener('resize', ...)`
  - cleanup removes the exact listener registered by this composable

- **Concurrency, timeout, cancellation, retry, or idempotency notes**:
  - Repeated `setOpen(true)` writes the same stable value
  - No retry on storage write failure

---

### Boundary And Observability

- **External protocol or serialization assumptions**:
  - Browser storage values are exact strings: `"open"` or `"closed"`

- **Unit, timezone, precision, or encoding assumptions**:
  - N/A

- **Logging, telemetry, or audit notes**:
  - No direct console logging in the composable
  - If the repo already has a browser diagnostics helper, errors may be routed through it

---

### Validation Plan

**Commands or tests to run:**

1. Type check:
   ```bash
   npm run typecheck
   ```

2. Lint:
   ```bash
   npm run lint
   ```

3. Focused browser or composable test:
   ```bash
   npm test -- useSidebarPreference
   ```

**Manual checks to run:**

- Verify SSR path does not touch `window`
- Verify resize listener is removed on cleanup

**Validation that cannot be run now:**

- Browser E2E test for real localStorage persistence

---

### Open Risks

- **Unknowns that could change behavior**:
  - The repo may already wrap localStorage access in a shared helper

- **Reasons to stop and ask instead of guessing**:
  - If the repo requires storage access through a shared abstraction instead of direct localStorage calls
