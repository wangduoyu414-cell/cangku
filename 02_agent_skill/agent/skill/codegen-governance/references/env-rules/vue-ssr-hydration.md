# Environment Rules: Vue SSR and Hydration

Use this file for Vue code that runs during server-side rendering, hydration, or framework-managed async setup.

---

## Typical Triggers

Read this file when the task involves:

- SSR or hydration boundaries
- async setup during initial render
- server-only vs client-only branches
- browser-only APIs in components that may render on the server
- framework-managed data loading before hydration

---

## Runtime Guidance

[FATAL] Do not assume browser-only globals or DOM APIs are available during server render unless the repo's framework explicitly guarantees a client-only path.

[FATAL] Be explicit about whether async data is resolved before render, during hydration, or after mount. Do not silently move behavior between those phases.

[WARN] Distinguish clearly between:

- server-rendered state
- hydration-time reconciliation
- client-only follow-up behavior
- framework-owned async data vs component-owned async work

[WARN] If the repo already uses a framework-specific async data pattern, prefer that pattern over adding a second local loading model in a patch-safe task.

[WARN] When hydration mismatches are possible, document the risk instead of hiding it behind vague fallback behavior.

---

## Validation Hints

Typical repo-aware validation candidates:

- framework typecheck or build commands
- SSR or hydration integration tests if the repo already exposes them
- browser test tooling only when the repo already supports it
- repo-native lint and component test scripts
