# Environment Rules: Python CLI and Config Precedence

Use this file for Python CLI commands, scripts, or config-loading code where precedence and parsing rules matter.

---

## Typical Triggers

Read this file when the task involves:

- command-line argument parsing
- environment-variable overrides
- config file loading
- layered defaults or precedence stacks
- user-visible CLI error messages or exit behavior

---

## Runtime Guidance

[FATAL] Be explicit about precedence order. Do not silently change whether CLI flags, environment variables, config files, or defaults win.

[FATAL] Do not collapse malformed config, missing config, and intentionally empty values into one branch.

[WARN] Distinguish clearly between:

- absent value
- invalid value
- empty but explicit value
- inherited default

[WARN] If the repo already centralizes config parsing or precedence logic, prefer extending that path over adding a second precedence model in a patch-safe task.

[WARN] For CLI tasks, document whether failure should raise, return an error object, print a message, or exit with a code.

---

## Validation Hints

Typical repo-aware validation candidates:

- focused config precedence tests
- CLI argument parsing tests
- smoke checks for environment override behavior
- repo-native lint, typecheck, and test commands
