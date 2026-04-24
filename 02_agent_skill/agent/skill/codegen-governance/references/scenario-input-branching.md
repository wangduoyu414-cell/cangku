# Scenario Pack: Input And Branching

Use this pack when code reads, interprets, transforms, orders, or aggregates data.

> **Language-Specific Note on Falsy Checks:**
> - For Python: Falsy checks are idiomatic. `if not value:`, `if items:`, `if not count:` are correct Python. Only add explicit `is None` checks when `None` carries specific business meaning.
> - For Go, TypeScript, JavaScript, and Vue: Distinguish falsy values explicitly. See rules below.

## Input Handling

### Language-Agnostic Rules

- Distinguish missing, explicitly empty, valid zero-like values, and invalid values before downstream logic.
- Do not assume fields exist, arrays are non-empty, or formats are stable.
- Replace loose parsing with explicit parsing plus explicit validation.
- If optional chaining or defaults are used, verify they do not mask missing required data.

### Non-Python Rules (Go, TypeScript, JavaScript, Vue)

- Do not use lazy truthy checks that misclassify `0`, `false`, or empty string.
- Use explicit `===` comparisons for value discrimination.

### Python Rules

- Falsy checks are idiomatic Python. `if not value:`, `if items:`, `if not count:` are correct.
- Only enforce distinction between falsy values when `None` carries specific business meaning (e.g., "not yet computed" vs "computed as empty").

### High-Frequency Sub-Scenario: Patch And Update Inputs

- Define absent field, explicit null, explicit empty, explicit false, and explicit zero semantics before merging with existing state.
- Keep clear, retain, replace, append, and remove semantics distinct. Do not overload one sentinel value to mean several update behaviors.
- Validate field-level semantics after presence semantics are resolved, not by broad truthy checks that collapse explicit updates.
- If the update payload inherits existing state, state which fields may be omitted safely and which fields must be sent explicitly.
- Keep the raw patch payload distinct from the merged result so later logic can still tell what the caller actually sent.

## Branching And Comparison

- Keep conditions readable, mutually understandable, and as complete as the domain allows.
- Do not let branch order silently encode business priority.
- Handle unknown, future, and exceptional enum values explicitly.
- Keep success, failure, empty, and downgrade branches behaviorally predictable.
- Sorting and comparison logic must be stable and explainable.

## Parsing And Transformation

- Keep validation, normalization, conversion, fallback, and display formatting conceptually separate.
- Do not rely on implicit type conversion for semantic decisions.
- Normalize consistently before comparing, deduping, sorting, or building cache keys.
- Do not treat an irreversible transformed value as if it were still the raw value.
- Do not use simple string tricks as a substitute for real protocol parsing when the format is not tightly controlled.

### High-Frequency Sub-Scenario: File Import And Export Inputs

- Validate filenames, relative paths, extensions, and row shapes before touching the filesystem.
- Distinguish raw file bytes, decoded text, parsed records, normalized records, and exported display strings.
- Keep delimiter, header, encoding, and newline assumptions explicit when handling CSV-, TSV-, or line-oriented data.
- Reject malformed rows, unknown columns, or mixed-format records under explicit rules rather than silently best-effort coercion.
- Treat output filenames and export filters as caller input with the same rigor as request payloads.

## Collections And Aggregation

- Do not assume runtime iteration order equals business order.
- Define behavior for empty collections, duplicates, extreme values, and invalid elements.
- Keep batch results explicit about success, failure, skip, and partial success.
- Avoid shared temporary state leaking across items.

### High-Frequency Sub-Scenario: Batch Item Classification

- Define whether an item is accepted, skipped, rejected, retried later, or sent to dead-letter storage.
- Keep per-item validation separate from whole-batch control flow so one malformed record does not silently rewrite the meaning of other records.
- State whether duplicate items inside one batch are rejected, deduped, replayed, or treated as separate attempts.
- If ordering matters, define whether item order is preserved, canonicalized, or intentionally ignored.

## Explain Before Coding

State:

- the accepted input shape
- how absent, clear, retain, replace, and remove semantics differ for partial updates
- how unknown and invalid values are handled
- branch or ordering rules
- where normalization happens
- which file/path, row-shape, delimiter, or record-shape assumptions apply
- how batch items are classified and whether ordering is significant
- how empty and duplicate collections behave
- language-specific rules applied (yes/no) and which language
