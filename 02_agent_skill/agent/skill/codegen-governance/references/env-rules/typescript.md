# Environment Rules: TypeScript and JavaScript

Use this file when the task depends on a specific TypeScript or JavaScript runtime, package boundary, or project toolchain.

---

## Typical Triggers

Read this file when the task involves:

- Node-only APIs or server runtime behavior
- browser APIs, DOM, or fetch semantics
- package scripts, build output, or typecheck tooling
- framework-specific test commands
- runtime validation at trust boundaries

High-frequency specializations:

- [typescript-api-client.md](./typescript-api-client.md) for HTTP and service-boundary clients
- [typescript-node-runtime.md](./typescript-node-runtime.md) for Node services, CLIs, and process-level code
- [typescript-browser-runtime.md](./typescript-browser-runtime.md) for browser-only APIs, DOM access, and event lifecycles

---

## Runtime Guidance

[WARN] Distinguish runtime assumptions clearly:

- Node service or CLI
- browser-only code
- shared library code
- test-only helper code

[FATAL] Do not assume a browser API exists in Node, or a Node API exists in the browser, unless the repo already makes that environment explicit.

[FATAL] If the task crosses a trust boundary, do not rely on compile-time types alone. Use real validation or document the existing repo boundary contract.

[WARN] Prefer repo-native package manager and scripts (`npm`, `pnpm`, `yarn`) over invented commands.

---

## Validation Hints

Typical repo-aware validation candidates:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `tsc --noEmit`
- `pnpm exec vitest run`
- `pnpm exec playwright test`
- `pnpm exec vue-tsc --noEmit`

Use only commands that actually exist in the current repo.
