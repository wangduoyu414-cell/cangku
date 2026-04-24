# Environment Rules: Vue

Use this file when the task depends on application runtime details beyond core Vue semantics.

---

## Typical Triggers

Read this file when the task involves:

- router-driven state changes
- shared state or store integration
- SSR, hydration, or framework-managed async data
- component tests or end-to-end tests
- build and typecheck toolchains for Vue apps

High-frequency specializations:

- [vue-router-store.md](./vue-router-store.md) for route-driven navigation and shared store ownership
- [vue-ssr-hydration.md](./vue-ssr-hydration.md) for SSR, hydration, and async render boundaries

---

## Runtime Guidance

[WARN] Distinguish whether the component runs in:

- client-only rendering
- SSR or hydration
- router-owned navigation flow
- store-owned shared state flow

[FATAL] Do not assume async setup, router state, or store state ownership unless the repo already makes that environment explicit.

[WARN] For UI tasks, be explicit about who owns loading state, error state, and cleanup.

[WARN] Prefer repo-native commands such as `vue-tsc`, package test scripts, or browser test tooling when the repo already exposes them.

---

## Validation Hints

Typical repo-aware validation candidates:

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `vue-tsc --noEmit`
- `vitest run`
- `playwright test`

Use only commands that actually exist in the current repo.
