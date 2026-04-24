# Environment Rules: TypeScript Browser Runtime and DOM Boundaries

Use this file for TypeScript or JavaScript code that runs in the browser or depends on DOM APIs.

---

## Typical Triggers

Read this file when the task involves:

- DOM queries or mutations
- browser-only globals such as `window`, `document`, or `localStorage`
- event listeners and cleanup
- fetch calls in browser components or utilities
- hydration-sensitive UI state

---

## Runtime Guidance

[FATAL] Do not assume browser globals exist in SSR, test, or Node paths unless the repo explicitly guarantees a client-only boundary.

[FATAL] Be explicit about listener ownership and cleanup. Do not hide event subscription side effects.

[WARN] Distinguish clearly between:

- browser-only behavior
- SSR-safe or universal behavior
- DOM-owned state
- application-owned state mirrored into the DOM

[WARN] If the repo already centralizes DOM or storage access in helpers, prefer reusing those helpers over introducing a second access pattern in a patch-safe task.

[WARN] For `localStorage`, query-string, or DOM-derived defaults, document whether the value is authoritative, advisory, or only a fallback.

---

## Validation Hints

Typical repo-aware validation candidates:

- repo-native typecheck and lint scripts
- focused browser or component tests
- E2E tests only when the repo already exposes them
- SSR or hydration checks when the repo supports them
