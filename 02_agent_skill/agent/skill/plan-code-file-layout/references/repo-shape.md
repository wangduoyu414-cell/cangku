# Repository Shape

Classify the target area before proposing new files.

## Feature-First

Typical signs:

- Directories grouped by domain or feature
- UI, service, and tests for one feature live near each other

Planning rule:

- Keep new files near the feature.
- Prefer local file splits inside the feature instead of creating global shared folders.

## Layer-First

Typical signs:

- Global folders like `controllers/`, `services/`, `repositories/`, `components/`
- Files for one feature are spread across layer directories

Planning rule:

- Respect the existing layout unless it is clearly being replaced.
- Avoid introducing a one-off feature island inside a strong layer-first codebase.

## Package-First

Typical signs:

- Package boundaries carry most of the meaning
- Common in Go and some Python monorepos

Planning rule:

- First choose the right package.
- Then keep file count modest inside the package unless multiple roles need separation.

## Mixed

Typical signs:

- Different areas follow different patterns
- Frontend, backend, scripts, and infra each organize differently

Planning rule:

- Make the decision locally around the target area.
- Do not force one repository-wide shape onto the entire codebase.
- Let the target artifact type and dominant local stack drive the plan.
