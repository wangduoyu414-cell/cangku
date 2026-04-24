# Durable Reference Index

This file classifies which references in `codegen-governance` are intended to remain stable over time, which are environment-specific but reusable, and which are primarily examples or roadmap assets.

Use this index when deciding where new long-lived guidance belongs.

Companion file:

- [reference-governance.md](./reference-governance.md)

---

## 1. Stable Core Rules

These are the most durable references in the skill. They define the workflow, severity model, and conflict-resolution rules.

- [base-rules.md](./base-rules.md)
- [source-priority.md](./source-priority.md)
- [exception-policy.md](./exception-policy.md)
- [environment-routing.md](./environment-routing.md)
- [scenario-selection.md](./scenario-selection.md)
- [pre-generation-contract-template.md](./pre-generation-contract-template.md)
- [implementation-report-template.md](./implementation-report-template.md)
- [schema-contract.yaml](./schema-contract.yaml)

These files should stay small, conservative, and resistant to framework churn.

Use [reference-governance.md](./reference-governance.md) to decide what is allowed to move into this layer.

---

## 2. Durable Language Semantics

These files capture language-level semantics that are likely to stay useful across many repos and versions.

- [lang-rules/python.md](./lang-rules/python.md)
- [lang-rules/go.md](./lang-rules/go.md)
- [lang-rules/typescript.md](./lang-rules/typescript.md)
- [lang-rules/vue.md](./lang-rules/vue.md)

- [prohibited-patterns/python.md](./prohibited-patterns/python.md)
- [prohibited-patterns/go.md](./prohibited-patterns/go.md)
- [prohibited-patterns/typescript.md](./prohibited-patterns/typescript.md)
- [prohibited-patterns/vue.md](./prohibited-patterns/vue.md)

Keep these aligned with official language or framework docs and avoid repo-specific tooling assumptions unless clearly labeled as recommendations.

---

## 3. Reusable Environment Guidance

These files are environment-specific, but still intended for repeated long-term use because they cover common runtime ownership patterns rather than one-off project details.

### Base Environment Layers

- [env-rules/python.md](./env-rules/python.md)
- [env-rules/go.md](./env-rules/go.md)
- [env-rules/typescript.md](./env-rules/typescript.md)
- [env-rules/vue.md](./env-rules/vue.md)
- [environment-coverage-index.md](./environment-coverage-index.md)

### High-Frequency Specializations

- [env-rules/python-web.md](./env-rules/python-web.md)
- [env-rules/python-worker.md](./env-rules/python-worker.md)
- [env-rules/python-cli-config.md](./env-rules/python-cli-config.md)
- [env-rules/go-http.md](./env-rules/go-http.md)
- [env-rules/go-db-io.md](./env-rules/go-db-io.md)
- [env-rules/go-concurrency.md](./env-rules/go-concurrency.md)
- [env-rules/typescript-api-client.md](./env-rules/typescript-api-client.md)
- [env-rules/typescript-node-runtime.md](./env-rules/typescript-node-runtime.md)
- [env-rules/typescript-browser-runtime.md](./env-rules/typescript-browser-runtime.md)
- [env-rules/vue-router-store.md](./env-rules/vue-router-store.md)
- [env-rules/vue-ssr-hydration.md](./env-rules/vue-ssr-hydration.md)

These should encode recurring ownership and boundary mistakes, not narrow framework trivia.

---

## 4. Scenario Packs

These files are durable as long as the four-pack model remains stable:

- [scenario-input-branching.md](./scenario-input-branching.md)
- [scenario-fallback-contract.md](./scenario-fallback-contract.md)
- [scenario-side-effect-runtime.md](./scenario-side-effect-runtime.md)
- [scenario-boundary-observability.md](./scenario-boundary-observability.md)

Add new high-frequency patterns here when they apply across languages or across multiple environments.

---

## 5. Examples and Fixtures

These are valuable, but they are not normative references. They should demonstrate the rules, not define them.

- `examples/`
- external fixture library validated by `scripts/validate_fixture_library.py`
- `skills/audit/evals/`
- `evals/`

When examples conflict with rules, fix the examples. Do not silently treat examples as the source of truth.

---

## 6. Development and Roadmap Assets

These are useful for maintainers, but they are not long-term normative rule files:

- [development-guide.md](./development-guide.md)
- [v0.3-roadmap.md](./v0.3-roadmap.md)
- [../CHANGELOG.md](../CHANGELOG.md)

Use these to explain evolution, not to encode live behavioral requirements.

---

## 7. Placement Rule For New Material

When adding a new file, choose its home with this order:

1. Stable cross-language workflow rule -> put it in the core rules
2. Stable language semantic rule -> put it in `lang-rules/` or `prohibited-patterns/`
3. Stable runtime/framework ownership rule -> put it in `env-rules/`
4. Concrete scenario pattern -> put it in the relevant scenario pack
5. Example, fixture, or regression asset -> keep it outside normative rule files
6. Historical note or planning note -> keep it in development or roadmap docs

---

## 8. Official Alignment Notes

When updating durable files, prefer guidance that remains valid across versions and repos:

- language semantics from official docs
- framework constraints that are explicitly documented as required behavior
- toolchain suggestions only when they remain repo-aware and non-blocking

Avoid turning one ecosystem tool or one team preference into a universal rule.

