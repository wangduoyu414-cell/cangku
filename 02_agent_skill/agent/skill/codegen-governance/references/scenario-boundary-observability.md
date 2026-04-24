# Scenario Pack: Boundary And Observability

Use this pack when code crosses formatting, protocol, environment, or diagnostic boundaries.

## Base Value Domains

- Make units, timezone, precision, truncation, and comparison rules explicit.
- Do not rely on loose date parsing, implicit locale behavior, or default sort semantics.
- Normalize scale and precision before comparing timestamps, counts, ratios, or money-like values.
- String handling should consider Unicode, whitespace, case rules, encoding, separators, and invisible characters.
- Do not use sentinel values, randomness, or current time as a hidden business-state shortcut.

### High-Frequency Sub-Scenario: Time, Money, And Precision

- State canonical timezone, accepted timezone inputs, and whether naive timestamps are rejected or normalized.
- State the business precision: integer minor units, decimal string, fixed scale, rounding mode, and comparison scale.
- Keep storage values, comparison values, and display/export values conceptually separate.
- Do not let locale defaults, host timezone, float rounding, or implicit decimal conversion change business meaning.

## External Boundaries And Serialization

- Treat URLs, paths, HTML, Markdown, JSON, templates, and API payloads according to their real protocol semantics.
- Separate display, storage, comparison, transport, and escaping contexts.
- Do not assume external response shapes are permanently stable.
- Make information loss, escaping layers, and security boundaries explicit.
- Reject or quarantine unknown fields when silent passthrough would be risky.

### High-Frequency Sub-Scenario: Outbound HTTP And Status Mapping

- Make URL construction, method, headers, timeout units, and request body encoding explicit.
- Distinguish transport failure, timeout, retry exhaustion, non-2xx status, and response-schema mismatch.
- Document whether upstream 4xx, 429, and 5xx statuses are surfaced, retried, downgraded, or translated to stable local result codes.
- Do not log raw secrets, tokens, or full untrusted payloads by default when diagnosing boundary failures.

### High-Frequency Sub-Scenario: File Format, Encoding, And Export Boundaries

- Make extension, delimiter, quoting, newline, BOM, and text encoding explicit for imported or exported files.
- Distinguish raw stored values from human-readable exported values, especially for timestamps and money-like fields.
- Do not let path joining, host newline defaults, or implicit encoding selection decide business-visible output.
- Reject or quarantine unknown columns and malformed rows when silent passthrough would create irreversible data drift.

### High-Frequency Sub-Scenario: Webhook Boundary Semantics

- Define signature or authenticity checks, delivery identifiers, provider retry behavior assumptions, and event ordering expectations.
- Distinguish whole-delivery rejection from per-item rejection when providers bundle several events into one payload.
- Do not assume provider payload order is business order unless the protocol guarantees it.
- Keep raw provider payload, normalized internal event shape, and emitted audit schema conceptually separate.

## Logs, Telemetry, And Audit

- Logging and telemetry must not change business behavior or exception flow.
- Failure paths should preserve diagnosable signal without leaking sensitive data.
- Log field names, types, and meanings should stay stable.
- Temporary debug hooks and test helpers must not survive as production logic.
- Audit events should align with the real business result, not a merely attempted action.

### High-Frequency Sub-Scenario: Audit Events For Retries And Duplicates

- Use stable event names for retry scheduled, duplicate suppressed, cached replay, success, and terminal failure when those states matter.
- Audit events should describe the actual outcome, not the hopeful intention before the boundary confirmed it.
- Record enough correlation fields to trace retries and duplicate suppression without leaking secrets or unrelated payload data.

### High-Frequency Sub-Scenario: Audit Redaction And Stable Diagnostics

- Define which identifiers, contact fields, tokens, payload fragments, or raw records must be redacted, hashed, omitted, or retained.
- Keep diagnostic usefulness explicit: enough signal to trace the event, but not enough raw data to recreate sensitive content.
- Redaction rules must stay stable across success and failure paths so the operator experience does not leak extra data only on errors.
- Do not treat "temporary debug logging" as an acceptable substitute for a documented audit schema.

### High-Frequency Sub-Scenario: Batch Outcome Audit

- Audit summaries should expose processed, skipped, failed, retried, and dead-letter counts under stable field names.
- Batch-level audit must not claim full success when some items were rejected or deferred.
- If per-item audit is emitted, define whether it happens for every item, only failures, or only dead-letter transitions.

## Explain Before Coding

State:

- value-domain assumptions such as unit, timezone, precision, or encoding
- boundary protocol and serialization expectations
- how outbound status codes or schema failures are mapped locally
- whether security or escaping rules apply
- what will be logged, emitted, or intentionally omitted
- how redaction, hashing, masking, or omission rules are applied to audit data
- whether retries, duplicates, or cached replays create distinct audit signals
- whether batch, webhook, or worker outcomes have distinct boundary and audit semantics
