# Reference Governance

This file defines lightweight maintenance rules for reference material inside
`codegen-governance`.

Its purpose is to keep durable guidance, examples, and historical notes from
drifting back into one mixed bucket.

---

## 1. Classification Model

Every file in the skill should be treated as one of these classes:

1. **Normative core**
   - workflow, severity model, source-priority, exception policy, templates
2. **Durable semantic guidance**
   - language-level or runtime-level rules expected to stay useful across many repos
3. **Scenario guidance**
   - recurring risk patterns that cut across languages or environments
4. **Illustrative assets**
   - examples, fixtures, eval cases, regression assets
5. **Historical or maintainer context**
   - roadmap, changelog, development notes

Do not blur these classes without a good reason.

---

## 2. Folder-Level Intent

### Core references

Files in `references/` root are for durable workflow and conflict-resolution rules.

They should:

- stay short
- avoid ecosystem churn
- avoid repo-specific commands unless the advice is explicitly repo-aware and non-blocking
- avoid framework-specific ownership rules unless they are central to the main workflow

### Language rules and prohibited patterns

Files in `references/lang-rules/` and `references/prohibited-patterns/` are for
durable language or framework semantics.

They should:

- prefer official language or framework behavior over team preference
- avoid turning one tool or library into a universal requirement
- avoid repo-specific commands except as non-blocking validation hints
- stay focused on semantics, traps, and high-cost mistakes

### Environment rules

Files in `references/env-rules/` are for reusable runtime or framework ownership
patterns.

They should:

- capture recurring environment mistakes
- stay reusable across many repos
- keep tool suggestions repo-aware and non-blocking
- avoid becoming framework encyclopedias

### Scenario packs

Files in `references/scenario-*.md` are for reusable risk shapes.

They should:

- encode recurring implementation risks
- avoid language- or framework-exclusive trivia
- prefer patterns that show up in more than one repo or stack

### Examples, evals, and fixtures

These are illustrative assets, not normative references.

They should:

- demonstrate the rules
- test the workflow
- never silently become the source of truth

If an example conflicts with a rule, fix the example first.

### Development, roadmap, and changelog

These are historical or maintainer context assets.

They should not define live behavioral requirements for the skill.

---

## 3. What Is Allowed To Be Repo-Specific

Repo-specific material is allowed only in a narrow form:

- repo-aware validation hints
- explicit examples or fixtures
- maintainer notes explaining how local regression assets are organized

Repo-specific material should **not** define universal behavior in:

- core rules
- language semantics
- prohibited patterns

If a rule depends on a repo's current toolchain, say so explicitly.

---

## 4. Promotion Rules

Promote a rule into durable references only when at least one of these is true:

- it is anchored in official documentation or language semantics
- it captures a recurring high-cost mistake seen across more than one repo
- it remains useful even if the exact framework version changes

Keep a rule in examples, fixtures, or maintainer notes when:

- it depends on one project's exact stack
- it is mainly a regression case
- it is too version-sensitive to be trusted as durable guidance
- it is still exploratory

---

## 5. Demotion Rules

Demote or remove guidance when:

- it conflicts with official semantics
- it encodes a tool preference as if it were universal truth
- it widens patch-safe tasks into modernization work by default
- it duplicates another file without adding a clearer scope boundary
- it has no strong reason to live outside examples or eval assets

---

## 6. Update Checklist

When editing or adding a reference file, check:

1. What class does this file belong to?
2. Is the guidance durable, or only illustrative?
3. Does it depend on official semantics, or on a team/tool preference?
4. Could it force broader refactors in a patch-safe task?
5. Should it be a rule, an environment note, a scenario pack note, or just an example?

If the answer is "mostly example" or "mostly project-specific", do not promote it into durable guidance.

---

## 7. Relationship To Other Files

Use these companion references together:

- [durable-reference-index.md](./durable-reference-index.md) for classification and placement
- [source-priority.md](./source-priority.md) for conflict resolution
- [exception-policy.md](./exception-policy.md) for deciding whether guidance stays non-blocking

This governance file is for maintainers. It should constrain how we curate the skill,
not how the runtime model solves a user's coding task.

