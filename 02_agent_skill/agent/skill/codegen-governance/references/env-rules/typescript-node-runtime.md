# Environment Rules: TypeScript Node Runtime

Use this file for TypeScript or JavaScript code that runs in Node services, CLIs, or background processes.

---

## Typical Triggers

Read this file when the task involves:

- filesystem access
- process environment variables
- timers, worker loops, or background jobs
- Node-only APIs
- package scripts or build output behavior

---

## Runtime Guidance

[FATAL] Do not assume browser globals in Node runtime code unless the repo explicitly polyfills them.

[FATAL] Be explicit about environment-variable parsing, default precedence, and process-level side effects.

[WARN] Distinguish between:

- CLI-only behavior
- service runtime behavior
- test-only utilities
- long-running process ownership of timers or listeners

[WARN] In patch-safe tasks, preserve the repo's package script and module-format conventions unless the task explicitly authorizes broader modernization.

---

## Validation Hints

Typical repo-aware validation candidates:

- repo-native typecheck and lint scripts
- focused CLI or service tests
- `node --check` for plain JavaScript targets
- smoke tests for config or env precedence if the repo already contains them
