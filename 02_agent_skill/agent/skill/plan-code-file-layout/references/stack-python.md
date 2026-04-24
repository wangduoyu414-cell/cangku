# Stack: Python

Use this guide as a delta on top of the core and artifact rules.

## Bias

- Allow thicker modules than Java-style codebases.
- Prefer package clarity over aggressive file splitting.

## Keep Inline

- Local helpers
- Local data classes or typed dicts
- One-off validators and mappers

## Split When

- Pure logic and external side effects are getting tangled.
- A client, adapter, or persistence edge has clear independent tests.
- The package now exposes a stable API surface used from multiple places.

## Avoid

- One class per file by default
- Catch-all `utils.py` growth
- Over-abstracting small scripts into too many modules
