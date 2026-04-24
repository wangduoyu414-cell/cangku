# TypeScript And JavaScript Edge Rules

Treat these as code edges:

- `import ... from "x"`
- `export ... from "x"`
- `require("x")`
- `import("x")`

Default handling:

- Resolve relative specifiers to repository files when possible.
- Resolve `tsconfig.json` `baseUrl` / `paths` aliases when the repository provides direct alias mappings.
- Keep package imports as external module targets.
- Mark dynamic `import()` edges as `dynamic` when the argument is not a string literal.
- Treat barrel files and `index.*` files as valid module targets when file resolution lands on a directory.

Known blind spots:

- `tsconfig` path aliases that depend on unsupported transforms or non-standard resolver plugins
- framework-specific virtual modules
- runtime plugin registration
