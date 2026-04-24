# Good Contract: Vue SSR and Hydration

This example demonstrates a well-formed pre-generation contract for a Vue component that renders on the server and performs client-only follow-up work after hydration.

---

## Pre-Generation Contract

### Scope

- **Target**: `src/components/PromoBanner.vue` - SSR-rendered banner component
- **Requested change**: Add persisted banner dismissal from browser storage without causing hydration mismatch
- **Allowed blast radius**: Only this component and its focused tests
- **Explicit non-goals**:
  - Do not change route-level data loading
  - Do not move state into a store
  - Do not introduce client-only rendering for the whole component

---

### Selected Scenario Packs

- **Pack A: Input And Branching** ✅ Selected
  - Why: Component consumes server-provided props and browser-only dismissal state
  - Specific risks:
    - distinguishing server props from client-only overrides
    - malformed persisted dismissal value

- **Pack B: Fallback And Contract** ✅ Selected
  - Why: Needs stable SSR output before client hydration
  - Specific risks:
    - server render vs hydrated client state
    - visible fallback behavior before mount

- **Pack C: Side Effect And Runtime** ✅ Selected
  - Why: Reads browser storage after mount and writes dismissal state
  - Specific risks:
    - client-only side effects
    - watcher or event cleanup ownership

- **Pack D: Boundary And Observability** ⚠️ Selected
  - Why: Crosses SSR and browser runtime boundary
  - Specific risks:
    - hydration mismatch
    - browser-only API access

---

### Input Contract

- **Accepted inputs**:
  - `message`: `string` - required banner content from server
  - `initiallyVisible`: `boolean` - server-render-safe default
  - `storageKey`: `string` - browser persistence key

- **Missing or empty handling**:
  - Empty `message`: render nothing and emit no client-only side effects
  - Empty `storageKey`: skip persistence and keep server-visible behavior

- **Unknown or invalid value strategy**:
  - Missing storage entry: keep server-provided `initiallyVisible`
  - Malformed storage value: ignore persisted value and keep server-provided state

- **Normalization or parsing rules**:
  - Accept only `"dismissed"` as the persisted hidden state

---

### Branching And Ordering

- **Decision points**:
  1. Render server output from props only
  2. After hydration, read browser storage
  3. If storage says dismissed, hide the banner on the client
  4. When the user dismisses, persist `"dismissed"`

- **Priority or ordering rules**:
  - Server render must not depend on browser globals
  - Client storage override applies only after mount
  - Empty message prevents both render and persistence work

- **Unknown enum or future value policy**:
  - Unknown persisted values are treated as invalid and ignored

---

### Defaults And Fallback

- **Default sources**:
  - Server props are authoritative before hydration
  - Browser storage may override only after client mount

- **Fallback or downgrade triggers**:
  - No browser storage available
  - invalid persisted value
  - hydration path without client APIs

- **Caller visibility of downgrade**:
  - SSR output remains stable
  - Dismissed state changes only after hydration when persistence is valid

---

### Return And Failure Contract

- **Success shape**:
  - Component renders a stable SSR-safe banner and may hide it after mount if persistence says it was dismissed

- **Empty or miss shape**:
  - If `message` is empty, component renders no banner

- **Failure signaling**:
  - Storage access failures do not throw from render path
  - Client-only persistence failures keep the banner visible state stable for the current render

- **Partial success semantics**:
  - The component may render correctly even when persistence is unavailable

---

### Side Effects And Runtime

- **State writes or mutations**:
  - Internal visible state
  - Browser storage write only when user dismisses

- **Resources to acquire and release**:
  - No long-lived external resources
  - Client-only lifecycle code is owned by `onMounted`

- **Concurrency, timeout, cancellation, retry, or idempotency notes**:
  - Repeated dismiss actions write the same persisted marker
  - No retry on storage failures

---

### Boundary And Observability

- **External protocol or serialization assumptions**:
  - Browser storage stores `"dismissed"` for hidden state

- **Unit, timezone, precision, or encoding assumptions**:
  - N/A

- **Logging, telemetry, or audit notes**:
  - Do not log directly from render path
  - Client-only diagnostics may use the repo's existing client logger if one exists

---

### Validation Plan

**Commands or tests to run:**

1. Type check:
   ```bash
   npm run typecheck
   ```

2. Component or hydration-focused tests:
   ```bash
   npm test -- PromoBanner
   ```

3. Build or SSR-safe compile check:
   ```bash
   npm run build
   ```

**Manual checks to run:**

- Verify server render does not touch `window` or `localStorage`
- Verify hydration does not produce visible mismatch warnings for normal persisted states

**Validation that cannot be run now:**

- Full SSR + browser hydration integration test in the app shell

---

### Open Risks

- **Unknowns that could change behavior**:
  - The repo may already provide a framework-specific client persistence helper

- **Reasons to stop and ask instead of guessing**:
  - If SSR data loading is owned by a framework hook that must also carry dismissal state
