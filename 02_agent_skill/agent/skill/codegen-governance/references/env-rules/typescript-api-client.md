# Environment Rules: TypeScript API Clients

Use this file for TypeScript or JavaScript code that calls external APIs or internal HTTP services.

---

## Typical Triggers

Read this file when the task involves:

- request payload shaping
- status-code mapping
- retry or timeout behavior
- runtime validation of API responses
- partial failure or fallback behavior at network boundaries

---

## Runtime Guidance

[FATAL] Do not rely on compile-time types alone for untrusted API responses. Validate runtime shape or document the existing boundary contract.

[FATAL] Be explicit about timeout, retry, and status-code mapping semantics.

[WARN] Distinguish between:

- transport failure
- malformed response payload
- non-2xx status mapping
- domain-level empty or miss semantics

[WARN] If a shared client abstraction already exists in the repo, prefer extending it over introducing a new transport pattern in a patch-safe task.

---

## Validation Hints

Typical repo-aware validation candidates:

- focused client tests
- typecheck and lint scripts
- mock-response tests
- end-to-end API tests only if the repo already exposes them
