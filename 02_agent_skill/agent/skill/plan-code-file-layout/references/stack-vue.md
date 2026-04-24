# Stack: Vue

Treat this as a strong override when Vue single-file components or composables are involved.

## Bias

- A `.vue` single-file component is already a valid boundary.
- Keep template, simple local state, and local event logic together by default.

## Split When

- Async fetching, mutations, or cross-component state dominate the component.
- State or behavior deserves a reusable composable.
- API or persistence logic is obscuring the view role.

## Common Layout

- Page or container `.vue`
- Reusable child component `.vue`
- Composable for shared stateful behavior
- Service or API module for remote calls

## Avoid

- Turning every piece of component state into a composable
- Creating generic UI abstractions before repeated usage exists
- Splitting one cohesive component just to reduce template length
