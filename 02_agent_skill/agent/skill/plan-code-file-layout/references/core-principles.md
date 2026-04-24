# Core Principles

Use these rules before reading any artifact or stack guide.

## Decision Order

1. Read the target area and nearby files.
2. Classify the local repository shape.
3. Classify the artifact role.
4. Apply stack deltas.
5. Decide `keep`, `split`, or `merge`.

## Conflict Precedence

When local signals disagree, prefer them in this order:

1. Explicit baseline docs or migration rules that define the target area
2. The target file and the concrete implementation slice itself
3. Nearby sibling examples in the same local area
4. The target directory's existing convention
5. Broader repository documentation
6. Global architecture guidance

If explicit baseline docs conflict with local structure, follow the documented target state and treat the local layout as legacy evidence. If the winning signal is still ambiguous, lower confidence and call out migration cost or uncertainty explicitly.

When explicit baseline docs conflict with each other, prefer the one that most directly defines the target slice's current migration phase or rollout status. Use broader architecture summaries as secondary evidence, and call out the unresolved long-term target in `risks` when the docs describe different phases of the same migration.

When target-area baseline docs agree on the current phase but differ on file-boundary granularity, prefer the one that gives the more concrete seam guidance for the slice itself. A doc that names which file should own framework glue, response shaping, or adapter behavior should beat a doc that only names the broader destination directory.

## Default Bias

- Prefer a small number of high-cohesion files.
- Prefer boundaries that make common debugging and common edits local.
- Prefer local helpers over premature extraction.
- Prefer the shortest file chain that still exposes real side-effect boundaries.
- Do not insert an extra orchestration layer when the entry file plus the real IO edges already keeps the common path readable.
- Keep the recommendation scoped to the concrete slice under discussion; nearby examples are there to calibrate the decision, not to be copied into the returned file plan.
- When baseline docs explicitly define a different layer or module boundary, prefer the documented target state over preserving an off-pattern local layout.

## Split Signals

Split when one or more of these become materially separate:

- Change reason
- Side-effect boundary
- Test surface
- Reuse need
- Public API surface

Treat stronger signals as:

- External IO or framework glue mixed with business rules
- One file mixing entrypoint, orchestration, and persistence
- One file hiding multiple independent failure modes
- One file where the real split is "entry + external adapter + persistence adapter", not "entry + service + adapter"

## Keep Signals

Keep code in one file when most of these are true:

- The change reason is shared.
- The code is only used locally.
- The same tests cover the whole slice.
- Splitting would add wrapper files or longer jumps without clearer ownership.
- The main flow is still readable in the entry file once real adapter boundaries are extracted.

## Merge Signals

Merge when the current boundary causes more movement than clarity:

- Frequent bug tracing crosses four or more files.
- A file exists only to forward calls or re-export local code.
- Two files almost always change together and do not have separate test or side-effect value.

## Heuristic Thresholds

Treat these as warning signs, not hard limits:

- A common change should usually stay readable through one to three files.
- Very large files are suspicious when they mix multiple abstraction layers.
- Very small files are suspicious when they exist only for naming or ceremony.
