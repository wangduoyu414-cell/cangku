#!/usr/bin/env python3
"""Mutation tests for the plan-code-file-layout evaluator."""

from __future__ import annotations

import argparse
import io
import re
import sys
from dataclasses import dataclass, field
from typing import Any, Callable


def ensure_utf8_stdio() -> None:
    if sys.platform != "win32":
        return

    for name in ("stdout", "stderr"):
        stream = getattr(sys, name)
        if getattr(stream, "_skill_utf8_wrapped", False):
            continue
        wrapped = io.TextIOWrapper(stream.buffer, encoding="utf-8", errors="replace")
        setattr(wrapped, "_skill_utf8_wrapped", True)
        setattr(sys, name, wrapped)


ensure_utf8_stdio()

import run_eval  # noqa: E402


@dataclass
class MutationResult:
    name: str
    passed: bool
    details: list[str] = field(default_factory=list)


MutationFn = Callable[[dict[str, Any], str], str]


def replace_scalar(text: str, key: str, value: str) -> str:
    return re.sub(
        rf"(^\s*{re.escape(key)}:\s*)(.+)$",
        rf"\g<1>{value}",
        text,
        count=1,
        flags=re.MULTILINE,
    )


def replace_first_path(text: str, new_path: str) -> str:
    return re.sub(
        r'(^\s*-\s+path:\s*)"([^"]+)"',
        rf'\g<1>"{new_path}"',
        text,
        count=1,
        flags=re.MULTILINE,
    )


def mutate_strategy(case: dict[str, Any], text: str) -> str:
    current = str(case["expected"]["strategy"])
    for candidate in ("keep", "split", "merge"):
        if candidate != current:
            return replace_scalar(text, "strategy", candidate)
    return text


def mutate_missing_why_not_more(_: dict[str, Any], text: str) -> str:
    return replace_scalar(text, "why_not_more", '""')


def mutate_target_area(_: dict[str, Any], text: str) -> str:
    return replace_scalar(text, "target_area", '"__wrong__/target-area"')


def mutate_first_file_path(_: dict[str, Any], text: str) -> str:
    return replace_first_path(text, "__wrong__/file.py")


def mutate_confidence(case: dict[str, Any], text: str) -> str:
    current = str(case["expected"]["confidence"])
    mutated = "low" if current != "low" else "high"
    return replace_scalar(text, "confidence", mutated)


def mutate_remove_required_phrase(case: dict[str, Any], text: str) -> str:
    phrases = list(case["expected"].get("must_contain", [])) or list(case["expected"]["keep_inline"])
    if not phrases:
        return text

    phrase = str(phrases[0])
    pattern = re.compile(re.escape(phrase), re.IGNORECASE)
    return pattern.sub("__removed_phrase__", text, count=1)


MUTATIONS: dict[str, MutationFn] = {
    "wrong_strategy": mutate_strategy,
    "missing_why_not_more": mutate_missing_why_not_more,
    "wrong_target_area": mutate_target_area,
    "wrong_first_file_path": mutate_first_file_path,
    "wrong_confidence": mutate_confidence,
    "remove_required_phrase": mutate_remove_required_phrase,
}


def run_case(case: dict[str, Any], selected_mutation: str | None) -> list[MutationResult]:
    case_id = str(case["id"])
    golden_text = run_eval.load_golden_text(case_id)
    baseline = run_eval.validate_output_text(case, golden_text, "baseline")

    results: list[MutationResult] = []
    if not baseline.passed:
        results.append(
            MutationResult(
                name=f"baseline({case_id})",
                passed=False,
                details=["golden output failed baseline validation before mutation", *baseline.details],
            )
        )
        return results

    mutations = (
        {selected_mutation: MUTATIONS[selected_mutation]}
        if selected_mutation
        else MUTATIONS
    )

    for mutation_name, mutate in mutations.items():
        mutated_text = mutate(case, golden_text)
        validation = run_eval.validate_output_text(case, mutated_text, mutation_name)
        if validation.passed:
            results.append(
                MutationResult(
                    name=f"{mutation_name}({case_id})",
                    passed=False,
                    details=["mutation unexpectedly passed validation"],
                )
            )
        else:
            results.append(
                MutationResult(
                    name=f"{mutation_name}({case_id})",
                    passed=True,
                    details=[f"caught by validator: {detail}" for detail in validation.details[:3]],
                )
            )

    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Run mutation tests against plan-code-file-layout eval logic.")
    parser.add_argument("--case", help="Only run one case id.")
    parser.add_argument("--mutation", choices=sorted(MUTATIONS.keys()), help="Only run one mutation kind.")
    args = parser.parse_args()

    _, cases = run_eval.load_cases()
    chosen_cases = [case for case in cases if args.case in (None, str(case["id"]))]
    if args.case and not chosen_cases:
        print(f"unknown case id: {args.case}", file=sys.stderr)
        return 1

    all_results: list[MutationResult] = []
    for case in chosen_cases:
        all_results.extend(run_case(case, args.mutation))

    print("=" * 60)
    print("plan-code-file-layout mutation report")
    print("=" * 60)
    for result in all_results:
        status = "PASS" if result.passed else "FAIL"
        print(f"{status} - {result.name}")
        for detail in result.details:
            print(f"  {detail}")

    passed = sum(1 for result in all_results if result.passed)
    print()
    print(f"summary: {passed}/{len(all_results)} checks passed")
    return 0 if all(result.passed for result in all_results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
