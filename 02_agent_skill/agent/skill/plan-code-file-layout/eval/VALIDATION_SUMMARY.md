# plan-code-file-layout Validation Summary

Last refreshed from local runs in this workspace on 2026-03-24 after expanding the evaluation suite to 42 cases.

## Overall Status

- Static regression: passed
- Semantic regression: passed
- Mutation regression: passed
- Saved-output validation: passed
- Dry-run prompt generation: passed
- Manual pack export: not refreshed in this run
- Codex CLI smoke harness: not rerun in this refresh

## Current Coverage

- Total cases: `42`
- Strategies covered: `keep`, `split`, `merge`
- Repo shapes covered: `feature-first`, `layer-first`, `package-first`, `mixed`
- Stacks covered: Python, TypeScript/JavaScript, Vue, Go
- Artifact types covered: service-endpoint, ui-component, cli-command, data-pipeline-step, library-module

Coverage mix from `eval/cases.json`:

- Strategy counts:
  - `split`: `14`
  - `keep`: `14`
  - `merge`: `14`
- Repo-shape counts:
  - `feature-first`: `16`
  - `mixed`: `11`
  - `layer-first`: `11`
  - `package-first`: `4`
- Artifact counts:
  - `service-endpoint`: `13`
  - `ui-component`: `10`
  - `library-module`: `8`
  - `data-pipeline-step`: `6`
  - `cli-command`: `5`
- Stack counts:
  - `python`: `21`
  - `typescript-javascript`: `14`
  - `go`: `4`
  - `vue`: `3`
- Confidence counts:
  - `high`: `33`
  - `medium`: `8`
  - `low`: `1`

## Confirmed Local Results

### 1. Static Regression

Command:

```bash
python eval/run_eval.py
```

Result:

- `129/129` checks passed

What this covers:

- Golden output contract validation
- Documentation coverage for the case list
- Case-contract stability checks
  - duplicate ids
  - empty or duplicate `source_paths`
  - support-doc leakage into `source_paths`
  - missing target-area anchoring
  - prompt primary-file ordering drift
- Fixture existence checks

### 2. Semantic Regression

Command:

```bash
python eval/run_eval.py --mode semantic
```

Result:

- `129/129` checks passed

Meaning:

- The same suite validates in semantic mode without loosening the core boundary decision.
- Wording and naming variance remain tolerated only where the case contract explicitly allows it.

### 3. Mutation Proof

Command:

```bash
python eval/run_mutation_eval.py
```

Result:

- `252/252` checks passed

Meaning:

- The evaluator still fails mutated outputs when key fields are broken.
- The newly added exact-file-anchor cases also resist wrong target areas, wrong file paths, and dropped rationale phrases.

### 4. Saved Output Validation

Command:

```bash
python eval/validate_saved_output.py --dir eval/golden_outputs --require-all
```

Result:

- `42/42` checks passed

### 5. Dry-Run Prompt Generation

Command:

```bash
python eval/run_live_eval.py --dry-run
```

Result:

- `42/42` checks passed

What this confirms:

- End-to-end prompt construction works for every case without a live model call.
- Prompt assembly continues to resolve primary files, comparison files, and support docs correctly.

## New Coverage Added In This Refresh

- Added an isolated fixture repo at `D:\yongyongmoban\skill-evals\plan-code-file-layout-lab\feature-first\react-refund-console`.
- Added `react_feature_merge_exact_file_anchor` to verify the skill keeps an exact file-path anchor while merging away a panel-local hook.
- Added `react_feature_split_exact_file_anchor` to verify the skill keeps an exact file-path anchor while still recommending a multi-file split around a real feature-local API boundary.

These cases strengthen one of the harder design goals in `SKILL.md`:

- `target_area` should preserve the concrete anchor from the request, including exact file paths when the user anchors on a file rather than a directory.
- Nearby comparison files must remain comparison context only and must not leak into the returned `files` plan.

## Current Limitation

This refresh reflects local offline validation only.

- Live prompt generation is validated.
- Static and semantic evaluators are validated.
- Mutation checks are validated.
- Saved golden outputs are validated.
- Manual-pack export was not rerun in this refresh.
- Codex CLI smoke or conflict suites were not rerun in this refresh.

If live model verification is needed, run:
`python eval/run_live_eval.py --model <model-name>`
or
`python eval/run_codex_cli_eval.py --suite smoke`

## Practical Conclusion

The suite is in stronger shape than before:

- coverage is now balanced across `keep`, `split`, and `merge`,
- exact file-path anchor handling is covered explicitly,
- prompt assembly and saved-output validation both remain green,
- mutation stability remains strong after the new cases.

The remaining practical risk is still live model behavior rather than the offline evaluator itself:

- exact target anchoring can drift in real model outputs,
- comparison context can still leak into returned `files` when the model over-generalizes.
