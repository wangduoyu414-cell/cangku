# Scenario Pack: Fallback And Contract

Use this pack when code can downgrade, recover, return structured results, or hide failure behind compatibility logic.

## Defaults, Fallback, And Downgrade

- Defaults may fill a clearly defined absence, but must not hide unknown errors, invalid input, or missing dependencies.
- Distinguish no value, empty result, failure, miss, skip, and downgrade.
- Do not let fallback silently change business meaning.
- If compatibility or downgrade paths exist, the caller must be able to detect them through the result, status, error type, or logs.
- Do not widen the accepted input domain just to keep code running.

### High-Frequency Sub-Scenario: Patch Merge Defaults

- Defaults may apply only to true absence, not to explicit clear or invalid values, unless the contract says otherwise.
- When patching existing state, define whether missing fields retain prior values or inherit computed defaults.
- Do not let merge helpers silently rewrite explicit `null`, empty string, `false`, or `0` into fallback values.
- If effective values differ from caller-supplied values because of defaults, the caller must be able to observe that fact through the returned result or audit signal.

## Return Contract

- Keep return semantics stable across branches.
- Do not switch unpredictably between throw, null, boolean, and object for the same function.
- Distinguish empty result, failure, miss, skip, partial success, and full success.
- Result object fields should appear under stable and explainable rules.
- Boolean returns should only express simple true or false, not many business states collapsed into one bit.

### High-Frequency Sub-Scenario: Duplicate And Cached Outcomes

- Distinguish fresh success, duplicate suppression, cached replay, partial success, and terminal failure.
- If duplicate or cached paths reuse an older result, expose enough status detail so the caller can tell it was not newly executed work.
- Stable result fields matter more than convenience. Do not drop fields just because a branch reused cached or deduped state.

### High-Frequency Sub-Scenario: Batch Partial Success

- Distinguish whole success, partial success, retry-required, skipped-only, and terminal failure at the batch level.
- Define whether per-item failures are preserved in the result, counted only, or pushed to a dead-letter path.
- Do not collapse `all succeeded`, `some succeeded`, and `nothing processed` into the same boolean outcome.
- Keep batch summaries and per-item results aligned so counts, statuses, and emitted audit events all describe the same reality.

## Error Handling And Recovery

- Do not swallow errors.
- Preserve enough context to locate trigger conditions, key inputs, and failure type.
- Do not let cleanup or wrapping erase the root cause.
- Recovery logic should mirror forward logic rather than being a best-effort guess.
- When the interface contract is constrained by legacy behavior, preserve it in code and call out the risk explicitly.

### High-Frequency Sub-Scenario: Outbound Error Mapping

- Separate retryable failures, terminal upstream failures, local validation failures, and response-schema failures.
- Keep retry exhaustion distinct from a single failed attempt.
- Do not map all upstream problems to one local error bucket if the caller needs different remediation behavior.
- Recovery logic must not claim success or reuse stale cached success unless that downgrade is explicit in the contract.

### High-Frequency Sub-Scenario: Worker Retry Versus Dead Letter

- Distinguish retryable processing failure, permanent item rejection, duplicate delivery, and already-processed replay.
- State when work is acknowledged, when it is retried, and when it is dead-lettered.
- Do not acknowledge the whole delivery if retry semantics require the batch to be retried as a unit.
- If permanent failures are isolated and the batch still succeeds partially, make that partial outcome explicit instead of pretending full success.

## Explain Before Coding

State:

- the default value source
- how absence differs from explicit clear, explicit empty, and invalid input
- when fallback or downgrade is triggered
- the stable return contract
- how failure is signaled
- whether duplicate, replayed, or cached results have a distinct observable shape
- how retryable vs terminal outbound failures are mapped
- whether partial success exists and how it is represented
- how retry-required versus dead-letter outcomes differ
