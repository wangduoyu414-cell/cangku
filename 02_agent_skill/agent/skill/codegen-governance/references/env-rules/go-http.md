# Environment Rules: Go HTTP

Use this file for Go HTTP handlers, middleware, or outbound HTTP clients.

---

## Typical Triggers

Read this file when the task involves:

- request decoding
- status-code mapping
- context propagation across HTTP boundaries
- request or response body lifecycle
- retries, timeouts, or outbound client behavior

---

## Runtime Guidance

[FATAL] Be explicit about which layer owns request validation, status-code mapping, and timeout behavior.

[FATAL] Close request or response bodies when the local function owns them.

[WARN] Distinguish between:

- handler-owned validation
- middleware-owned behavior
- transport-level retry and timeout behavior
- upstream status mapping vs local error semantics

[WARN] For outbound clients, be explicit about whether retries are safe for the operation and whether the repo already provides a shared client abstraction.

---

## Validation Hints

Typical repo-aware validation candidates:

- focused handler or client tests
- `go test ./...`
- `go test -race ./...`
- protocol-mapping tests when the repo already has them
