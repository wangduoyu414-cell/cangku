# plan-code-file-layout Eval

> Historical note: some archived eval outputs and logs in this directory were generated
> before the 2026-04-21 routing cleanup. Treat those artifacts as historical evidence,
> not as the current trigger baseline. The current baseline is the narrowed
> `SKILL.md`, plus the redesign carriers under `d:/LangChain/prompts/`.

This directory contains two evaluation paths:

- `python eval/run_eval.py`
  Validates the static fixture set, golden outputs, decision coverage, and case-contract stability checks.
- `python eval/run_eval.py --mode semantic`
  Validates the same cases in semantic mode, keeping the core boundary decision strict while relaxing wording and naming in selected cases.
- `python eval/run_mutation_eval.py`
  Deliberately breaks golden outputs in memory and checks that the evaluator catches each defect.
- `python eval/export_manual_eval_pack.py`
  Exports a zero-key manual/offline test pack that can be pasted into any model UI or reviewed by a human.
- `python eval/validate_saved_output.py --case <case-id> --output <file>`
  Validates any manually saved or externally generated YAML against a chosen case.
- `python eval/run_live_eval.py --dry-run`
  Builds end-to-end prompts without calling a model.
- `python eval/run_live_eval.py --model <model-name>`
  Calls the OpenAI Responses API when `OPENAI_API_KEY` is available and validates the returned YAML with the same checks as the static runner.
  If `OPENAI_API_KEY` is not set, the runner will also try to load credentials for the same model from `~/.continue/config.yaml`.
- `python eval/run_codex_cli_eval.py --suite smoke`
  Runs a small end-to-end smoke suite through the installed Codex CLI and validates the returned YAML in semantic mode by default.
- `python eval/run_codex_cli_eval.py --suite anchor-scope`
  Runs the focused live suite for the two highest-value stability risks: exact target-area preservation and comparison-file scope leakage.
- `python eval/run_codex_cli_eval.py --suite conflict`
  Runs a focused live suite for doc-conflict, rollout-note, seam-granularity, and conflicting-sibling cases through Codex CLI.

Useful commands:

```bash
python eval/run_eval.py
python eval/run_eval.py --mode semantic
python eval/run_eval.py --list-cases
python eval/run_mutation_eval.py --case legacy_conflict
python eval/export_manual_eval_pack.py
python eval/validate_saved_output.py --case python_endpoint --output eval/golden_outputs/python_endpoint.yaml
python eval/validate_saved_output.py --dir eval/golden_outputs --require-all
python eval/run_eval.py --case merge_ui_feature
python eval/run_live_eval.py --dry-run --case legacy_conflict
python eval/run_live_eval.py --model gpt-5.2 --case python_endpoint
python eval/run_codex_cli_eval.py --suite smoke
python eval/run_codex_cli_eval.py --suite anchor-scope --reasoning-effort low --output-dir eval/codex_cli_outputs_anchor_scope
python eval/run_codex_cli_eval.py --suite conflict --reasoning-effort low --output-dir eval/codex_cli_outputs_conflict
python eval/run_codex_cli_eval.py --case python_endpoint_keep_small --reasoning-effort medium
python eval/run_codex_cli_eval.py --suite smoke --eval-mode strict
```

For completely offline testing:

1. Run `python eval/export_manual_eval_pack.py`
2. Open a file from `eval/manual_pack/prompts/`
3. Paste it into any model UI or use it in a human blind review
4. Save the YAML into `eval/manual_pack/outputs/<case-id>.yaml`
5. Run `python eval/validate_saved_output.py --dir eval/manual_pack/outputs --require-all`

Stability notes:

- `run_eval.py` now checks case contracts in addition to golden outputs.
- `run_eval.py` supports both `strict` and `semantic` validation modes.
- Every current case in `eval/cases.json` now has semantic coverage, so the suite can be run fully in either mode.
- Case `source_paths` should contain only primary implementation files, not support docs that are already injected automatically.
- Optional case field `legacy_paths` can mark compatibility shims or rollout-only files that should be shown as migration evidence but excluded from the returned `files` plan by default.
- Exact file-path anchors are now treated as a separate stability concern: prompt builders should preserve them literally instead of widening them into parent directories.
- Comparison and legacy context may appear in explanatory text, but returned `files` should stay limited to the target slice itself.
- Support docs now include `.cursor/rules/LAYERING.md` when present, so baseline layering rules can override conflicting local layout in doc-driven cases.
- Dry-run and manual-pack prompts now place primary implementation files before general repository support files so the target signal stays prominent.
- `run_codex_cli_eval.py` is the dedicated harness for validating real Codex CLI behavior without depending on the raw Responses API runner, and it defaults to `semantic` validation because that better reflects the skill's cross-model goal.
- The smoke suite now spends more of its budget on the two highest-value stability risks: exact-anchor preservation and comparison-context scope leakage.
- `run_codex_cli_eval.py --suite anchor-scope` is the dedicated small live suite for those two stability risks when a full smoke rerun would be slower or noisier than needed.
- `run_codex_cli_eval.py --suite conflict` is the focused live check for the newer conflict-heavy cases added to the suite.
- See [CODEX_CLI_CONFLICT_ATTRIBUTION.md](/d:/zidonghua/plan-code-file-layout/eval/CODEX_CLI_CONFLICT_ATTRIBUTION.md) for the current live-model breakdown of the conflict suite.
- See [LIVE_RERUN_2026-03-25.md](/d:/zidonghua/plan-code-file-layout/eval/LIVE_RERUN_2026-03-25.md) for the focused follow-up live rerun on exact-anchor preservation and comparison-file scope leakage.
- Current low-risk live optimizations include `focus_paths`, `comparison_paths`, and `legacy_paths`. Avoid adding broader prompt heuristics unless fresh conflict reruns regress again, because the current contract already validates the latest saved conflict outputs cleanly.
