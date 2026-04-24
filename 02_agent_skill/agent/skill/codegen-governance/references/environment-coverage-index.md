# Environment Coverage Index

This file maps environment-specific guidance in `references/env-rules/` to the
closest existing examples and runnable fixtures.

Its purpose is to make environment rules easier to validate and maintain without
requiring a large new fixture surface all at once.

---

## How To Use This Index

When editing or expanding an environment-specific rule file:

1. Check whether an existing example already demonstrates the intended contract.
2. Check whether an existing runnable fixture already exercises the same runtime risk.
3. If neither exists, decide whether the gap is important enough to justify a new example or fixture.

Prefer reusing existing coverage before creating new assets.

---

## Python Environment Rules

### `env-rules/python.md`

- Closest examples:
  - [good-contract-python.md](../examples/good-contract-python.md)
  - [good-contract-webhook-worker.md](../examples/good-contract-webhook-worker.md)
- Closest runnable fixtures:
  - `python-refund-dispatch`
  - `python-config-precedence`
  - `python-config-stack-precedence`
  - `webhook-batch-worker`

### `env-rules/python-web.md`

- Closest examples:
  - [good-contract-http-client.md](../examples/good-contract-http-client.md)
  - [good-contract-webhook-worker.md](../examples/good-contract-webhook-worker.md)
- Closest runnable fixtures:
  - `python-user-response-handler`
  - `python-refund-dispatch`
  - `python-config-precedence`
  - `python-schema-version-compat`

### `env-rules/python-worker.md`

- Closest examples:
  - [good-contract-webhook-worker.md](../examples/good-contract-webhook-worker.md)
  - [good-contract-idempotency.md](../examples/good-contract-idempotency.md)
- Closest runnable fixtures:
  - `webhook-batch-worker`
  - `python-refund-dispatch`

### `env-rules/python-cli-config.md`

- Closest examples:
  - [good-contract-patch-update.md](../examples/good-contract-patch-update.md)
- Closest runnable fixtures:
  - `python-config-precedence`
  - `python-config-stack-precedence`

---

## Go Environment Rules

### `env-rules/go.md`

- Closest examples:
  - [good-contract-go.md](../examples/good-contract-go.md)
  - [good-contract-http-client.md](../examples/good-contract-http-client.md)
- Closest runnable fixtures:
  - `go-config-precedence`
  - `go-schema-version-compat`
  - `go-local-lock-claim`

### `env-rules/go-http.md`

- Closest examples:
  - [good-contract-http-client.md](../examples/good-contract-http-client.md)
  - [good-contract-time-money.md](../examples/good-contract-time-money.md)
- Closest runnable fixtures:
  - `go-settlement-response`
  - `go-config-precedence`

### `env-rules/go-db-io.md`

- Closest examples:
  - [good-contract-file-export.md](../examples/good-contract-file-export.md)
  - [good-contract-batch-partial-success.md](../examples/good-contract-batch-partial-success.md)
- Closest runnable fixtures:
  - `go-audit-stream-export`
  - `ledger-export-audit`
  - `go-payout-batch`

### `env-rules/go-concurrency.md`

- Closest examples:
  - [good-contract-idempotency.md](../examples/good-contract-idempotency.md)
  - [good-contract-batch-partial-success.md](../examples/good-contract-batch-partial-success.md)
- Closest runnable fixtures:
  - `go-local-lock-claim`
  - `go-payout-batch`

---

## TypeScript and JavaScript Environment Rules

### `env-rules/typescript.md`

- Closest examples:
  - [good-contract-typescript.md](../examples/good-contract-typescript.md)
  - [good-contract-http-client.md](../examples/good-contract-http-client.md)
- Closest runnable fixtures:
  - `typescript-partner-sync`
  - `javascript-feature-toggle-cache`
  - `javascript-listener-registry`

### `env-rules/typescript-api-client.md`

- Closest examples:
  - [good-contract-http-client.md](../examples/good-contract-http-client.md)
  - [good-contract-idempotency.md](../examples/good-contract-idempotency.md)
- Closest runnable fixtures:
  - `typescript-partner-sync`

### `env-rules/typescript-node-runtime.md`

- Closest examples:
  - [good-contract-audit-redaction.md](../examples/good-contract-audit-redaction.md)
  - [good-contract-idempotency.md](../examples/good-contract-idempotency.md)
- Closest runnable fixtures:
  - `javascript-feature-toggle-cache`
  - `javascript-listener-registry`

### `env-rules/typescript-browser-runtime.md`

- Closest examples:
  - [good-contract-typescript-browser-runtime.md](../examples/good-contract-typescript-browser-runtime.md)
  - [good-contract-vue.md](../examples/good-contract-vue.md)
- Closest runnable fixtures:
  - `typescript-browser-sidebar-preference`
  - `vue-export-panel`
  - `vue-preference-fallback-panel`

---

## Vue Environment Rules

### `env-rules/vue.md`

- Closest examples:
  - [good-contract-vue.md](../examples/good-contract-vue.md)
  - [good-contract-file-export.md](../examples/good-contract-file-export.md)
- Closest runnable fixtures:
  - `vue-export-panel`
  - `vue-preference-fallback-panel`

### `env-rules/vue-router-store.md`

- Closest examples:
  - [good-contract-vue.md](../examples/good-contract-vue.md)
  - [good-contract-patch-update.md](../examples/good-contract-patch-update.md)
- Closest runnable fixtures:
  - `vue-preference-fallback-panel`

### `env-rules/vue-ssr-hydration.md`

- Closest examples:
  - [good-contract-vue-ssr-hydration.md](../examples/good-contract-vue-ssr-hydration.md)
  - [good-contract-vue.md](../examples/good-contract-vue.md)
- Closest runnable fixtures:
  - `vue-promo-banner-ssr`
  - `vue-export-panel`

---

## Gaps Worth Prioritizing Later

These environment files still have the most visible remaining runnable-coverage gaps:

1. `env-rules/go-db-io.md`
   - stream lifecycle is now covered, but a database-transaction fixture is still missing

These are the best candidates for future example or fixture expansion.
