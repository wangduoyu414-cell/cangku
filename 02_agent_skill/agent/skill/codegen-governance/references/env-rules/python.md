# Environment Rules: Python

Use this file when the task depends on a Python framework, async runtime, packaging setup, or repo toolchain.

---

## Typical Triggers

Read this file when the task involves:

- web handlers or API routes
- async workers or queues
- package or environment management
- typed Python validation workflows
- repo-specific lint, typecheck, or test tooling

High-frequency specializations:

- [python-web.md](./python-web.md) for request or response handlers
- [python-worker.md](./python-worker.md) for workers, queues, and async jobs
- [python-cli-config.md](./python-cli-config.md) for CLI argument parsing and config precedence

---

## Runtime Guidance

[WARN] Distinguish whether the code runs in:

- synchronous application code
- async application code
- web framework request handling
- worker or batch processing
- CLI or script execution

[FATAL] Do not mix blocking calls into async paths without an explicit boundary.

[WARN] Respect the repo's actual environment manager and test stack. Do not invent `pytest`, `ruff`, `mypy`, `uv`, `poetry`, `tox`, or `nox` usage if the repo does not expose them.

[WARN] For web or worker code, be explicit about whether validation, retry, timeout, and serialization are owned by the framework or by the local function.

---

## Validation Hints

Typical repo-aware validation candidates:

- `python -m py_compile ...`
- `python -m pytest -q`
- `ruff check ...`
- `mypy ...`
- `uv run ...`
- `poetry run ...`
- `tox -q`
- `nox`

Use only commands the repo actually supports.
