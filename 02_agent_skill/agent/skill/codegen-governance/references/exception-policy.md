# Exception Policy

Use this file before turning a recommendation into a hard block.

---

## Default Rule

Do not escalate a recommendation to `[FATAL]` unless at least one of these is true:

- the repo already enforces it through enabled configuration
- violating it would break language or runtime semantics
- violating it would hide a contract change, side effect, or unsafe behavior
- violating it would make validation dishonest

If none of the above applies, keep it as `[WARN]` or `[ADV]`.

---

## Common Recommendations That Usually Stay Non-Blocking

These are useful, but they are not universal hard stops:

- enabling stricter compiler options in an existing repo
- adopting a new linter, formatter, or type checker
- preferring one naming convention over another
- preferring one file layout or component order over another
- replacing an existing abstraction for style purity alone

---

## When A Recommendation Can Become Mandatory

A recommendation can become effectively mandatory when:

- the current repo configuration already makes it a compiler or lint error
- the user explicitly asked for stricter modernization
- the task is `greenfield-strict` and the recommendation stays local
- ignoring it would produce a high-cost semantic or safety failure

---

## Continuation Guidance

If a recommendation cannot be satisfied inside the allowed blast radius:

- do not stop by default
- document the exception
- continue in `patch-safe` or `repo-conformant` mode

Switch to `stop_and_ask` only if the recommendation is actually hiding a semantic conflict, not just an ideal-state gap.

---

## Report Guidance

If an exception was used, record it in the report with a short statement:

- Recommendation not enforced because:
- Repo reality kept over generic guidance because:
- Future cleanup not included in this task because:

This keeps the implementation honest without turning every cleanup opportunity into a blocker.
