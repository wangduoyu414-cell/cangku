# Good Contract: Vue Component

This example demonstrates a well-formed pre-generation contract for a Vue 3 component implementation.

---

## Pre-Generation Contract

### Scope

- **Target**: `src/components/UserProfile.vue` — UserProfile component
- **Requested change**: Add loading and error states, proper prop validation
- **Allowed blast radius**: Only this component
- **Explicit non-goals**:
  - Do not add Pinia store integration
  - Do not add router integration
  - Do not change parent component

---

### Selected Scenario Packs

- **Pack A: Input And Branching** ✅ Selected
  - Why: Component receives props as input
  - Specific risks:
    - Props type validation
    - Props mutation prevention
    - Missing props handling

- **Pack B: Fallback And Contract** ✅ Selected
  - Why: Component has loading/error/empty states
  - Specific risks:
    - Loading state handling
    - Error state display
    - Empty user handling

- **Pack C: Side Effect And Runtime** ✅ Selected
  - Why: Component fetches data on mount
  - Specific risks:
    - Async data loading
    - Memory cleanup on unmount
    - Abort in-flight requests

- **Pack D: Boundary And Observability** ⚠️ Not selected
  - Reason: No external protocol, time handling, or logging required

---

### Input Contract

- **Accepted inputs**:
  - `userId`: `string` (required) — non-empty user ID
  - `initialName`: `string` (optional) — initial display name
  - `compact`: `boolean` (optional) — compact display mode

- **Missing or empty handling**:
  - `userId` is undefined: Show error "User ID is required"
  - `userId` is empty: Show error "User ID cannot be empty"
  - `initialName` is undefined: Use "Loading..."
  - `compact` is undefined: Default to `false`

- **Unknown or invalid value strategy**:
  - Invalid userId format: Show validation error
  - Props validation using TypeScript types only (runtime validation optional)

- **Normalization or parsing rules**: None required

---

### Branching And Ordering

- **Decision points**:
  1. Validate userId prop → show error if invalid
  2. Check loading state → show skeleton
  3. Check error state → show error message
  4. Check user exists → show user info or empty state
  5. Render in compact/full mode

- **Priority or ordering rules**:
  - Error state takes precedence over loading
  - Empty state takes precedence over user display
  - Compact mode affects layout only

- **Unknown enum or future value policy**: N/A

---

### Defaults And Fallback

- **Default sources**:
  - `compact`: `false`
  - `initialName`: `"Loading..."`

- **Fallback or downgrade triggers**:
  - User not found: Show "User not found" message
  - Fetch error: Show error with retry button
  - Network offline: Show offline message

- **Caller visibility of downgrade**:
  - Error state is observable via UI
  - Parent can listen to error event

---

### Return And Failure Contract

**Events emitted:**
- `error`: `{ message: string; code?: string }` — when fetch fails
- `loaded`: `{ userId: string }` — when user loads successfully
- `retry`: `{ userId: string }` — when user clicks retry

**Component State (internal):**
```typescript
interface ComponentState {
  loading: boolean
  error: string | null
  user: User | null
}
```

---

### Side Effects And Runtime

- **State writes or mutations**:
  - `user` ref: Internal state, derived from fetch
  - Props are NOT mutated

- **Resources to acquire and release**:
  - API call: Use AbortController, abort on unmount
  - No other resources

- **Concurrency, timeout, cancellation, retry, or idempotency notes**:
  - Auto-fetch on mount with userId
  - Abort in-flight request on unmount
  - Manual retry via button click
  - Retry does not auto-retry on error

---

### Boundary And Observability

- **External protocol or serialization assumptions**: N/A
- **Unit, timezone, precision, or encoding assumptions**: N/A
- **Logging, telemetry, or audit notes**:
  - Emit error event for parent to handle logging
  - No direct console logging

---

### Validation Plan

**Commands or tests to run:**

1. Type check:
   ```bash
   vue-tsc --noEmit src/components/UserProfile.vue
   ```

2. Lint:
   ```bash
   eslint src/components/UserProfile.vue
   ```

3. Unit tests:
   ```bash
   vitest run src/components/UserProfile.test.ts
   ```

4. Build check:
   ```bash
   vite build
   ```

**Manual checks to run:**

- Verify props are not mutated
- Verify cleanup on unmount
- Verify error boundary works

**Validation that cannot be run now:**

- E2E test with real API
- Accessibility audit

---

### Open Risks

- **Unknowns that could change behavior**: None
- **Reasons to stop and ask instead of guessing**: None

---

## Implementation Notes

### Props and Emits

```vue
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  userId: string
  initialName?: string
  compact?: boolean
}

interface Emits {
  (e: 'error', payload: { message: string; code?: string }): void
  (e: 'loaded', payload: { userId: string }): void
  (e: 'retry', payload: { userId: string }): void
}

const props = withDefaults(defineProps<Props>(), {
  initialName: 'Loading...',
  compact: false,
})

const emit = defineEmits<Emits>()
</script>
```

### Key Implementation Rules

1. **Never mutate props**:
   ```typescript
   // WRONG
   props.userId = '123'

   // CORRECT — use local state
   const localUserId = ref(props.userId)
   ```

2. **Always clean up**:
   ```typescript
   let abortController: AbortController | null = null

   onUnmounted(() => {
     abortController?.abort()
   })
   ```

3. **Use computed for derived state**:
   ```typescript
   const displayName = computed(() => {
     if (props.initialName) return props.initialName
     if (user.value) return user.value.name
     return 'Unknown'
   })
   ```
