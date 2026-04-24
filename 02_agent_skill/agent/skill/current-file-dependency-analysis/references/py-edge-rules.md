# Python Edge Rules

Treat these as code edges:

- `import package`
- `import package.module`
- `from package import name`
- `from .module import name`

Default handling:

- Resolve repository-local modules to files when possible.
- Keep third-party imports as external module targets.
- When `from x import y` could mean either a symbol or a submodule, prefer the submodule only if a matching file exists.
- Mark ambiguous relative imports as low confidence instead of inventing a target.

Known blind spots:

- runtime imports via `importlib`
- plugin discovery through entry points
- framework magic that injects modules indirectly
