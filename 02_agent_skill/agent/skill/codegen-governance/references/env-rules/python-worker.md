# Environment Rules: Python Workers and Async Jobs

Use this file for Python worker, queue, scheduler, or async job code.

---

## Typical Triggers

Read this file when the task involves:

- background jobs
- retry or dead-letter behavior
- queue message acknowledgement
- async task execution
- job idempotency or deduplication

---

## Runtime Guidance

[FATAL] Be explicit about who owns retry count, backoff, timeout, and dead-letter behavior.

[FATAL] Do not mix blocking code into async worker paths without an explicit boundary.

[WARN] Distinguish between:

- job-level validation
- transport-level acknowledgement
- side effects that may partially succeed
- idempotent replay vs duplicate execution

[WARN] If the worker framework already owns retry or acknowledgement semantics, do not re-implement them locally unless the task explicitly requires it.

---

## Validation Hints

Typical repo-aware validation candidates:

- focused worker tests
- retry-budget tests
- idempotency or duplicate-delivery tests
- queue integration tests if the repo already exposes them
