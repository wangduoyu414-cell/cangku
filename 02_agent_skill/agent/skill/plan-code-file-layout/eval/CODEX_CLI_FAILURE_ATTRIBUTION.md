# Codex CLI Failure Attribution

Last refreshed from the latest semantic smoke run of:

```bash
python eval/run_codex_cli_eval.py --suite smoke --reasoning-effort medium --eval-mode semantic
```

## Purpose

This note separates:

- real boundary-planning mistakes by the live model
- semantic-evaluator misses that still reject a basically correct boundary decision

That distinction matters because `strict` and `semantic` now serve different goals:

- `strict`: golden regression for the maintained repository contract
- `semantic`: cross-model validation of boundary correctness

## Current Smoke Status

- Pass: `python_endpoint_keep_small`
- Pass: `go_package_split_same_package`
- Pass: `vue_page_merge_local_composable`
- Pass: `ts_backend_endpoint_split_io`

Summary:

- `4/4` passed
- `0` current smoke failures remain
- The earlier smoke misses were narrowed down to semantic naming and explanation variance, then absorbed into the semantic contract without weakening the core boundary checks.

## Case Attribution

### `python_endpoint_keep_small`

- Classification: passed cleanly
- Meaning: the live model held the intended `keep` boundary for a small endpoint and did not invent an unnecessary service or schema split.

### `go_package_split_same_package`

- Classification: passed cleanly
- Meaning: the live model preserved the important behavior of splitting by source and sink boundary while keeping the same package boundary.

### `ts_backend_endpoint_split_io`

- Classification: currently passes in semantic mode

Why:

- The live model now stays inside the intended three-boundary shape:
  - route
  - partner client
  - persistence adapter
- The remaining variance was naming:
  - `refundWebhookEventRepository.ts` instead of `refundEventStore.ts`

Current status:

- The semantic file-group rules now accept equivalent persistence-adapter naming while still rejecting the extra route -> service -> client -> repository chain that originally appeared.
- This case remains a useful smoke check because it is the most likely place for a ceremony-heavy extra service layer to reappear.

### `vue_page_merge_local_composable`

- Classification: currently passes in semantic mode

Why:

- The model consistently holds the intended merge boundary:
  - `strategy: merge`
  - correct target area
  - correct single production file
  - no extra composable retained in `files`
- Earlier failures on this case were caused by evaluator sensitivity around “single-page consumer” and “ceremony/indirection” phrasing.

Current status:

- The semantic rules have been widened enough to accept these equivalent explanations.
- This case is no longer a useful example of a live-model boundary miss.

## Practical Result

The semantic smoke suite is now a better proxy for the skill's true design goal:

- It accepts naming and explanation variance when the file-boundary decision is stable.
- It still rejects genuinely different boundary choices when they exceed the allowed file groups or file-count limits.

## Practical Next Step

When reviewing future live-model misses, use this order:

1. Check whether `strategy`, `target_area`, and production file boundary are correct.
2. If those are wrong, treat it as a real planning failure.
3. If those are right but wording or local naming differs, treat it as a semantic-evaluator issue first.

That keeps the skill focused on its actual design goal:

- stable file-boundary planning
- not exact phrase reproduction
