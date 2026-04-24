# Source Priority

Use this file when repo reality, official docs, framework guidance, or style recommendations point in different directions.

---

## Default Priority Order

Resolve conflicts in this order:

1. The user's explicit authorization for this task
2. Existing public contract and stable repo behavior
3. Repo configuration and toolchain
4. Official language or runtime semantics
5. Official framework documentation
6. Official style guides or engineering recommendations
7. Model defaults

---

## Patch-Safe Bias

For `patch-safe` tasks, existing repo behavior usually wins over a generic recommendation unless:

- the repo behavior is already broken for the requested case
- the repo configuration already makes the recommendation mandatory
- the repo behavior would cause a semantic, safety, or honesty failure

---

## Questions To Ask Before Choosing

When two sources conflict, answer these questions:

1. Does following the recommendation widen the blast radius?
2. Does the repo already enforce one side through configuration?
3. Would following the repo cause a semantic or safety failure?
4. Is the disagreement about correctness, or only about style and ideal defaults?

If the disagreement is only about style, layout, or aspirational tooling, keep it as a recommendation.

---

## What Must Override Generic Guidance

Repo-local behavior or configuration should usually override generic guidance when:

- the task edits an existing public interface
- the repo already compiles, lints, or tests under discoverable rules
- the change is a narrow patch and not a greenfield module

Official language or runtime semantics must override repo habits when:

- the repo behavior depends on an incorrect understanding of the language
- the repo behavior would silently change public semantics
- the repo behavior would cause unsafe runtime behavior

---

## Contract Documentation

When source priority matters, record it in the contract using lines such as:

- Repo constraints that override generic guidance:
- Source-priority decision:
- Exception invoked:

Keep the explanation short and concrete. The goal is to show why a recommendation stayed a recommendation.
