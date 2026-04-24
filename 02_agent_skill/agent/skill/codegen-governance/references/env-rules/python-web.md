# Environment Rules: Python Web Handlers

Use this file for Python request or response handling code in web frameworks such as FastAPI, Flask, or Django-style views.

---

## Typical Triggers

Read this file when the task involves:

- HTTP request parsing or validation
- status-code or error-response mapping
- request-scoped dependencies
- JSON serialization or schema shaping
- framework-owned validation vs local validation boundaries

---

## Runtime Guidance

[FATAL] Be explicit about which layer owns request validation, authentication context, and response serialization.

[FATAL] Do not silently change status-code semantics, error shape, or field omission rules in a patch-safe task.

[WARN] Distinguish framework-owned behavior from function-owned behavior:

- request body parsing
- dependency injection
- exception-to-response mapping
- response model serialization

[WARN] If the framework already validates input, do not duplicate validation blindly. Document what the local function still validates itself.

---

## Validation Hints

Typical repo-aware validation candidates:

- focused request-handler tests
- response-shape tests
- framework route tests if the repo already exposes them

Use only commands and frameworks that the repo actually contains.
