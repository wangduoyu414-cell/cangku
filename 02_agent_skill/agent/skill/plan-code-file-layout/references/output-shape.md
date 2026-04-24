# Output Shape

Return the final plan in this structure.

```yaml
decision:
  strategy: keep | split | merge
  target_area: ""
  repo_shape: feature-first | layer-first | package-first | mixed
  artifact_type: ui-component | service-endpoint | cli-command | data-pipeline-step | library-module
  stack: python | typescript-javascript | vue | go | mixed | unknown
  files:
    - path: ""
      role: ""
      responsibility: ""
      reason: ""
  keep_inline: [] # optional when empty
  avoid: [] # optional when empty
  why_not_fewer: ""
  why_not_more: ""
  risks: [] # optional when empty
  confidence: high | medium | low
```

## Field Notes

### Core Decision Fields

- `strategy`: Main boundary decision for this implementation slice.
- `target_area`: Directory, feature, file, or module anchor used for the decision.
- `target_area` should copy the concrete anchor from the request exactly rather than turning it into a prose label or migration summary.
- `target_area` should also preserve the same anchor granularity as the request: keep exact file-path anchors as file paths, and keep directory, feature, or module anchors at that higher level.
- `files`: Recommended production files only.
- `files` should list only the production files for the target slice itself, not sibling examples or comparison files that were shown as context.
- `files` should also exclude support docs, baseline docs, and repository context files that were injected only to guide the decision.
- Comparison files, legacy shims, and other evidence files may still be mentioned in `why_not_more` or `risks`, but they should not appear under `files` unless the request explicitly expands scope to include them.
- Upstream results from other skills may inform role, impact, or confidence, but they should not widen `target_area` or pull additional evidence files into `files`.
- When baseline docs conflict with the local layout, `files` should follow the documented target state and `risks` should note migration or relocation impact.
- `why_not_fewer`: Explain why a smaller layout would blur a real boundary.
- `why_not_more`: Explain why further splitting would mostly add ceremony.

These fields carry the main implementation decision and should remain stable across reasonable model variations.

### Explanatory Fields

- `repo_shape`: Local repository organization around the target area.
- `artifact_type`: Primary code role that drives the boundary.
- `stack`: Dominant local stack, not the entire repository.
- `keep_inline`: Helpers, types, validators, or mappers that should stay local for now. Omit this field when it would otherwise be empty.
- `avoid`: Unhelpful files or abstractions that should not be created. Omit this field when it would otherwise be empty.
- `risks`: List uncertainty, convention conflicts, or likely follow-up questions. Omit this field when it would otherwise be empty.
- `confidence`: Record how stable the recommendation looks after weighing local signals and conflicts.

These fields explain or classify the decision. They should still be present, but some wording, naming, or classification differences can remain acceptable when the core boundary decision is unchanged.
