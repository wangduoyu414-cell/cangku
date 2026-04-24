---
name: gpt-image-2-prompt-structurer
description: Structure prompts for gpt-image-2 generation and editing workflows. Use when Codex needs to turn a vague visual request into a controlled, model-ready output with a direct Chinese web prompt plus structured image input fields by default, and only expand into a full package on request. Also use when Codex needs to expand a fuzzy design goal into complete scenario briefs before comparing baseline routes, platform extensions, or preserve-sensitive edits, then return the recommended route in model-ready form. Also use when the request needs sequence-aware prompt packaging for covers, carousels, storyboard-like frame sets, short-video support assets, 小红书图文, Instagram carousel or reel covers, and other multi-frame visual deliverables. Also use for Chinese requests about gpt-image-2 提示词、图像生成、图像编辑、控图、参考图合成、局部修改、图中文字、广告图、信息图、商品图、UI 模拟图、角色一致性、小红书图文、Instagram 轮播、短视频封面、开场钩子帧、多页卡片、封面安全区、轮播一致性、设计目标拆解、基线路径比较。
---

# GPT Image 2 Prompt Structurer

## Design Goal

Turn a loose image request into a prompt package that is easy for `gpt-image-2` to execute, easy for a human to review, and easy to iterate on.

Optimize for:
- stable direction
- controllable edits
- exact text handling
- reviewable constraints
- small follow-up iterations

Do not optimize for:
- ornate prompt writing
- style-word dumping
- one-shot “perfect” prompts
- replacing missing business context with guesses

## Boundary / Invariants

- Keep the skill focused on prompt structuring, not image generation code.
- Keep the skill focused on task routing, constraint separation, and prompt packaging.
- Keep hard constraints separate from soft preferences.
- Keep system-facing parameter advice outside the main prompt body.
- Keep exact text isolated and reviewable.
- Keep edit tasks explicit about what changes and what stays fixed.
- Keep reference-image roles explicit by index or label.
- Keep unknown critical inputs visible as assumptions or missing fields.
- Do not invent missing copy, brand rules, UI content, or reference-image intent.
- Do not collapse all tasks into one universal prompt template.
- Do not assume transparent background output is available for `gpt-image-2`.

## Overview

Use this skill when the job is not “write a pretty prompt” but “convert a messy image request into a controllable production instruction set.”

`gpt-image-2` is strong at high-quality generation and editing, text-heavy imagery, compositing, and identity-sensitive edits. It still benefits more from clear structure than from clever syntax. This skill therefore behaves like a task normalizer and constraint organizer, not like a style-template generator.

The default result is a model-ready output, not only a review package. When the request is sufficiently specified, emit a direct Chinese web prompt plus structured image input fields. Only emit the longer package or report when the user explicitly asks for a full package, full report, review version, risk notes, patch notes, or explanation-heavy output.

A good package includes:
- a normalized task summary or sequence brief
- one main prompt, or a cover prompt plus inner-frame prompts
- hard constraints
- soft preferences
- parameter suggestions
- risk notes
- iteration patches
- an acceptance checklist
- cross-frame invariants and safe-zone notes when the asset is a sequence

## Trigger / Non-Trigger

### Trigger

Use this skill when:
- the user has a vague or overloaded request for `gpt-image-2`
- the request mixes delivery goal, subject, style, and edit rules together
- the user needs controlled prompts for generation, edits, local changes, or compositing
- the user needs text-in-image prompts with exact wording
- the user needs prompt structures for product images, ads, infographics, UI mockups, or consistency-sensitive work
- the user wants prompts that are easy to debug and iterate

### Non-Trigger

Do not use this skill when:
- the task is to call an API or write image-generation code
- the task is only to brainstorm art directions with no need for structured prompts
- the task is only to review output images after generation
- the task is generic copywriting unrelated to image generation
- the task is a one-off casual prompt where no control or iteration structure is needed

## Workflow

1. Identify the primary task mode and whether the request is single-frame or sequence-based before writing the prompt.
2. Normalize the request into goal, hard constraints, soft preferences, prohibited outcomes, and open questions.
3. Check whether the request is missing any critical input for its scene, platform surface, or frame sequence.
4. Apply scene-specific and modifier-specific shaping rules only after the base structure is clear.
5. Compose the main prompt or frame prompts in a fixed information order.
6. Emit the supporting control blocks around the prompt set.
7. Add likely failure points and small iteration patches.
8. Add a compact acceptance checklist.

### Scenario Validation Mode

Use this mode when the user explicitly asks to test one design goal across multiple scenarios.

Accepted starting points:
- fully specified `scenario_briefs`
- a `design_goal_brief` that still needs scenario derivation

Execution rules:
- derive 3 to 5 scenario briefs from the same design goal when the request starts as `design_goal_brief`
- keep each scenario fully specified before comparison; do not rely on missing-field recovery during the comparison pass
- vary one primary risk surface per scenario, such as route type, platform surface, scene card, text density, or edit rigidity
- run a fixed generic review protocol:
  1. `Derivation Pass`: turn the shared design goal into complete scenario briefs
  2. `Scenario Review Pass`: record route choice, expected output shape, critical evidence, likely failure modes, and provisional pass/fail for each scenario
  3. `Cross-Check Pass`: compare invariant drift, route mismatch, preserve-boundary mismatch, exact-text mismatch, and platform-safety mismatch
  4. `Arbiter Pass`: choose the baseline by transferability, execution risk, and evidence coverage
- treat multi-worker or parallel execution as an optional implementation detail, not as part of the skill contract
- return only merged findings, not raw pass logs

### Design Goal Derivation

Use this when the request starts from one shared target rather than from complete scenario briefs.

Derive scenarios in this order unless the request clearly requires a different order:
- `Anchor Scenario`: the most reusable baseline route
- `Platform Extension Scenario`: the route with the strongest platform or preview constraint
- `Preserve Stress Scenario`: the route with the strictest preserve boundary or fidelity risk
- optional extra scenarios only when a separate risk surface materially changes the recommendation

Every derived scenario must be complete enough to compare:
- `task_mode`
- `scene_card`
- `platform_surface`
- `delivery_goal`
- `subject`
- `success_criteria`
- `must_keep`
- `must_avoid`
- route-specific fields such as `sequence.*` or `edit_scope.*`

### Task Routing

Route the request into one primary mode:
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

If a request spans multiple modes, choose one primary mode and treat the others as constraints.

### Output Shape Precedence

Decide the output shape before scene-card shaping.

- explicit design-goal scenario validation with 3 or more complete scenario briefs -> `Scenario Validation Report`
- `design_goal_brief` -> derive complete scenario briefs first, then emit `Scenario Validation Report`
- `sequence-asset-generate` or `sequence_brief` -> `Sequence Prompt Package`
- `single_image_brief`, `edit_brief`, and all other non-sequence task modes -> `Single-Image Prompt Package`
- `scene_card` alone must not upgrade a request into sequence output
- `platform_surface` may be explicit or inferred from a platformized `scene_card`
- if explicit `platform_surface` conflicts with the inferred surface, surface the conflict instead of silently overwriting either value

Do not promote these to top-level routes:
- object insert/remove/replace
- background replacement
- identity preservation
- layout preservation
- variant exploration
- `instagram-post`
- `instagram-story`
- `instagram-reel`
- `xiaohongshu-note`
- `video-cover`
- `carousel`
- `9:16`
- `4:5`

Treat them as sub-intents, scene cards, modifiers, delivery slots, or output parameters.

### Information Model

Normalize every request into these buckets:

#### Goal

Resolve:
- what is being made
- who it is for
- what it will be used for
- what counts as success

Examples of success criteria:
- text must be exact
- identity must remain recognizable
- packaging shape must not change
- layout must stay close to the source
- image should feel like a polished ad, not a rough concept

#### Hard Constraints

Treat these as non-negotiable:
- must appear
- must remain unchanged
- must match exactly
- must not appear
- must not move
- must not be rewritten

Typical hard constraints:
- literal text
- brand elements
- identity traits
- layout anchors
- geometry
- camera angle
- object count
- logo presence or absence
- preserved colors

#### Soft Preferences

Treat these as lower-priority guidance:
- mood
- style direction
- lighting
- material feeling
- atmosphere
- polish level
- inspirational references

#### Prohibited Outcomes

State these explicitly:
- no extra text
- no watermark
- no extra people
- no new logos
- no stock-photo feel
- no layout redesign
- no saturation shift
- no perspective change

#### Open Questions

Expose critical unknowns instead of guessing them.

Typical missing items:
- delivery type
- exact text
- preserve scope for edits
- reference-image role per input
- allowed change region

### Minimum Input Rules

When the user asks how to fill a brief, how to complete missing fields, or how to send a structured request to this skill, read `references/input-fill-guide.md` before answering.

Always try to resolve:
- task mode
- scene card
- delivery goal
- main subject
- success criteria
- platform surface when relevant
- whether the result is a single asset or a sequence
- must-keep items
- must-avoid items

Require these scene-specific inputs when relevant:

For `text-language-edit`:
- exact text
- text hierarchy
- placement expectations
- whether wording may be rewritten

For `global-edit` or `localized-edit`:
- what to change
- what must remain unchanged
- whether the edit is surgical or flexible
- source-image role

For `multi-image-composite`:
- numbered image roles
- what element comes from which image
- where that element should end up

For `reference-guided-generate`:
- which image is providing subject identity
- which image is providing style, if any
- which properties must be carried forward

For `sequence-asset-generate`:
- frame or page count
- role of frame 1 as the cover, hook, or opener
- role of frames 2 through N
- whether the last frame should close, summarize, or carry CTA
- cross-frame invariants
- sequence pacing or narrative progression
- target platform and canvas behavior

For platformized cover scene cards such as `xhs-note-cover`, `instagram-carousel-cover`, or `instagram-reel-cover`:
- whether the cover is optimized for feed stop, cover readability, or preview extraction
- title-zone expectations
- feed, grid, or preview crop constraints
- whether the result should feel polished or UGC-like

For platformized sequence scene cards such as `xhs-carousel-note-set` or `instagram-carousel-set`:
- whether frame 1 is optimized for feed stop or full-sequence entry
- inner-frame information density
- cover-to-inner consistency rules
- feed, grid, or preview crop constraints
- whether the result should feel polished or UGC-like

For video-support scene cards such as `short-video-cover`, `opening-hook-frame`, or `tutorial-video-steps`:
- cover-title safe zone
- vertical or subtitle overlay safe zone
- whether face or product must stay center-safe
- whether the first frame should prioritize hook, explanation, or chapter labeling

For UI-heavy scene cards such as `ui-screen` or `ui-flow-set`:
- platform or device context
- screen type
- must-have components
- primary action or button text
- what must not appear as generic filler

For product scene cards such as `product-packshot` or `product-hero`:
- product identity
- packaging or silhouette preservation needs
- background expectation
- whether label text must stay exact

For layout-sensitive routes such as `layout-format-adapt`:
- target aspect ratio or canvas goal
- what elements must remain visible
- what may be cropped, expanded, or repositioned

Accept these as optional enhancements unless the request depends on them:
- lens feel
- lighting style
- material detail
- composition preference
- mood language
- reference-style adjectives

### Modifier Layer

Use modifiers after choosing the task mode and scene card. Modifiers sharpen delivery behavior; they do not replace routing.

Do not stack modifiers blindly. Prefer the smallest set that materially changes execution, usually 3 to 5 modifiers.

#### Video and Sequence Modifiers

- `first-frame-hook`: maximize the stopping power of frame 1 or the cover without sacrificing legibility.
- `cover-title-safe-zone`: reserve a stable title block away from likely crop and UI collision zones.
- `vertical-safe-zone`: keep the key subject, face, and type inside a 9:16-safe center band.
- `mobile-first-legibility`: prioritize large, high-contrast hierarchy that survives phone viewing.
- `thumbnail-recognizability`: make the subject and value proposition readable at very small preview size.

#### Platform and Carousel Modifiers

- `feed-grid-crop-safe`: keep the subject and text safe across feed preview, grid crop, and cover extraction.
- `swipe-sequence-consistency`: keep typography, palette, subject scale, and layout logic coherent across cards.
- `native-platform-aesthetic`: make the output feel native to the platform instead of like a hard ad template.
- `text-overlay-negative-space`: reserve clean negative space for titles, subtitles, or cover copy.
- `ugc-authenticity`: keep polish believable and creator-like rather than looking over-produced.

### Scene Cards

Use these as routing aids, not rigid templates.

#### Product Packshot

Prioritize:
- clean isolation
- silhouette preservation
- readable label text
- controlled reflections
- simple commerce-ready presentation

Watch for:
- label corruption
- edge contamination
- invented props
- unnecessary redesign

#### Product Hero

Prioritize:
- strong product presence
- clear focal point
- commercial polish
- brand fit
- visual hierarchy

Watch for:
- stock-photo feel
- weak subject emphasis
- fake packaging changes
- clutter

#### Product Lifestyle

Prioritize:
- realistic usage context
- believable scale
- subject prominence
- environment coherence

Watch for:
- fake interactions
- lighting mismatch
- scale mismatch
- added clutter

#### Product Detail Closeup

Prioritize:
- material detail
- texture fidelity
- edge quality
- localized emphasis

Watch for:
- over-sharpened fake detail
- wrong material rendering
- label distortion
- altered geometry

#### Packaging Front

Prioritize:
- front-face hierarchy
- readable branding
- silhouette fidelity
- retail plausibility

Watch for:
- shape drift
- label corruption
- misaligned text
- packaging redesign

#### Packaging Label

Prioritize:
- text accuracy
- label hierarchy
- print-like layout stability
- regulatory clarity when needed

Watch for:
- missing lines
- incorrect weights
- crowded label
- invented claims

#### Packaging Display

Prioritize:
- shelf or grouped presentation
- package consistency
- scale consistency
- brand repetition stability

Watch for:
- inconsistent packaging variants
- broken alignment
- duplicate distortion
- branding drift

#### Campaign Key Visual

Prioritize:
- delivery context
- campaign tone
- strong headline zone
- visual hierarchy
- brand cues

Watch for:
- extra text
- layout collapse
- generic marketing look
- brand drift

#### Social Creative

Prioritize:
- strong first-glance readability
- high contrast focal hierarchy
- platform-friendly composition

Watch for:
- weak hook
- clutter
- unreadable text
- generic template feel

#### Short Video Cover

Prioritize:
- thumbnail recognizability
- cover-title safe zone
- mobile-first legibility
- a clear focal subject

Watch for:
- tiny unreadable type
- face or product cropped by UI
- generic ad feel
- weak stop power

#### Opening Hook Frame

Prioritize:
- immediate first-frame hook
- one clear promise or tension point
- text-overlay negative space
- fast comprehension in under three seconds

Watch for:
- crowded setup
- delayed payoff
- low contrast headline area
- weak narrative cue

#### Tutorial Video Steps

Prioritize:
- ordered step progression
- cross-frame consistency
- chapter differentiation without style drift
- legible instructional hierarchy

Watch for:
- step order ambiguity
- repeated frames that feel interchangeable
- dense text blocks
- inconsistent subject scale

#### XHS Note Cover

Prioritize:
- strong cover-title priority
- thumb-stop contrast
- native lifestyle or recommendation feel
- title space that still leaves the subject readable

Watch for:
- hard-ad polish
- fake stock-photo tone
- crowded cover typography
- missing save-worthy cue

#### XHS Carousel Note Set

Prioritize:
- swipe-sequence consistency
- cover versus inner-frame consistency
- save-worthy information density
- narrative progression from page to page

Watch for:
- isolated pages with no sequence logic
- weak cover hook
- overly commercial tone
- inner pages that collapse into walls of text

#### Instagram Carousel Cover

Prioritize:
- first-card stop power
- feed-grid crop safety
- bold, simple hierarchy
- immediate topic recognition

Watch for:
- key text near crop edges
- low-contrast thumbnails
- generic template feel
- weak cover-to-inner linkage

#### Instagram Carousel Set

Prioritize:
- swipe progression
- reusable layout logic
- shareable quote or takeaway clarity
- cover versus inner-frame consistency

Watch for:
- drift in palette or type hierarchy
- every card feeling identical
- lost narrative cadence
- clutter that breaks mobile readability

#### Instagram Reel Cover

Prioritize:
- vertical-safe composition
- thumbnail recognizability
- cover-title safe zone
- a native platform feel rather than a banner ad

Watch for:
- edge text collisions
- weak preview readability
- awkward face crop
- overdesigned overlays

#### Editorial Cover

Prioritize:
- cover hierarchy
- title zone control
- strong visual identity
- framing that supports text overlay

Watch for:
- weak masthead space
- muddy hierarchy
- cover-unfriendly composition
- excess detail

#### Infographic

Prioritize:
- information clarity
- text hierarchy
- visual grouping
- scanability

Watch for:
- crowded layout
- unreadable small text
- weak grouping
- decoration overtaking information

#### Data Chart Page

Prioritize:
- chart legibility
- label accuracy
- numeric trustworthiness
- clean visual hierarchy

Watch for:
- wrong labels
- misleading emphasis
- clutter
- fake dashboard styling

#### Process Diagram

Prioritize:
- step order clarity
- connector clarity
- visual logic
- minimal ambiguity

Watch for:
- arrow confusion
- step order drift
- overcrowding
- decorative noise

#### Map Route Visual

Prioritize:
- route clarity
- landmark distinction
- readable labels
- spatial logic

Watch for:
- ambiguous pathing
- unreadable names
- wrong emphasis
- over-decoration

#### Slide Page

Prioritize:
- presentation hierarchy
- speaker-friendly scanability
- balanced density
- strong title zone

Watch for:
- paragraph dump
- weak structure
- overloaded page
- unreadable chart/text balance

#### UI Screen

Prioritize:
- screen type
- realistic structure
- required components
- clear primary action

Watch for:
- hallucinated filler copy
- extra widgets
- inconsistent information density
- unrealistic control placement

#### UI Flow Set

Prioritize:
- cross-screen consistency
- believable progression
- repeated component stability
- clear stage-to-stage logic

Watch for:
- flow discontinuity
- component drift
- inconsistent hierarchy
- over-generic filler

#### Portrait Photo

Prioritize:
- identity stability
- pose clarity
- body framing
- gaze direction

Watch for:
- facial drift
- hand issues
- anatomy distortion
- camera-angle drift

#### Team or Group Photo

Prioritize:
- subject count stability
- believable spacing
- consistent lighting
- role balance

Watch for:
- missing or extra people
- warped anatomy
- inconsistent scale
- broken eye lines

#### Fashion Beauty Visual

Prioritize:
- skin/material finish
- grooming and styling coherence
- premium polish
- pose and crop control

Watch for:
- anatomy issues
- texture over-smoothing
- styling drift
- fake material rendering

#### Interior Space

Prioritize:
- spatial coherence
- lighting logic
- furniture/object proportion
- atmosphere consistency

Watch for:
- impossible geometry
- scale errors
- lighting mismatch
- clutter

#### Architecture Exterior

Prioritize:
- massing clarity
- facade consistency
- environment coherence
- perspective stability

Watch for:
- warped structures
- impossible angles
- repetitive artifacting
- fake detail

#### Character Portrait

Prioritize:
- recognizable character identity
- silhouette clarity
- expression control
- costume stability

Watch for:
- identity drift
- costume drift
- proportion drift
- style inconsistency

#### Character Sheet

Prioritize:
- reusable anchor set
- repeatable design traits
- multi-view stability
- sheet readability

Watch for:
- inconsistent proportions
- view-to-view drift
- styling drift
- cluttered layout

#### Storyboard Frame

Prioritize:
- shot clarity
- action readability
- framing intention
- temporal continuity

Watch for:
- ambiguous action
- weak focal point
- continuity drift
- clutter

#### Comic or Picturebook Page

Prioritize:
- page readability
- story clarity
- panel rhythm or page hierarchy
- character consistency

Watch for:
- panel confusion
- text/visual imbalance
- character drift
- weak storytelling

#### Game Card Key Art

Prioritize:
- clear hero subject
- strong silhouette
- collectible/readable composition
- polish and atmosphere

Watch for:
- muddy silhouette
- overloaded frame
- weak card readability
- generic fantasy noise

#### Brand Mascot Visual

Prioritize:
- mascot identity stability
- brand fit
- repeatable silhouette
- expression clarity

Watch for:
- brand drift
- silhouette inconsistency
- expression inconsistency
- costume/detail drift

## Resource Routing

This skill primarily routes through `SKILL.md`, with one reference file for input completion guidance.

- Use `Task Routing` to select the primary execution mode.
- Use `Information Model` to normalize the raw request.
- Use `Minimum Input Rules` to detect missing requirements.
- Read `references/input-fill-guide.md` when the user or system needs a fillable request template, allowed values, or field-by-field completion guidance.
- Read `references/input-fill-guide.md` first when the request starts as a fuzzy design goal and still needs `design_goal_brief` completion or scenario derivation.
- Run `scripts/run_skill_eval_checks.py` when you need a package-level contract check across YAML assets, golden outputs, dynamic example-to-output audits, ranking expectations, and metadata consistency.
- Use `Modifier Layer` to apply platform, safe-zone, and sequence behavior.
- Use `Scene Cards` to apply scene-specific shaping.
- Use `Output Contract` to package the final prompt set.
- Use `Validation` to review the package before returning it.
- Use `examples/` and `evals/` when adding or reviewing scenario-validation behavior so the same design goal is stress-tested across more than one scene.
- Use `examples/golden/` as the reference answer bank when checking whether a response keeps the right evidence, ranking logic, and recommendation shape.
- Use `Failure Handling / Escalation` when the request is underspecified or exceeds safe assumptions.

If the package later grows, keep long example banks, benchmark cases, or brand-specific patterns in `references/` rather than bloating this file.

## Critical Rules

- Treat text as data, not decoration.
- Keep hard constraints separate from preferences.
- Keep preserve instructions explicit for edit tasks.
- Keep reference-image roles explicit for composite tasks.
- Keep cross-frame invariants explicit for sequence tasks.
- Keep output section headings exact and verbatim; heading fidelity overrides localization or stylistic formatting preferences.
- Keep cover versus inner-frame differences intentional, not accidental.
- Keep cross-scenario invariants explicit for scenario-validation requests.
- Keep business use clearer than aesthetic ambition.
- Prefer one clear subject over a crowded subject list.
- Prefer a clean base prompt plus patch prompts over one overloaded prompt.
- Prefer a sequence package when the request clearly spans multiple pages or frames.
- Prefer two prompt variants at most: conservative and exploratory.
- Prefer assumptions to be stated outside the main prompt.
- Prefer evidence from the source brief over naming bias or reviewer intuition when comparison notes disagree.
- Keep safe-zone notes outside the main prompt prose when they are delivery constraints.
- Do not mix size, quality, or format settings into the prompt body.
- Do not hide exact wording inside descriptive prose.
- Do not use keyword soup or camera-spec dumping as the main control strategy.
- Do not promote platform names, placements, or aspect ratios to top-level routes.
- Do not let “make it nicer” override exact requirements.
- Do not let “creative” override preserve boundaries.

## Validation

Before finalizing the output, check:
- Is the delivery goal explicit?
- Is the task mode correct?
- Is the selected output mode correct for the request?
- If the output is default model-ready, does it contain `Web Prompt` and `Image Input Fields`?
- If the output is expanded, are the visible section headings exact literal matches to the required contract headings?
- Are the visible section headings free of localization, numbering, decorative prefixes, or parenthetical translations?
- Are hard constraints isolated?
- Is exact text isolated?
- Are preserve instructions explicit where needed?
- Are parameter suggestions outside the main prompt?

If the request is in scenario-validation mode, also check:
- If the request started as `design_goal_brief`, were the derived scenarios completed before comparison?
- Are there at least 3 complete scenario briefs?
- Does each scenario vary a meaningful risk surface instead of only swapping style words?
- Does each scenario sample keep its scenario-critical evidence visible?
- Are cross-scenario invariants explicit?
- Is the ranked order explicit?
- Are disagreements resolved by source evidence instead of voting?
- Does the recommendation cite scenario evidence rather than only using the scenario name?
- Is the recommended baseline scenario justified against the design goal?
- In default model-ready mode, does the response include a recommended route and one model-ready prompt/field set for that route?

Also check for scene-specific problems:
- text-language-edit: wording, hierarchy, placement, rewrite allowance
- sequence-asset-generate: cover hook, frame roles, cross-frame invariants, closing-frame behavior
- global-edit or localized-edit: change-only scope, preserve scope, nearby drift risk
- multi-image-composite: source roles, lighting match, scale match, perspective match
- ui-screen or ui-flow-set: realistic structure, no filler clutter
- product scene cards: silhouette, label, branding integrity
- short-video-cover or instagram-reel-cover: safe zones, thumbnail readability, mobile-first clarity
- xhs or instagram carousel scene cards: swipe progression, cover-to-inner consistency, feed or grid crop safety, native platform feel

Operational assumptions:
- `gpt-image-2` is strong at high-quality generation and editing, text-heavy imagery, compositing, and identity-sensitive edits
- precise text layout and strict composition can still fail
- local edits can drift if preserve boundaries are vague
- multi-turn refinement is often stronger than one overloaded prompt
- transparent background output is not a safe default

Note: this document can satisfy the structural section checks for `SKILL.md`, but strict package validation still requires `skill.yaml`, `examples/`, and `evals/` if the skill is promoted to formal status.

For package-level static validation, run:

```bash
python scripts/run_skill_eval_checks.py .
```

## Output Contract

Do not return only one long prompt unless the user explicitly asks for that.

There are three output modes:
- `model-ready` -> default whenever critical inputs are sufficient
- `expanded` -> only when the user explicitly asks for a full package, full report, review version, risk notes, patch notes, or explanation-heavy output
- `missing-fields` -> when critical inputs are missing or contradictory

Mode selection rules:
- If the user does not request a mode and the brief is sufficient, default to `model-ready`.
- In `model-ready`, return a direct Chinese web prompt plus structured image input fields.
- In `expanded`, use the detailed package or report contracts below.
- In `missing-fields`, do not emit a half-specified prompt package.

Heading fidelity rule for all visible contract sections:
- Use the required visible section headings exactly as written in this contract.
- Do not translate section headings.
- Do not append parenthetical translations to section headings.
- Do not add numbering prefixes to section headings.
- Do not add wrapper headings such as `单图提示词包`, `序列提示词包`, or any extra title line above the required contract headings.
- Do not replace section headings with localized equivalents such as `网页提示词`, `结构化字段`, `推荐路线`, `任务摘要`, or `页序计划`.
- If bilingual explanation is useful, keep it inside the section body, not in the section heading line.
- The safest behavior is to copy the required section heading lines verbatim from this contract.

### Missing-Fields Output

Use this shape when critical inputs are missing, conflicting, or too weak for a stable prompt.
Visible output must use exactly these section headings, in this order, with no wrapper title above them:
- `Missing Fields`
- `Why They Matter`
- `Next Input Template`

#### 1. Missing Fields

List only the blocking fields. Do not pad with minor nice-to-have items.

#### 2. Why They Matter

State one short reason per missing field, tied to execution risk such as text drift, preserve drift, role confusion, or platform crop risk.

#### 3. Next Input Template

Return a compact YAML fill-in template that contains only the missing or conflicting fields.

### Model-Ready Single-Image Output

Use this shape for all non-sequence routes when `model-ready` is selected.
Visible output must use exactly these section headings, in this order, with no wrapper title above them:
- `Web Prompt`
- `Image Input Fields`

#### 1. Web Prompt

Write one direct Chinese prompt that a human can paste into ChatGPT web.
Keep it concise, complete, and model-usable:
- lead with the delivery goal
- keep exact text explicit
- keep preserve boundaries explicit when editing
- keep exclusions explicit
- do not include review-only meta blocks such as risk notes or acceptance checklist

#### 2. Image Input Fields

Return a compact YAML block for downstream `gpt-image-2` input assembly.
Include only fields that materially affect execution, such as:
- `task_mode`
- `scene_card`
- `platform_surface`
- `delivery_goal`
- `subject`
- `main_prompt`
- `exact_text`
- `must_keep`
- `must_avoid`
- `references`
- `edit_scope`
- `safe_zone`
- `soft_preferences`
- `parameter_suggestions`

#### Section Identifier Map

- `web_prompt` -> `Web Prompt`
- `image_input_fields` -> `Image Input Fields`

#### Assertion Placement Guide

- `web_prompt_present` is observed in `Web Prompt`
- `image_fields_present` is observed in `Image Input Fields`
- `exact_text_isolated` is observed in `Image Input Fields` under `exact_text`
- `numbered_reference_roles` is observed in `Image Input Fields` under `references`
- `change_only_statement` is observed in `Image Input Fields` under `edit_scope.change_only`
- `keep_everything_else_the_same` is observed in `Image Input Fields` under `edit_scope.preserve`
- `safe_zone_guidance` is observed in `Image Input Fields` under `safe_zone`

### Model-Ready Sequence Output

Use this shape for `sequence-asset-generate` and for `sequence_brief` inputs when `model-ready` is selected.
`scene_card` alone must not upgrade a request into sequence output.
Visible output must use exactly these section headings, in this order, with no wrapper title above them:
- `Web Prompt`
- `Image Input Fields`

#### 1. Web Prompt

Write one direct Chinese prompt for ChatGPT web that keeps the whole sequence usable in one paste:
- state the sequence objective and target platform
- make frame roles explicit
- keep cover versus inner-frame behavior explicit
- keep cross-frame invariants explicit
- keep safe-zone behavior explicit when relevant

#### 2. Image Input Fields

Return a compact YAML block for downstream `gpt-image-2` input assembly.
Include only fields that materially affect execution, such as:
- `task_mode`
- `scene_card`
- `platform_surface`
- `delivery_goal`
- `subject`
- `modifiers`
- `sequence.frame_count`
- `sequence.frame_roles`
- `sequence.cover_goal`
- `sequence.ending_role`
- `sequence.cross_frame_invariants`
- `sequence.narrative_progression`
- `cover_prompt`
- `inner_frame_prompts`
- `safe_zone`
- `parameter_suggestions`

#### Section Identifier Map

- `web_prompt` -> `Web Prompt`
- `image_input_fields` -> `Image Input Fields`

#### Assertion Placement Guide

- `web_prompt_present` is observed in `Web Prompt`
- `image_fields_present` is observed in `Image Input Fields`
- `cover_hook_role` is observed in `Image Input Fields` under `sequence.cover_goal`
- `sequence_progression` is observed in `Image Input Fields` under `sequence.narrative_progression`
- `swipe_consistency` is observed in `Image Input Fields` under `sequence.cross_frame_invariants`
- `native_platform_aesthetic` is observed in `Image Input Fields` under `modifiers`

### Model-Ready Scenario Baseline Output

Use this shape when the request explicitly compares one design goal across multiple scenarios and `model-ready` is selected.
Visible output must use exactly these section headings, in this order, with no wrapper title above them:
- `Recommended Route`
- `Why This Route`
- `Web Prompt`
- `Image Input Fields`

#### 1. Recommended Route

Name the chosen baseline scenario.

#### 2. Why This Route

Summarize the ranked order and the decisive evidence in 2 to 5 short bullets or short sentences. Keep the reasoning tied to transferability, evidence fidelity, and execution risk.

#### 3. Web Prompt

Write one direct Chinese prompt for the recommended route only. Do not repeat the full comparison report here.

#### 4. Image Input Fields

Return a compact YAML block for the recommended route only. Include the chosen route label and only the fields needed to execute that route.

#### Section Identifier Map

- `recommended_route` -> `Recommended Route`
- `why_this_route` -> `Why This Route`
- `web_prompt` -> `Web Prompt`
- `image_input_fields` -> `Image Input Fields`

#### Assertion Placement Guide

- `baseline_recommendation` is observed in `Recommended Route`
- `ranked_order_visible` is observed in `Why This Route`
- `decision_evidence_visible` is observed in `Why This Route`
- `web_prompt_present` is observed in `Web Prompt`
- `image_fields_present` is observed in `Image Input Fields`

### Expanded Scenario Validation Report

Use this shape only when the user explicitly asks for a full scenario report, review version, or evidence-heavy comparison output.
Visible output must use exactly these section headings, in this order, with no wrapper title above them:
- `Design Goal`
- `Scenario Matrix`
- `Scenario Samples`
- `Cross-Check Findings`
- `Recommended Baseline`
- `Failure Risks`
- `Next Patches`
- `Acceptance Checklist`

### Expanded Single-Image Prompt Package

Use this shape for all non-sequence routes only when `expanded` is selected.
Visible output must use exactly these section headings, in this order, with no wrapper title above them:
- `Task Summary`
- `Main Prompt`
- `Hard Constraint Block`
- `Soft Preference Block`
- `Parameter Suggestions`
- `Risk Notes`
- `Iteration Patches`
- `Acceptance Checklist`

### Expanded Sequence Prompt Package

Use this shape for `sequence-asset-generate` and for `sequence_brief` inputs only when `expanded` is selected.
Visible output must use exactly these section headings, in this order, with no wrapper title above them:
- `Sequence Brief`
- `Frame Plan`
- `Cover Prompt`
- `Inner-Frame Prompts`
- `Cross-Frame Invariants`
- `Safe-Zone Notes`
- `Platform Behavior Notes`
- `Parameter Suggestions`
- `Risk Notes`
- `Iteration Patches`
- `Acceptance Checklist`

If the user explicitly wants only one prompt, collapse the package into one prompt while preserving:
- delivery goal first
- exact text explicitly
- preserve language for edits
- exclusions directly
- stable sentence order
- frame-by-frame separation when the request is actually a sequence

Invalid heading examples that must not appear:
- `# 序列提示词包`
- `## 1. 序列简述`
- `## Web Prompt（网页提示词）`
- `## Image Input Fields（结构化字段）`
- `## Recommended Route（推荐路线）`
- `## Task Summary（任务摘要）`
- `## Main Prompt（主提示词）`
- `Sequence Brief（序列摘要）`

## Failure Handling / Escalation

If the request is missing critical information:
- do not silently guess
- return the missing fields or state the assumptions

If the request has conflicting requirements:
- identify the conflict explicitly
- tell which requirement blocks a stable prompt

If the request asks for unsupported or unsafe assumptions:
- say so directly
- offer the closest reliable alternative

Examples:
- transparent background requirement for `gpt-image-2`
- exact local edit boundary without enough preserve information
- text-heavy poster without exact text
- multi-image composite without per-image roles
- multi-frame sequence without frame count or frame roles
- platform cover request without crop or safe-zone expectations
- scenario validation request without 3 complete scenario briefs

When the request is too broad, reduce ambiguity by:
- choosing one primary task mode
- moving the rest into constraints
- offering conservative and exploratory variants only when useful

## Upgrade Policy

Stable core:
- task routing before prompt writing
- single-image versus sequence package selection before prompt writing
- scenario-based comparison only when explicitly requested
- hard and soft constraint separation
- exact text isolation
- explicit preserve rules for edits
- parameter separation from prompt prose
- prompt package output instead of prompt-only output

Evolvable parts:
- the list of task modes
- scene cards
- modifier sets
- recommended patch patterns
- validation heuristics
- scenario count and comparison heuristics
- packaging details once formal governance assets are added

When upgrading this skill:
- preserve trigger clarity in `description`
- preserve the package-oriented output contract
- simplify prose if the same behavior can be expressed more compactly
- move heavy examples to `references/`, `examples/`, or `evals/` instead of bloating `SKILL.md`
- rerun `quick_validate.py` after structural changes
- rerun `quick_validate.py --strict` only after adding `skill.yaml`, `examples/`, and `evals/`
