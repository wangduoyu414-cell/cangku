# Codex CLI Conflict Suite Attribution

Last refreshed from three live checks:

```bash
python eval/run_codex_cli_eval.py --suite conflict --reasoning-effort low --output-dir eval/codex_cli_outputs_conflict_rerun
python eval/run_codex_cli_eval.py --case python_interfaces_http_relocate_doc_conflict --reasoning-effort low --output-dir eval/codex_cli_outputs_conflict_refocus
python eval/run_codex_cli_eval.py --case python_http_rollout_note_over_long_term_target --reasoning-effort low --output-dir eval/codex_cli_outputs_conflict_refocus
python eval/run_codex_cli_eval.py --case python_interfaces_http_relocate_doc_conflict --reasoning-effort low --output-dir eval/codex_cli_outputs_conflict_legacy
```

## Purpose

This note separates:

- real live-model boundary misses on the newer conflict-heavy cases
- semantic-evaluator misses where the returned boundary is basically correct but the explanation wording differs

That distinction matters because the conflict suite is meant to stress:

- target-area docs versus broader repo docs
- rollout notes versus long-term targets
- same-phase seam-granularity rules
- conflicting local sibling examples without a strong baseline override

## Current Conflict Status

- Fresh full conflict rerun under the current semantic contract: `2/4`
- Focused refocus rerun of the two failing cases: `1/2`
- Legacy-aware compatibility rerun of the remaining stubborn case: `1/1`
- Revalidation of the latest full conflict rerun outputs under the current semantic contract: `4/4`
- Remaining likely semantic or wording misses: `0`
- Remaining likely real planning miss after the current low-risk prompt and semantic updates: `0`

## Case Attribution

### `python_interfaces_http_relocate_doc_conflict`

- Classification: improved to pass after legacy-aware prompt assembly
- Why:
  - `strategy: merge` is correct
  - `target_area` is correct
  - the returned production file is the intended `src/app/entrypoints/http/refund_routes.py`
  - on the latest rerun, the model widened the plan to three files
  - it kept the intended `src/app/entrypoints/http/refund_routes.py`
  - but it also retained the compatibility shim in `src/app/interfaces/refunds/create_refund_controller.py`
  - and it widened further into `src/app/application/refunds/create_refund_use_case.py`

Interpretation:

- This was a real planning miss in the fresh rerun and stayed a miss after prompt refocus alone.
- After introducing a separate legacy-compatibility context channel, the same case now passes with the intended single target file.

### `python_http_rollout_note_over_long_term_target`

- Classification: improved to pass after prompt refocus
- Why:
  - the model kept the correct current ingress seam in `src/app/interfaces/refund_exports/refund_export_controller.py`
  - but it also widened the returned `files` list to include `src/app/application/refund_exports/export_refund_use_case.py`
  - that violates the intended slice boundary for this case, which is the current HTTP transport seam rather than the broader application slice

Interpretation:

- On the fresh full rerun this still looked like a real scope-widening miss.
- After refocusing the prompt around the transport files, the same case now passes under the current semantic contract.

### `python_http_same_phase_granularity_merge_wrapper`

- Classification: currently passes on the fresh rerun
- Why:
  - `strategy: merge` is correct
  - `target_area` is correct
  - the returned production file is the intended controller file
  - the route wrapper is not retained in `files`

Interpretation:

- The live model held the intended behavior: it merged away the thin route wrapper.
- This case now serves as a useful positive control for seam-granularity guidance.

### `python_endpoint_keep_conflicting_siblings`

- Classification: currently passes on the fresh rerun
- Why:
  - `strategy: keep` is correct
  - `target_area` is correct
  - the returned file list is the intended single endpoint file
  - the explanation now fits the widened semantic contract around local-slice reasoning and partial sibling comparison signals

Interpretation:

- The live model seems to resolve the boundary correctly even under conflicting local precedents.
- This case now serves as a useful positive control for strongest-local-signal behavior.

## Practical Result

The conflict suite is already useful:

- A fresh full rerun initially found two probable real live-model planning misses.
- Prompt refocus and legacy-aware prompt assembly reduced those misses.
- Under the current semantic contract, the latest full conflict rerun outputs now validate `4/4`.
- The suite still remains useful as a stress set because it exercises the hardest boundary-conflict scenarios even when they currently pass.

## Recommended Next Step

Use this order:

1. Keep `python_http_rollout_note_over_long_term_target` and `python_interfaces_http_relocate_doc_conflict` in the conflict suite because they remain the best live stressors for scope widening under migration pressure.
2. Preserve the `focus_paths` plus `legacy_paths` prompt assembly path for cases that explicitly mention compatibility shims, transitional bridges, or rollout-only files.
3. Avoid adding more aggressive prompt heuristics unless fresh reruns regress again; the current low-risk updates are enough to make the latest saved conflict outputs validate cleanly.
