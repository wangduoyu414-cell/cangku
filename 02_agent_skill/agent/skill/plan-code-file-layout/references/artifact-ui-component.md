# Artifact: UI Component

Use for pages, feature views, reusable components, and local UI state.

## Default Boundary

Keep view markup, simple local state, and local event handling close together.

## Split When

- Async data access or remote mutations dominate the logic.
- State logic becomes reusable across multiple components.
- One file mixes container concerns with reusable presentational concerns.
- Test strategy clearly separates component rendering from data or side-effect logic.

## Common Roles

- Page or container component
- Reusable presentational component
- Local state or composable hook
- UI-facing service or API adapter

## Avoid

- Splitting every helper into its own file.
- Extracting components only because the template grew, without a real ownership boundary.
- Creating generic shared components before a second real usage appears.
