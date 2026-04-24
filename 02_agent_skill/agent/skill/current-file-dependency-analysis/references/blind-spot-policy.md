# Blind Spot Policy

Mark a relationship as unresolved or low confidence instead of guessing when any of the following apply:

- Dynamic imports or reflection drive wiring.
- Alias resolution depends on framework-specific rules you cannot verify.
- Code generation produces files that are not present in the repository.
- The repository mixes multiple stacks and the current file sits at the boundary.
- The available evidence only shows mentions, not actionable dependency edges.

Prefer these labels:

- `resolved`: evidence maps cleanly to a file or module target.
- `dynamic`: runtime behavior likely exists, but the target is not statically known.
- `unresolved`: the workflow could not verify the edge with the available evidence.

When a major conclusion depends on one of these areas, surface the blind spot in the final explanation.
