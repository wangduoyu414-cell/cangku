# Stack: TypeScript / JavaScript

Use this guide as a delta on top of the core and artifact rules.

## Bias

- Prefer feature-local organization over global layer sprawl when the repository allows it.
- Keep local types, mappers, and validators close to the feature until reuse is real.

## Split When

- Framework glue, business orchestration, and external IO all coexist in one file.
- The same file carries both UI concerns and remote data concerns.
- A contract, schema, or adapter has its own test and failure boundary.

## Avoid

- Pass-through wrapper files
- Barrel files that add indirection without a public API reason
- Extracting every helper because import paths look cleaner on paper
- Adding a feature-local service layer between a route and its real adapters when the route can still visibly orchestrate one short flow.
