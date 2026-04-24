# Artifact: Data Pipeline Step

Use for ETL stages, jobs, stream processors, and batch pipeline steps.

## Default Boundary

Split by stage or boundary, not by tiny helper function.

## Split When

- Extraction, transformation, and sink logic have different side effects or retry behavior.
- Schema normalization has its own test surface.
- One stage is becoming a reusable shared pipeline component.

## Common Roles

- Step entrypoint
- Transform logic
- Source or sink adapter
- Contract or schema mapping

## Avoid

- Creating large shared utility files for one pipeline.
- Hiding the step flow across many tiny helpers that readers must reassemble.
