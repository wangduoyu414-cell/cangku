# Input Fill Guide

## Purpose

Use this guide when the user, another agent, or an upstream system needs to fill a structured request before handing it to this skill.

The goal is not to force rigid data entry in every case. The goal is to collect enough information to:
- choose the correct task mode
- choose the correct scene card
- avoid inventing missing copy or preserve rules
- produce a model-ready web prompt plus image input fields by default
- request an expanded package or report only when a human explicitly needs it

Default recommendation:
- use `YAML` for human-filled requests
- keep field names in English
- keep field values in the user's language
- fill unknown items with `null`
- leave `output_mode` as `null` unless you explicitly need `expanded`
- do not add explanation outside the template unless the receiver explicitly asks for it

## Quick Start

Choose one of these four templates:
- `design_goal_brief`: for one shared design target that still needs to be expanded into multiple comparable scenarios
- `single_image_brief`: for one cover, one poster, one packshot, one UI screen, one visual, or one generated image
- `sequence_brief`: for carousel sets, multi-page notes, storyboard-like frame groups, video support frames, chapter cards, or tutorial step sets
- `edit_brief`: for changing an existing image while preserving part of it

Decision rule:
- if the user starts from one design goal and wants to compare routes, choose defaults, or test multiple scenarios, use `design_goal_brief`
- if the deliverable is one image, use `single_image_brief`
- if the deliverable is multiple ordered frames or pages, use `sequence_brief`
- if the request starts from an existing image and must preserve parts of it, use `edit_brief`

Output rule:
- leave `output_mode: null` to get the default `model-ready` output
- set `output_mode: expanded` only when a human explicitly wants the full package or full report

## Global Field Rules

These rules apply to all templates.

### Required Behavior

- Fill every field that is known.
- Use `null` for unknown scalar values.
- Use `[]` for unknown or empty lists.
- Do not invent exact copy, brand rules, or reference-image roles.
- Do not compare scenarios before each scenario brief is complete enough to stand on its own.
- Do not silently convert a sequence into a single image.
- Do not silently convert an edit request into a new-generation request.

### Value Style

- `output_mode`, `task_mode`, `scene_card`, `platform_surface`, and `modifiers` should use the exact labels defined by the skill.
- `delivery_goal`, `subject`, `success_criteria`, `must_keep`, and `must_avoid` can be written in natural language.
- `soft_preferences` can be written in natural language.
- `exact_text` should contain literal text strings only.
- `references` should describe each image role explicitly, preferably as `{ role, description }` objects.

### Unknown vs Optional

Use `null` when the field matters but is currently unknown.

Examples:
- `platform_surface: null`
- `frame_count: null`
- `title_safe_zone: null`

Use `[]` when the field is a list and there are currently no items.

Examples:
- `must_avoid: []`
- `modifiers: []`
- `exact_text: []`

Omit nothing unless the receiving system explicitly strips empty fields.

### Canonical vs Compatibility

Use these as the canonical shapes:
- design-goal-only fields belong at the top level of `design_goal_brief`
- sequence-only fields belong under `sequence.*`
- edit-only fields belong under `edit_scope.*`
- optional visual guidance belongs under `soft_preferences`
- `references` is canonically an array of `{ role, description }` objects

Legacy compatibility may still appear in older requests:
- top-level `frame_count` and `frame_roles`
- top-level `change_only` and `preserve`
- `preferences` instead of `soft_preferences`
- string-only entries inside `references`

Normalization rules:
- normalize legacy `frame_count` and `frame_roles` into `sequence.*`
- normalize legacy `change_only` and `preserve` into `edit_scope.*`
- normalize legacy `preferences` into `soft_preferences`
- normalize string-only `references` entries into `{ role: null, description: <original string> }`
- do not invent a `role` when the request did not provide one
- if canonical and legacy forms are both present, the canonical form wins

## Allowed Core Values

### `output_mode`

Use this only when you need to override the default output behavior.

Allowed values:
- `model-ready`
- `expanded`

How to choose:
- use `model-ready` when the output should be directly usable by another model or easy to copy into ChatGPT web
- use `expanded` only when a human explicitly wants the full package, full report, risk notes, or patch notes
- leave it `null` when you want the skill to choose the default, which is currently `model-ready` when the brief is sufficient

### `task_mode`

Choose one primary mode:
- `new-generate`
- `sequence-asset-generate`
- `reference-guided-generate`
- `global-edit`
- `localized-edit`
- `multi-image-composite`
- `text-language-edit`
- `style-transfer`
- `layout-format-adapt`
- `retouch-restore`

How to choose:
- use `new-generate` when creating one new image from scratch
- use `sequence-asset-generate` when creating multiple ordered pages or frames
- use `reference-guided-generate` when a reference image mainly provides identity or style for a new image
- use `global-edit` when the whole image changes but the source still matters
- use `localized-edit` when only one bounded area should change
- use `multi-image-composite` when different images contribute different elements
- use `text-language-edit` when text content or language is the primary change
- use `style-transfer` when style is the main transfer target
- use `layout-format-adapt` when the job is mainly canvas, crop, expansion, or layout adaptation
- use `retouch-restore` when the image should be cleaned, repaired, or polished without redesign

### `scene_card`

Common single-image values:
- `product-packshot`
- `product-hero`
- `product-lifestyle`
- `product-detail-closeup`
- `packaging-front`
- `packaging-label`
- `packaging-display`
- `campaign-key-visual`
- `social-creative`
- `short-video-cover`
- `opening-hook-frame`
- `xhs-note-cover`
- `instagram-carousel-cover`
- `instagram-reel-cover`
- `editorial-cover`
- `infographic`
- `data-chart-page`
- `process-diagram`
- `map-route-visual`
- `slide-page`
- `ui-screen`
- `portrait-photo`
- `team-or-group-photo`
- `fashion-beauty-visual`
- `interior-space`
- `architecture-exterior`
- `character-portrait`
- `game-card-key-art`
- `brand-mascot-visual`

Common sequence values:
- `tutorial-video-steps`
- `xhs-carousel-note-set`
- `instagram-carousel-set`
- `ui-flow-set`
- `character-sheet`
- `storyboard-frame`
- `comic-or-picturebook-page`

How to choose:
- choose the scene card that describes the deliverable archetype or card type, not only the topic
- use `request_type` or `task_mode` to decide whether the output is single-image or sequence
- prefer a platformized scene card when the card type itself is platform-specific
- use `platform_surface` for feed, grid, crop, preview, cover extraction, and safe-zone behavior
- `scene_card` alone must not upgrade a request into sequence output

### `platform_surface`

Recommended values:
- `xiaohongshu-feed`
- `xiaohongshu-note-cover`
- `xiaohongshu-carousel`
- `instagram-feed`
- `instagram-grid-preview`
- `instagram-carousel`
- `instagram-reel-cover`
- `instagram-story`
- `short-video-9x16-cover`
- `short-video-opening-frame`
- `youtube-thumbnail`
- `presentation-slide`
- `ecommerce-hero`
- `app-store-creative`
- `general`

Use `general` only when no specific platform behavior matters.

Field rules:
- fill `platform_surface` when platform behavior, crop, preview, or safe-zone assumptions matter
- if omitted, `platform_surface` may be inferred from a platformized `scene_card`
- if explicit `platform_surface` conflicts with the inferred value, surface the conflict instead of silently overwriting either field

Common default inferences:
- `xhs-note-cover` -> `xiaohongshu-note-cover`
- `xhs-carousel-note-set` -> `xiaohongshu-carousel`
- `instagram-carousel-set` -> `instagram-carousel`
- `instagram-reel-cover` -> `instagram-reel-cover`
- `short-video-cover` -> `short-video-9x16-cover`

### `modifiers`

Video and sequence modifiers:
- `first-frame-hook`
- `cover-title-safe-zone`
- `vertical-safe-zone`
- `mobile-first-legibility`
- `thumbnail-recognizability`

Platform and carousel modifiers:
- `feed-grid-crop-safe`
- `swipe-sequence-consistency`
- `native-platform-aesthetic`
- `text-overlay-negative-space`
- `ugc-authenticity`

How to choose:
- usually pick 3 to 5 modifiers
- do not add modifiers that do not materially change execution
- if you need safe titles, use `cover-title-safe-zone`
- if the asset is 9:16, usually add `vertical-safe-zone`
- if the first frame must stop scrolling, add `first-frame-hook`
- if the output should feel like creator content, add `ugc-authenticity`
- if multi-page consistency matters, add `swipe-sequence-consistency`

## Template 0: `design_goal_brief`

Use this when the user has one shared design target but has not yet supplied complete scenario briefs.

```yaml
request_type: design_goal_brief
output_mode: null

design_goal: null
shared_subject: null
success_criteria: []

shared_must_keep: []
shared_must_avoid: []
shared_soft_preferences: []

candidate_scene_cards: []
candidate_platform_surfaces: []
comparison_focus:
  - transferability
  - execution_risk
  - evidence_fidelity
required_scenarios: 3
baseline_bias: null

references:
  - role: null
    description: null

open_questions: []
assumptions_allowed: false
```

### Field-by-Field Guide

#### `design_goal`

Write one sentence that describes the shared target, not the final route.

Good:
- `build a stable serum visual baseline that can extend from ecommerce hero to social cover`
- `find the safest starting route for a product visual system that must survive both static and edited use`

Avoid:
- `instagram-reel-cover`
- `localized-edit`
- `product-hero`

Those are scenario candidates, not the design goal itself.

#### `shared_subject`

Name the common subject that should survive across the compared scenarios.

Good:
- `the same glass serum bottle`
- `the same rental desk makeover`
- `the same campaign poster source image`

#### `comparison_focus`

Use this to tell the skill what should decide the baseline.

Recommended values:
- `transferability`
- `execution_risk`
- `evidence_fidelity`
- `platform_fit`
- `text_precision`
- `edit_rigidity`

Use 2 to 4 items.

#### `required_scenarios`

Use `3` by default.
Use `4` or `5` only when another risk surface materially changes the recommendation.

#### `baseline_bias`

Keep this `null` unless the user already has a directional preference.

Examples:
- `prefer the most reusable upstream route`
- `prefer the safest social-cover route`

### Derivation Rules

When the request uses `design_goal_brief`, derive scenarios in this order:
- one anchor route for the most reusable baseline
- one platform-stress route for the strongest crop, preview, or safe-zone pressure
- one preserve-stress route for the strictest fidelity or edit boundary

Every derived scenario should then be expanded into a complete scenario brief with:
- `task_mode`
- `scene_card`
- `platform_surface`
- `delivery_goal`
- `subject`
- `success_criteria`
- `must_keep`
- `must_avoid`
- route-specific fields when relevant

### Completed Example

```yaml
request_type: design_goal_brief
output_mode: null

design_goal: establish a stable serum visual baseline that can extend from ecommerce hero to social cover and preserve-sensitive edits
shared_subject: the same glass serum bottle
success_criteria:
  - the product stays recognizable across routes
  - label text stays stable where visible
  - the default route has low execution risk

shared_must_keep:
  - bottle silhouette
  - label text
shared_must_avoid:
  - packaging drift
  - hard-ad tone when adapted to social cover
shared_soft_preferences:
  - clean premium polish
  - believable natural reflections

candidate_scene_cards:
  - product-hero
  - instagram-reel-cover
  - campaign-key-visual
candidate_platform_surfaces:
  - ecommerce-hero
  - instagram-reel-cover
  - general
comparison_focus:
  - transferability
  - execution_risk
  - evidence_fidelity
required_scenarios: 3
baseline_bias: prefer the most reusable upstream route

references:
  - role: product_reference
    description: the current serum bottle packshot

open_questions: []
assumptions_allowed: false
```

## Template 1: `single_image_brief`

Use this for one image only.

```yaml
request_type: single_image_brief
output_mode: null

task_mode: null
scene_card: null
platform_surface: null
delivery_goal: null
subject: null
success_criteria: []

exact_text: []
must_keep: []
must_avoid: []
soft_preferences: []
modifiers: []

references:
  - role: null
    description: null

safe_zone:
  title_safe_zone: null
  vertical_safe_zone: null
  crop_notes: []

open_questions: []
assumptions_allowed: false
```

### Field-by-Field Guide

#### `delivery_goal`

Describe the artifact and usage context.

Good:
- `Instagram reel cover for a home organization video`
- `ecommerce hero image for a glass skincare bottle`
- `campaign poster for a coffee bean launch`

Weak:
- `make a picture`
- `draw something nice`

#### `subject`

Describe the main visual subject.

Good:
- `before-and-after home storage transformation in the same cabinet`
- `single amber glass skincare bottle with readable label`
- `small rental-desk makeover result`

#### `success_criteria`

Write what must be true if the image succeeds.

Examples:
- `the before and after difference is obvious at thumbnail size`
- `label text remains readable`
- `the image feels native to Instagram rather than like a hard ad`

#### `exact_text`

Use only when literal text must appear or must be preserved.

Good:
```yaml
exact_text:
  - "晨烘限定"
  - "单一产地 / 浅烘 / 柑橘调"
```

Do not use this field for:
- tone direction
- keywords
- text ideas that are not final

#### `must_keep`

List elements that cannot drift.

Examples:
- `product silhouette`
- `logo placement`
- `same person identity`
- `title zone must remain clean`

#### `must_avoid`

List prohibited outcomes.

Examples:
- `extra text`
- `watermark`
- `hard-ad look`
- `changing the bottle shape`

#### `references`

Use when reference images exist.

Good:
```yaml
references:
  - role: subject_identity
    description: existing founder portrait to preserve facial identity
  - role: style_reference
    description: warm editorial lighting and muted background palette
```

### Completed Example

```yaml
request_type: single_image_brief
output_mode: null

task_mode: new-generate
scene_card: instagram-reel-cover
platform_surface: instagram-reel-cover
delivery_goal: Instagram reel cover for a storage makeover video
subject: before-and-after transformation of the same bathroom sink storage area
success_criteria:
  - the before and after difference is obvious at thumbnail size
  - the cover leaves a safe title zone
  - the result feels like creator content, not a paid ad

exact_text: []
must_keep:
  - same storage area before and after
must_avoid:
  - extra text
  - hard-ad look
  - clutter that hurts thumbnail readability
soft_preferences:
  - creator-like realism
  - warm natural lighting
modifiers:
  - cover-title-safe-zone
  - vertical-safe-zone
  - thumbnail-recognizability
  - mobile-first-legibility
  - ugc-authenticity

references: []

safe_zone:
  title_safe_zone: upper-center clean block
  vertical_safe_zone: key subject stays in the center band
  crop_notes:
    - keep the main before-and-after split away from the left and right edges

open_questions: []
assumptions_allowed: false
```

## Template 2: `sequence_brief`

Use this for ordered multi-frame or multi-page output.

```yaml
request_type: sequence_brief
output_mode: null

task_mode: sequence-asset-generate
scene_card: null
platform_surface: null
delivery_goal: null
subject: null
success_criteria: []

exact_text: []
must_keep: []
must_avoid: []
soft_preferences: []
modifiers: []

references:
  - role: null
    description: null

sequence:
  frame_count: null
  frame_roles: []
  cover_goal: null
  ending_role: null
  cross_frame_invariants: []
  narrative_progression: null

safe_zone:
  title_safe_zone: null
  vertical_safe_zone: null
  crop_notes: []

open_questions: []
assumptions_allowed: false
```

### Field-by-Field Guide

#### `frame_count`

Use a number.

Good:
- `5`
- `6`
- `8`

Avoid:
- `a few`
- `maybe 5 or 6`

#### `frame_roles`

Describe what each frame does.

Good:
```yaml
frame_roles:
  - "frame 1: cover with stop-power and topic clarity"
  - "frame 2: pain point"
  - "frame 3: step 1"
  - "frame 4: step 2"
  - "frame 5: before-after proof"
  - "frame 6: closing save prompt"
```

#### `cover_goal`

Explain what frame 1 must optimize for.

Examples:
- `feed stop and clear topic recognition`
- `video opener with strong first-frame hook`
- `carousel cover that survives grid preview crop`

#### `ending_role`

Examples:
- `soft save CTA`
- `summary page`
- `chapter close`
- `product lineup close`

#### `cross_frame_invariants`

List what cannot drift across the sequence.

Examples:
- `same rental desk space`
- `same palette of warm beige, cream, and light wood`
- `same typography feel`
- `same creator-like realism`

#### `narrative_progression`

Describe the pacing in one line.

Examples:
- `problem -> process -> result -> save`
- `hook -> explanation -> examples -> recap`
- `intro -> chapter A -> chapter B -> chapter C -> close`

### Completed Example

```yaml
request_type: sequence_brief
output_mode: null

task_mode: sequence-asset-generate
scene_card: xhs-carousel-note-set
platform_surface: xiaohongshu-carousel
delivery_goal: Xiaohongshu 6-page note set
subject: rental-desk before-and-after makeover
success_criteria:
  - cover has stop power
  - the sequence feels like one coherent note set
  - inner pages stay readable on mobile
  - the result feels native to Xiaohongshu, not like a hard ad

exact_text: []
must_keep:
  - the same desk space across all pages
must_avoid:
  - hard-ad tone
  - page-to-page style drift
  - text-heavy poster pages
soft_preferences:
  - warm neutral palette
  - creator-like realism
modifiers:
  - first-frame-hook
  - cover-title-safe-zone
  - swipe-sequence-consistency
  - native-platform-aesthetic
  - ugc-authenticity

references: []

sequence:
  frame_count: 6
  frame_roles:
    - "frame 1: cover"
    - "frame 2: pain point"
    - "frame 3: step 1"
    - "frame 4: step 2"
    - "frame 5: before-after proof"
    - "frame 6: soft save close"
  cover_goal: feed stop and immediate topic clarity
  ending_role: soft save CTA
  cross_frame_invariants:
    - same rental desk space
    - same warm neutral palette
    - same creator-like realism
  narrative_progression: problem -> process -> proof -> save

safe_zone:
  title_safe_zone: top-center cover title block
  vertical_safe_zone: null
  crop_notes:
    - keep the key desk area away from the left and right edges on the cover

open_questions: []
assumptions_allowed: false
```

## Template 3: `edit_brief`

Use this when starting from an existing image and preserving part of it matters.

```yaml
request_type: edit_brief
output_mode: null

task_mode: null
scene_card: null
platform_surface: null
delivery_goal: null
subject: null
success_criteria: []

exact_text: []
must_keep: []
must_avoid: []
soft_preferences: []
modifiers: []

references:
  - role: source_image
    description: null

edit_scope:
  change_only: []
  preserve: []
  source_role: null
  surgical_or_flexible: null

safe_zone:
  title_safe_zone: null
  vertical_safe_zone: null
  crop_notes: []

open_questions: []
assumptions_allowed: false
```

### Field-by-Field Guide

#### `task_mode`

Choose:
- `localized-edit` when one bounded area changes
- `global-edit` when the whole image changes but source fidelity still matters
- `text-language-edit` when wording or language is the primary edit target

#### `edit_scope.change_only`

State exactly what should change.

Good:
- `change 2025 to 2026 in the date area only`
- `replace the background with warm stone while keeping the bottle unchanged`

#### `edit_scope.preserve`

State exactly what must stay unchanged.

Good:
- `composition`
- `product shape`
- `label text`
- `logo placement`
- `all other text`

#### `surgical_or_flexible`

Recommended values:
- `surgical`
- `flexible`

Use `surgical` for precise local edits.
Use `flexible` when broader reinterpretation is acceptable.

### Completed Example

```yaml
request_type: edit_brief
output_mode: null

task_mode: localized-edit
scene_card: campaign-key-visual
platform_surface: general
delivery_goal: update the campaign poster year without redesign
subject: existing event poster date text
success_criteria:
  - only the year changes
  - the new year matches the original type style
  - the rest of the poster remains unchanged

exact_text:
  - "2026"
must_keep:
  - overall composition
  - product image
  - title
  - logo
  - all other text
must_avoid:
  - redesign
  - color changes
  - background changes
soft_preferences: []
modifiers: []

references:
  - role: source_image
    description: the existing campaign poster

edit_scope:
  change_only:
    - change 2025 to 2026 in the date area only
  preserve:
    - composition
    - color system
    - product image
    - title
    - logo
    - all other text
  source_role: source image is the fidelity anchor
  surgical_or_flexible: surgical

safe_zone:
  title_safe_zone: null
  vertical_safe_zone: null
  crop_notes: []

open_questions: []
assumptions_allowed: false
```

## Common Mistakes

### Mistake 1: putting the platform into `task_mode`

Wrong:
```yaml
task_mode: instagram-carousel
```

Right:
```yaml
task_mode: sequence-asset-generate
scene_card: instagram-carousel-set
platform_surface: instagram-carousel
```

### Mistake 2: putting style ideas into `exact_text`

Wrong:
```yaml
exact_text:
  - clean minimalist feeling
```

Right:
```yaml
success_criteria:
  - the result feels clean and minimalist
```

### Mistake 3: missing preserve rules for edits

Wrong:
```yaml
task_mode: localized-edit
subject: update the date
```

Right:
```yaml
task_mode: localized-edit
subject: update the date
edit_scope:
  change_only:
    - change 2025 to 2026 in the date area only
  preserve:
    - all other text
    - composition
    - product image
```

### Mistake 4: sequence with no frame logic

Wrong:
```yaml
task_mode: sequence-asset-generate
frame_count: 6
```

Right:
```yaml
sequence:
  frame_count: 6
  frame_roles:
    - "frame 1: cover"
    - "frame 2: pain point"
    - "frame 3: step 1"
    - "frame 4: step 2"
    - "frame 5: proof"
    - "frame 6: close"
```

### Mistake 5: using modifiers as decoration

Do not add every modifier.

Prefer:
- `3` to `5` modifiers for platform-sensitive work
- `0` to `2` modifiers for ordinary product or poster work

## Recommended Upstream Prompt

Use this when asking a human or system to fill the template:

```text
Fill the YAML template below exactly.
Use the exact field names.
Keep known values.
Fill unknown scalar fields with null.
Fill unknown lists with [].
Do not invent copy, brand rules, or reference-image roles.
Do not add explanation outside the template.
```

## Review Checklist

Before handing the brief to this skill, check:
- Is `task_mode` one of the allowed values?
- Does `scene_card` describe the deliverable archetype or card type?
- Is single-image versus sequence chosen from `request_type` or `task_mode`, instead of from `scene_card` alone?
- Is `platform_surface` filled or inferable when platform behavior matters?
- Are `must_keep` and `must_avoid` concrete?
- Is `exact_text` literal, not descriptive?
- For sequences, are `sequence.frame_count` and `sequence.frame_roles` present?
- For edits, are `edit_scope.change_only` and `edit_scope.preserve` both present?
- Are unknowns marked explicitly instead of guessed?
