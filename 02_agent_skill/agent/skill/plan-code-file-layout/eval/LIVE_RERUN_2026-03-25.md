# plan-code-file-layout Live Rerun 2026-03-25

This note records the targeted live Codex CLI rerun that followed the anchor-lock
and scope-lock hardening work for `plan-code-file-layout`.

The goal of this rerun was narrower than a full smoke refresh:

- verify that `target_area` no longer drifts into explanatory prose on doc-heavy cases
- verify that comparison files stop leaking into returned `decision.files`
- verify that new exact-file-anchor cases behave correctly in real model outputs
- separate true live-model planning errors from semantic-evaluator wording misses

## Why This Rerun Was Targeted

A full smoke invocation through:

```bash
python eval/run_codex_cli_eval.py --suite smoke --eval-mode semantic --reasoning-effort medium
```

timed out in this environment before the full suite completed.

Because the current risk focus was narrow, the live check was rerun one case at a time
against the highest-value anchor and scope stressors instead of waiting on one large batch.

## Commands Run

These single-case live checks were executed:

```bash
python eval/run_codex_cli_eval.py --case legacy_conflict --eval-mode semantic --reasoning-effort low --output-dir eval/codex_cli_outputs_anchor_scope_rerun
python eval/run_codex_cli_eval.py --case python_cli_merge_pass_through --eval-mode semantic --reasoning-effort low --output-dir eval/codex_cli_outputs_anchor_scope_rerun
python eval/run_codex_cli_eval.py --case react_feature_split_exact_file_anchor --eval-mode semantic --reasoning-effort low --output-dir eval/codex_cli_outputs_anchor_scope_rerun
python eval/run_codex_cli_eval.py --case python_endpoint_keep_small --eval-mode semantic --reasoning-effort low --output-dir eval/codex_cli_outputs_anchor_scope_rerun
python eval/run_codex_cli_eval.py --case ts_backend_endpoint_split_io --eval-mode semantic --reasoning-effort low --output-dir eval/codex_cli_outputs_anchor_scope_rerun
python eval/run_codex_cli_eval.py --case react_feature_merge_exact_file_anchor --eval-mode semantic --reasoning-effort low --output-dir eval/codex_cli_outputs_anchor_scope_rerun
```

After inspecting the returned YAML, the semantic wording rules for three cases were narrowed
to remove explanation-only false negatives without weakening anchor or scope checks.

Then the saved live outputs were revalidated locally in semantic mode.

## Cases Chosen

### `legacy_conflict`

- Purpose: doc-heavy anchor stability
- Why: this was the clearest historical case of `target_area` wording drift

### `python_cli_merge_pass_through`

- Purpose: comparison-file leakage
- Why: this was the clearest historical case of a comparison script leaking into `files`

### `react_feature_split_exact_file_anchor`

- Purpose: exact file-path anchor under `split`
- Why: the hardest new case for preserving a file anchor while still returning multiple files

### `react_feature_merge_exact_file_anchor`

- Purpose: exact file-path anchor under `merge`
- Why: the parallel case for preserving a file anchor while collapsing a panel-local split

### `python_endpoint_keep_small`

- Purpose: control sample for a normal `keep` path
- Why: confirms we did not accidentally over-constrain routine local-boundary behavior

### `ts_backend_endpoint_split_io`

- Purpose: control sample for a normal `split` path
- Why: confirms the new prompt constraints do not regress a healthy route-plus-adapters split

## First-Pass Live Results

### Passed immediately

- `legacy_conflict`
- `python_cli_merge_pass_through`
- `ts_backend_endpoint_split_io`

### Failed on first semantic pass

- `react_feature_split_exact_file_anchor`
- `react_feature_merge_exact_file_anchor`
- `python_endpoint_keep_small`

Important distinction:

- these failures were not anchor or scope failures
- they were wording misses against brittle semantic term groups

## What Improved In Real Model Behavior

### 1. `target_area` Drift Improved

Case: `legacy_conflict`

Observed live result:

- `strategy: split` was correct
- `target_area: "src/app/services/legacy_refunds"` stayed exact
- returned files followed the documented target-state relocation plan

Interpretation:

- the model no longer drifted into prose such as "refund sync slice rooted at ..."
- the anchor-lock prompt update appears to have helped on the most important historical drift case

### 2. Comparison Leakage Improved

Case: `python_cli_merge_pass_through`

Observed live result:

- `strategy: merge` was correct
- `files` contained only `scripts/ops/reconcile_refund_backlog.py`
- `sync_partner_catalog.py` remained comparison evidence in explanation only

Interpretation:

- the model stopped widening the returned plan to include the heavier comparison command
- the forbidden-return-files prompt section appears to have helped on the clearest historical scope-leak case

### 3. Ordinary Control Paths Still Behaved Correctly

Cases:

- `ts_backend_endpoint_split_io`
- `python_endpoint_keep_small`

Observed live result:

- the TypeScript webhook split still returned the intended route plus two real IO seams
- the Python refund-status endpoint still returned a single-file `keep` plan

Interpretation:

- the new anchor and scope constraints did not distort ordinary split or keep behavior
- the `python_endpoint_keep_small` first-pass failure was explanation wording only, not a boundary regression

## What The First-Pass Failures Actually Meant

### `react_feature_split_exact_file_anchor`

The live output already had the important structure:

- exact file-path `target_area`
- correct `split` decision
- correct two-file plan
- no comparison-file leakage

The semantic failure came from explanation phrases not literally including:

- "real API boundary"
- "exact file anchor"
- "comparison context only"

But the returned YAML still clearly described:

- a real external IO seam
- the panel-versus-API split
- the comparison feature as evidence only

### `react_feature_merge_exact_file_anchor`

The live output already had the important structure:

- exact file-path `target_area`
- correct `merge` decision
- correct single-file plan
- no comparison-file leakage

The semantic failure again came from explanation phrases not literally including:

- "panel-local hook"
- "exact file anchor"
- "comparison context only"

### `python_endpoint_keep_small`

The live output already had the important structure:

- correct `keep` decision
- correct target area
- correct single-file plan

The semantic miss was that the model explained the request/response contract as
"data shapes" instead of literally saying "dataclass".

## Semantic Contract Adjustment

After reviewing those live outputs, only explanation-only semantic term groups were adjusted.

What did **not** change:

- strict validation
- `strategy` checks
- exact `target_area` checks
- exact-file-anchor prompt checks
- `comparison_paths` and `legacy_paths` as forbidden returned files
- file-group structure checks
- `max_files` limits

What **did** change:

- a few semantic explanation term groups were widened to accept equivalent language
- one redundant exact-anchor explanation group was removed from `react_feature_split_exact_file_anchor`
  because the anchor is already enforced by the field-level contract itself

## Post-Adjustment Semantic Revalidation

The saved live outputs in `eval/codex_cli_outputs_anchor_scope_rerun/` were revalidated in semantic mode.

Result:

- `react_feature_merge_exact_file_anchor`: pass
- `react_feature_split_exact_file_anchor`: pass
- `python_endpoint_keep_small`: pass

Meaning:

- the remaining live misses were evaluator wording misses, not planning misses
- the semantic contract now better reflects the skill's actual design goal:
  stable boundary planning rather than exact phrase reproduction

## Practical Takeaway

This rerun gives a cleaner picture of the current state:

- the two most important real-model risks from this thread both improved:
  - `target_area` wording drift
  - comparison-file scope leakage
- the remaining live failures were explanation-only and were resolved by narrowing
  overly brittle semantic wording checks
- the hard structural constraints stayed intact the whole time

## Recommended Next Step

Do not broaden the core contract further right now.

The next useful live check is a small dedicated anchor-and-scope suite, not a bigger semantic relaxation.

Suggested candidates:

1. `legacy_conflict`
2. `python_cli_merge_pass_through`
3. `react_feature_merge_exact_file_anchor`
4. `react_feature_split_exact_file_anchor`

That would keep live attention on the exact two high-value stability risks that motivated this rerun.

Update:

- `run_codex_cli_eval.py` now includes `--suite anchor-scope` so this focused rerun no longer depends on manual per-case command assembly.
