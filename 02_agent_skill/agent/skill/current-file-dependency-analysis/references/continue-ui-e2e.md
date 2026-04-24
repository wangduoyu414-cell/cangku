# Continue UI E2E Runbook

This document covers the remaining manual validation gap for the local
`Continue` extension runtime.

Scope:

- `/depsctx` slash-command interaction inside the Continue chat UI
- `@depsctx` custom context-provider selection inside the Continue chat UI
- unsaved-file fallback behavior inside the real extension UI

This runbook is intentionally manual. The non-UI execution path is already
covered by `scripts/continue_integration_smoke.js`.

## Preconditions

- VS Code is installed on this machine.
- Continue extension is installed.
- `C:\Users\admin\.continue\config.ts` contains the current `depsctx`
  integration.
- The skill workspace exists at
  `C:\Users\admin\CodexManager-SharedKey\codex-home\skills\current-file-dependency-analysis`.

Recommended pre-run commands:

```powershell
python tmp\run_tests_v3.py
node scripts\continue_integration_smoke.js
```

## Test File

Use this saved file as the primary UI target:

`C:\Users\admin\CodexManager-SharedKey\codex-home\skills\current-file-dependency-analysis\src\app\services\orderApi.ts`

Expected target inside packets:

`src/app/services/orderApi.ts`

## Scenario 1: Slash Command Success Path

1. Open the target file in VS Code.
2. Open the Continue chat panel.
3. Enter:

```text
/depsctx feature auto evidence pretty
```

Expected behavior:

- Continue accepts the slash command without config errors.
- The chat shows an in-progress message for dependency context generation.
- The final success message mentions:
  - `profile=feature`
  - `output=pretty`
- A dependency context item is added to the conversation.
- The resulting packet corresponds to an `auto_expand_bundle`.

Expected semantic outcome:

- packet kind behaves like `auto_expand_bundle`
- target file is `src/app/services/orderApi.ts`
- analysis state is `success`

## Scenario 2: Context Provider Success Path

1. Keep the same saved target file active.
2. In the Continue input, trigger the provider:

```text
@depsctx review pretty
```

Expected behavior:

- The provider appears in the selectable context list.
- Selecting it injects one dependency context item.
- The item corresponds to the `review` profile.

Expected semantic outcome:

- packet kind behaves like `first_batch`
- target file is `src/app/services/orderApi.ts`
- analysis state is `success`

## Scenario 3: Unsaved File Fallback

1. Create a new untitled buffer in VS Code.
2. Make sure the untitled file is the active editor.
3. In Continue chat, run:

```text
/depsctx
```

Expected slash-command behavior:

- Continue does not crash.
- The chat shows a clear user-facing error for the unsaved file case.

4. Still in the untitled buffer, try:

```text
@depsctx
```

Expected provider behavior:

- Continue returns a single error-style context item.
- The item explains that dependency context is unavailable because there is no
  saved active file.

## Evidence To Capture

Capture the following after the manual run:

- Screenshot of the `/depsctx feature auto evidence pretty` success state
- Screenshot of the `@depsctx review pretty` injected context item
- Screenshot of the unsaved-file slash-command message
- Screenshot of the unsaved-file provider error item
- Timestamp of the active Continue extension version
- The current non-UI smoke report:
  - `C:\Users\admin\CodexManager-SharedKey\codex-home\skills\current-file-dependency-analysis\tmp\continue_integration_smoke_report.json`

## Pass Criteria

Mark the manual UI E2E as passed only if all of the following are true:

- `/depsctx` works from the real Continue chat UI
- `@depsctx` works from the real Continue chat UI
- Both flows operate on the saved target file without path drift
- The unsaved-file fallback is visible and understandable in the UI
- No config-load or extension-runtime error blocks the interaction

## Failure Triage

If the slash command does not appear:

- Re-open VS Code after confirming `config.ts` saved successfully
- Check that Continue is loading `C:\Users\admin\.continue\config.ts`

If `@depsctx` does not appear:

- Confirm the custom context provider is still registered by the compiled config
- Re-run `node scripts/continue_integration_smoke.js`

If generation fails in UI but smoke passes:

- Treat it as a Continue runtime/UI integration issue, not a pipeline issue
- Record the exact UI error text and screenshot it

If both smoke and UI fail:

- Treat it as a config or pipeline regression
- Re-run the maintained test commands from `TESTING.md`
