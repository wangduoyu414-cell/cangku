# Go Edge Rules

Treat `import "path"` statements as package-level code edges.

Default handling:

- Resolve imports under the current module path to repository directories.
- Keep external imports as external module targets.
- Treat inbound edges to the current file as package-level approximations because Go imports packages, not individual files.
- Mark package-to-file conclusions as medium confidence unless a stronger signal exists.

Known blind spots:

- build tags that change active files
- code generation outputs not checked into the repository
- runtime registration patterns hidden behind init functions
