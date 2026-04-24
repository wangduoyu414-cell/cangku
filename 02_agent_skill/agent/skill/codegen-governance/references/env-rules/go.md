# Environment Rules: Go

Use this file when the task depends on Go service runtime behavior, HTTP, database access, or concurrency environment details.

---

## Typical Triggers

Read this file when the task involves:

- HTTP handlers or clients
- request-scoped context behavior
- database or file IO
- concurrency coordination
- repo-native build, vet, or race validation

High-frequency specializations:

- [go-http.md](./go-http.md) for handlers, middleware, and outbound clients
- [go-db-io.md](./go-db-io.md) for repository, transaction, file, and stream code
- [go-concurrency.md](./go-concurrency.md) for goroutine, mutex, channel, and contention-heavy code

---

## Runtime Guidance

[FATAL] Be explicit about which layer owns cancellation, timeout, retries, and resource cleanup.

[WARN] Distinguish clearly between:

- library code
- HTTP handler or service code
- goroutine or worker code
- DB or IO boundary code

[WARN] Use caller-provided `context.Context` when the operation is request-scoped or cancelable.

[WARN] Prefer repo-native validation such as `go test`, `go vet`, `go build`, and race-aware checks when the repo already uses them.

---

## Validation Hints

Typical repo-aware validation candidates:

- `go test ./...`
- `go vet ./...`
- `go build ./...`
- `go test -race ./...`
- `golangci-lint run`
- `staticcheck ./...`

Use only commands that match the current module and repo setup.
