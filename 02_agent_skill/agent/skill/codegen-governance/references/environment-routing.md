# Environment Routing

Use this file when language-level rules are not enough to capture the task's actual runtime or framework risks.

---

## When To Read Environment Rules

After reading the base rules and language rules, load the relevant environment rule file when any of these are true:

- the task depends on a specific runtime or framework
- validation commands depend on framework tooling
- the main risk is at a boundary owned by an ecosystem, not by the language alone
- the language rules feel too generic for the task's actual execution environment

Examples:

- TypeScript HTTP client in a Node service
- Python web handler or async worker
- Go HTTP handler or DB-backed operation
- Vue app using router, state, SSR, or component tests

---

## Selection Guide

- TypeScript or JavaScript project details dominate -> read [env-rules/typescript.md](./env-rules/typescript.md)
- Python framework, packaging, or async environment dominates -> read [env-rules/python.md](./env-rules/python.md)
- Go service, HTTP, database, or concurrency environment dominates -> read [env-rules/go.md](./env-rules/go.md)
- Vue application runtime or framework details dominate -> read [env-rules/vue.md](./env-rules/vue.md)

Then downshift into a higher-frequency specialization when one clearly matches:

- Python web handler or API route -> [env-rules/python-web.md](./env-rules/python-web.md)
- Python worker, queue, or async job -> [env-rules/python-worker.md](./env-rules/python-worker.md)
- Go HTTP handler or client -> [env-rules/go-http.md](./env-rules/go-http.md)
- Go database or IO boundary -> [env-rules/go-db-io.md](./env-rules/go-db-io.md)
- TypeScript API client or network boundary -> [env-rules/typescript-api-client.md](./env-rules/typescript-api-client.md)
- TypeScript Node runtime, CLI, or service process -> [env-rules/typescript-node-runtime.md](./env-rules/typescript-node-runtime.md)
- Vue router or shared-store ownership -> [env-rules/vue-router-store.md](./env-rules/vue-router-store.md)
- Vue SSR or hydration boundary -> [env-rules/vue-ssr-hydration.md](./env-rules/vue-ssr-hydration.md)
- Python CLI, scripts, or config precedence -> [env-rules/python-cli-config.md](./env-rules/python-cli-config.md)
- Go goroutine, mutex, or channel coordination -> [env-rules/go-concurrency.md](./env-rules/go-concurrency.md)
- TypeScript browser runtime or DOM boundary -> [env-rules/typescript-browser-runtime.md](./env-rules/typescript-browser-runtime.md)

---

## Scope Rule

Environment rules are still constrained by the same principle as the rest of the skill:

- enforce high-cost runtime mistakes
- keep style and ideal-state preferences non-blocking
- do not widen blast radius in `patch-safe` tasks

For maintainers, use [environment-coverage-index.md](./environment-coverage-index.md) to map each environment rule to the closest existing examples and runnable fixtures.
