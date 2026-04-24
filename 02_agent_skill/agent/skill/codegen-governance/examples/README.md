# Examples: Contract and Report Samples

This directory contains examples of pre-generation contracts and implementation reports for different languages and scenarios.

## Protocol Status

- Anchor-based templates in `references/pre-generation-contract-template.md` and
  `references/implementation-report-template.md` are the canonical machine-checked protocol.
- Report examples already follow the anchor protocol.
- `good-contract-minimal-typescript.md`, `good-contract-minimal-python.md`, `good-contract-minimal-go.md`, and `good-contract-minimal-vue.md` are the reference examples for `minimal` contract depth.
- Contract examples are being migrated. When validating contract structure, prefer the
  canonical template and any example that contains `##-Contract-Metadata` style anchors.
- Legacy narrative contract examples remain useful for domain reasoning, but they are not
  the source of truth for parser-facing structure.

---

## File Structure

- `good-contract-python.md` - Python function implementation contract
- `good-contract-go.md` - Go function implementation contract
- `good-contract-typescript.md` - TypeScript function implementation contract
- `good-contract-vue.md` - Vue component implementation contract
- `good-contract-patch-update.md` - Partial update / PATCH semantics contract
- `good-contract-http-client.md` - Outbound HTTP client contract
- `good-contract-idempotency.md` - Cache-backed idempotency contract
- `good-contract-time-money.md` - Time, money, and precision contract
- `good-contract-file-export.md` - File export and encoding contract
- `good-contract-audit-redaction.md` - Audit redaction contract
- `good-contract-batch-partial-success.md` - Batch partial-success contract
- `good-contract-webhook-worker.md` - Webhook / worker delivery contract
- `good-contract-typescript-browser-runtime.md` - Browser runtime and DOM-boundary contract
- `good-contract-vue-ssr-hydration.md` - SSR-safe Vue hydration contract
- `good-contract-minimal-typescript.md` - Minimal-path TypeScript micro-edit contract
- `good-contract-minimal-python.md` - Minimal-path Python micro-edit contract
- `good-contract-minimal-go.md` - Minimal-path Go micro-edit contract
- `good-contract-minimal-vue.md` - Minimal-path Vue micro-edit contract
- `bad-contract-annotated.md` - Common contract issues with annotations
- `good-report-typescript.md` - Implementation report with honest validation distinction
- `bad-report-fake-validation.md` - Implementation report that falsely claims validation
- `bad-report-missing-distinction.md` - Implementation report missing the non-negotiable distinction section

---

## How to Use These Examples

Use the contract examples to compare:

1. Whether all required fields are filled
2. Whether scenario pack selection is justified
3. Whether edge cases and side effects are explicit
4. Whether the validation plan is concrete

Use the report examples to compare:

1. Whether executed validation is specific and honest
2. Whether skipped validation is clearly separated
3. Whether Validation Distinction is present and machine-checkable
4. Whether contract deviations and residual risks are explicit

---

## Key Quality Indicators

A good contract:

- Has all MUST fields completed
- Provides specific reasoning for pack selection
- Distinguishes between different failure modes
- Documents side effects explicitly
- Includes executable validation steps
- Surfaces unknowns instead of hiding them

A bad contract:

- Has fields marked as `TBD` or `to be determined`
- Uses vague language like `handle appropriately`
- Selects all packs without justification
- Claims validation will be done without specifying how
- Ignores known edge cases

A good report:

- Lists only validation that actually ran
- Separates executed and not-run validation cleanly
- Keeps discrepancy at `0`
- States residual risks without pretending they were covered

A bad report:

- Claims a test ran and also lists it as skipped
- Omits Validation Distinction
- Uses vague validation results like `passed` with no evidence
