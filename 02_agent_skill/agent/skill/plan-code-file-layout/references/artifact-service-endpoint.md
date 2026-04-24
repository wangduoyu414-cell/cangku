# Artifact: Service Endpoint

Use for HTTP handlers, RPC handlers, controller actions, and service-facing request flows.

## Default Boundary

Small endpoints may keep handler logic and light orchestration together when persistence and external IO are trivial.

## Split When

- Framework entry glue, business orchestration, and external IO are all present.
- Persistence, network clients, or serialization logic create separate failure modes.
- Contract validation or schema handling has independent test value.
- The route can stay as the visible orchestration file while external adapters take the real IO boundaries.

## Common Roles

- Handler or controller
- Use-case or service orchestration
- Repository or gateway
- Contract or schema definition

## Avoid

- One-off repositories that only wrap a single local query with no ownership benefit.
- Global service layers that just pass through controller parameters unchanged.
- Feature-local service files whose only extra value is moving a short route orchestration out of the handler while client and store files already hold the real boundaries.
- Route -> service -> client -> repository chains when the common endpoint path is still readable through route plus the real adapters.
