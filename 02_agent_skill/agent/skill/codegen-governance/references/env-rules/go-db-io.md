# Environment Rules: Go DB and IO Boundaries

Use this file for Go database, file, or stream IO code.

---

## Typical Triggers

Read this file when the task involves:

- SQL queries or row iteration
- transaction handling
- file read or write lifecycle
- stream processing
- resource cleanup around DB or IO boundaries

---

## Runtime Guidance

[FATAL] Be explicit about who owns resource cleanup for rows, files, readers, writers, and transactions.

[FATAL] Do not hide partial-write or partial-read semantics behind vague success returns.

[WARN] Distinguish between:

- local function validation
- driver or storage-layer errors
- transaction rollback ownership
- retryable vs non-retryable IO failures

[WARN] In patch-safe tasks, preserve existing transaction and error-surface behavior unless the task explicitly authorizes a contract change.

---

## Validation Hints

Typical repo-aware validation candidates:

- focused repository or storage tests
- `go test ./...`
- integration tests if the repo already exposes them
- race-aware validation when shared state or caching is involved
