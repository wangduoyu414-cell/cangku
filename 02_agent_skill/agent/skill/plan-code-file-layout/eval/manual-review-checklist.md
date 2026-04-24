# Manual Review Checklist

Use this checklist when a person reviews a saved YAML output instead of relying only on automation.

## Scope

- Does the answer stay anchored to one concrete target area?
- Does it avoid drifting into repository-wide redesign?
- Does it avoid listing legacy compatibility shims or rollout-only bridge files as production files unless the request explicitly preserves them?

## Fit

- Does `repo_shape` match the local area instead of the whole repository?
- Does `artifact_type` match the user request and nearby code?
- Does `stack` reflect the dominant local implementation language?

## Decision Quality

- Is `strategy` believable for the actual code shown?
- Does the file list reflect real role boundaries rather than naming-only splits?
- Does the plan keep common debugging in roughly one to three files?

## Restraint

- Are local helpers, types, validators, or mappers kept inline when reuse is not real?
- Does `avoid` call out useless wrapper or ceremony files?

## Explanation

- Does `why_not_fewer` explain what real boundary would be blurred?
- Does `why_not_more` explain what extra ceremony would be introduced?
- Do `risks` and `confidence` feel honest, especially in off-pattern or conflicting directories?

## Final Check

- If you were about to implement the change, could you use this YAML directly without guessing?
