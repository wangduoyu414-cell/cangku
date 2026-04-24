# Manual Eval Pack

> Historical note: these prompt bundles are kept for offline evaluation, but their
> routing language has been partially normalized after the 2026-04-21 redesign.
> If any prompt bundle still disagrees with the live `SKILL.md`, treat the live
> `SKILL.md` as the source of truth.

This pack lets you test `plan-code-file-layout` without any API key.

## Steps

1. Open a prompt file from `prompts/`.
2. Paste it into any model UI or use it for human review.
3. Save the YAML-only answer into the matching file under `outputs/`.
4. Validate one output:
   `python D:\zidonghua\plan-code-file-layout\eval\validate_saved_output.py --case <case-id> --output <output-file>`
5. Validate the whole pack:
   `python D:\zidonghua\plan-code-file-layout\eval\validate_saved_output.py --dir D:\zidonghua\plan-code-file-layout\eval\manual_pack\outputs --require-all`

## Files

- `prompts/`: Full prompt bundles with system prompt and repository context.
- `outputs/`: Empty YAML stubs where answers should be saved.
- `expected/`: Short summaries of what the evaluator expects for each case.
- `manifest.json`: Machine-readable overview of all cases.
