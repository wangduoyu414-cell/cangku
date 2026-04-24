# Changelog

## Unreleased

### Added

- Expanded high-frequency scenario coverage without adding new primary language stacks.
- Added `scripts/suggest_validation_plan.py` to infer repo-aware validation commands from local Python, Go, Node, TypeScript, and Vue tooling.
- Added first-phase sub-scenarios:
  - patch / partial update semantics
  - outbound HTTP contract
  - cache / idempotency / duplicate suppression
- Added second-phase sub-scenarios:
  - time / money / precision
  - file import / export
  - audit redaction / stable diagnostics
- Added third-phase sub-scenarios:
  - batch partial success
  - async worker / webhook delivery
- Added fourth-phase sub-scenarios:
  - config / env precedence
  - sorting / aggregation
- Added contract examples:
  - `examples/good-contract-patch-update.md`
  - `examples/good-contract-http-client.md`
  - `examples/good-contract-idempotency.md`
  - `examples/good-contract-time-money.md`
  - `examples/good-contract-file-export.md`
  - `examples/good-contract-audit-redaction.md`
  - `examples/good-contract-batch-partial-success.md`
  - `examples/good-contract-webhook-worker.md`
- Added runnable fixtures under the configurable fixture library root (`CODEGEN_GOVERNANCE_FIXTURES_ROOT`, legacy `CODEGEN_EXECUTION_CONSTRAINT_FIXTURES_ROOT`, or `--fixtures-root`), including:
  - `python-refund-dispatch`
  - `python-config-precedence`
  - `python-sorting-summary`
  - `python-config-stack-precedence`
  - `profile-patch-sync`
  - `ledger-export-audit`
  - `python-import-reject-summary`
  - `python-bucketed-topn-page`
  - `webhook-batch-worker`
  - `go-config-precedence`
  - `go-sorting-summary`
  - `go-schema-version-compat`
  - `go-local-lock-claim`
  - `javascript-listener-registry`
  - `vue-preference-fallback-panel`

### Changed

- Updated trigger heuristics in `scripts/eval_trigger_and_scenario.py` to reduce false positives on explanation and design prompts.
- Updated scenario selection heuristics in `scripts/eval_trigger_and_scenario.py` to reduce broad keyword over-selection and prefer explicit high-frequency sub-scenarios.
- Expanded pre-generation contract scope expectations with edit-vs-new change mode and explicit contract drift tracking.
- Updated sample-library coverage documentation and regression script to include the new JavaScript and Vue fixtures plus repo-aware validation-plan smoke checks.
- Expanded `evals/trigger.json` to 20 trigger cases and 16 non-trigger cases.
- Expanded `evals/scenario-selection-cases.json` to 26 scenario-selection cases.
- Expanded `evals/tasks.json` to 35 task-structure cases.
- Updated `references/scenario-selection.md` and sample-library coverage docs to document config/env precedence and sorting/aggregation guidance.
- Updated `examples/README.md` to include the newly added contract examples.

### Fixed

- Preserved Windows UTF-8 console output compatibility for eval tooling.
- Corrected scenario-selection edge cases around PATCH semantics, outbound HTTP, file export, audit redaction, batch processing, and webhook worker delivery.
- Ensured contract/report quality checks correctly score fully populated outputs and avoid misclassifying resolved metadata comments as placeholders.
- Strengthened contract/report checks to reject missing required subfields and explicit edit-scope drift metadata.
