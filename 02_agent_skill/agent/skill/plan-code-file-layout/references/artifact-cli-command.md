# Artifact: CLI Command

Use for commands, maintenance tools, and operator-facing scripts.

## Default Boundary

Bias toward fewer files so the main flow is visible in one place.

## Split When

- External integrations or file-system effects deserve isolation.
- Parsing, validation, or transformation logic gains a real test boundary.
- The command shell and the core operation can be separated without hiding the main flow.

## Common Roles

- Command entrypoint
- Core operation
- External adapter

## Avoid

- Spreading a simple command across many modules.
- Abstracting command flags or small helpers into generic frameworks too early.
