# Testing

Use these commands as the maintained validation entrypoints for this skill.

## Internal Baseline

Runs the skill against the small in-repo sample files and writes
`tmp/test_report_v3.json`.

```powershell
python tmp\run_tests_v3.py
```

Use this when you want a quick smoke test that the local pipeline still runs and
produces a valid `schema_version: 4.3` slice.

## Optional External Fixture Flow

No maintained external fixture root is currently mounted in this environment.

If you restore an archived external runner flow, keep the restored root under a
`current-file-dependency-analysis` path before invoking its runners. Treat that
flow as optional historical regression coverage after the maintained local
checks below, not as the primary validation entrypoint for the live skill
carrier.

## Continue Integration Smoke

Compiles the local `Continue` config, loads the compiled `modifyConfig` export,
and exercises both `/depsctx` and `@depsctx` through mocked `IDE` / `SDK`
interfaces. The report is written to
`tmp/continue_integration_smoke_report.json`.

```powershell
node scripts\continue_integration_smoke.js
```

Use this when you want to validate the non-UI execution path for:

- `/depsctx` slash command success flow
- `@depsctx` context provider success flow
- unsaved-file fallback behavior for both entry points

## Continue UI E2E

The remaining real-extension validation is manual. Use the runbook below:

`references/continue-ui-e2e.md`

This is the final check for real Continue sidebar behavior inside VS Code after
the automated non-UI smoke has passed.

## Recommended Order

1. `python tmp\run_tests_v3.py`
2. `node scripts\continue_integration_smoke.js`
3. Follow `references/continue-ui-e2e.md` for the final manual UI pass
4. If an external fixture root is restored later, run its historical regression
   flow only after the three maintained local checks above succeed
