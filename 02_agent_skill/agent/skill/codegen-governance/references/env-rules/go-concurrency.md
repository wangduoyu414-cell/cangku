# Environment Rules: Go Concurrency Coordination

Use this file for Go code where correctness depends on goroutine coordination, shared state, or bounded concurrency behavior.

---

## Typical Triggers

Read this file when the task involves:

- goroutine fan-out or worker pools
- shared mutable state
- mutexes, channels, or wait groups
- cancellation or shutdown coordination
- local contention or lease/claim logic

---

## Runtime Guidance

[FATAL] Be explicit about ownership of shared state and the mechanism that protects it.

[FATAL] Do not introduce goroutines without a bounded exit path, cancellation rule, or ownership model.

[WARN] Distinguish clearly between:

- synchronization for safety
- ordering guarantees
- cancellation and shutdown guarantees
- duplicate suppression or lease ownership

[WARN] If a result depends on contention outcomes, document whether the contract is deterministic, best-effort, or first-wins.

[WARN] Prefer the repo's existing concurrency pattern when one already exists, especially in patch-safe tasks.

---

## Validation Hints

Typical repo-aware validation candidates:

- focused unit tests for contention or cancellation
- `go test ./...`
- `go test -race ./...`
- higher-level worker or coordination tests if the repo already provides them
