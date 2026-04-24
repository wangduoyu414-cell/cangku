# Environment Rules: Vue Router and Shared State

Use this file for Vue components or composables whose behavior depends on route state, navigation, or shared store ownership.

---

## Typical Triggers

Read this file when the task involves:

- route params or query parsing
- navigation-driven state changes
- shared store reads or writes
- syncing component state with router or store state
- loading and error ownership across route transitions

---

## Runtime Guidance

[FATAL] Be explicit about whether state is owned by the route, the component, or the shared store. Do not silently move ownership across those boundaries in a patch-safe task.

[FATAL] Do not let route param parsing, query defaults, or store hydration silently change public UI behavior.

[WARN] Distinguish clearly between:

- route-derived state
- component-local state
- store-owned shared state
- navigation side effects such as redirects or route replacement

[WARN] If the repo already centralizes route parsing or store updates in composables or store actions, prefer extending that pattern over introducing a second ownership path.

[WARN] For loading and error states, document whether they reset on navigation, persist in shared state, or remain component-local.

---

## Validation Hints

Typical repo-aware validation candidates:

- component tests that mock route or store state
- router integration tests if the repo already exposes them
- shared-state tests for store actions or selectors
- repo-native typecheck, lint, and test scripts
