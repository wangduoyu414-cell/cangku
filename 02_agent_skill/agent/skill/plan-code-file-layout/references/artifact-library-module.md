# Artifact: Library Module

Use for reusable modules, internal libraries, and shared business logic packages.

## Default Boundary

Keep one cohesive public surface with private helpers nearby until the API or reuse surface grows.

## Split When

- Public API surface and internal helpers are both large enough to obscure each other.
- Multiple stable subdomains emerge inside the module.
- Platform-specific adapters or serialization details deserve isolation.

## Common Roles

- Public entry module
- Core logic module
- Adapter or codec module

## Avoid

- Turning every type or function into its own file.
- Creating a shared library before local duplication or API stability exists.
