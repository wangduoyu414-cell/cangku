#!/usr/bin/env python3
"""Regression checks for the plan-code-file-layout skill."""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

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

ROOT = Path(__file__).resolve().parent.parent
CASES_FILE = ROOT / "eval" / "cases.json"
GOLDEN_DIR = ROOT / "eval" / "golden_outputs"
SKILL_FILE = ROOT / "SKILL.md"
OUTPUT_SHAPE_FILE = ROOT / "references" / "output-shape.md"
TRIGGER_FILE = ROOT / "evals" / "should-trigger.md"
NON_TRIGGER_FILE = ROOT / "evals" / "should-not-trigger.md"
DECISION_CASES_FILE = ROOT / "evals" / "decision-cases.md"
DEFAULT_SUPPORT_FILES = [
    "AGENTS.md",
    "README.md",
    ".cursor/rules/LAYERING.md",
    "docs/architecture/MODULE_RESPONSIBILITIES.md",
    "docs/architecture/HTTP_TRANSPORT_MIGRATION.md",
    "docs/architecture/HTTP_TRANSPORT_TARGETS.md",
    "docs/architecture/HTTP_TRANSPORT_SEAMS.md",
]
FILE_ANCHOR_SUFFIXES = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".vue",
    ".go",
    ".json",
    ".yaml",
    ".yml",
}


@dataclass
class TestResult:
    name: str
    passed: bool
    details: list[str] = field(default_factory=list)


def load_cases() -> tuple[Path, list[dict[str, Any]]]:
    payload = json.loads(CASES_FILE.read_text(encoding="utf-8"))
    repo_root = Path(str(payload["repo_root"]))
    return repo_root, list(payload["cases"])


def get_case(case_id: str) -> dict[str, Any] | None:
    _, cases = load_cases()
    for case in cases:
        if str(case["id"]) == case_id:
            return case
    return None


def looks_like_file_path(anchor: str) -> bool:
    normalized_anchor = anchor.strip().replace("\\", "/")
    if not normalized_anchor or normalized_anchor.endswith("/"):
        return False

    parsed = urlparse(normalized_anchor)
    anchor_path = parsed.path or normalized_anchor
    suffix = Path(anchor_path).suffix.lower()
    return suffix in FILE_ANCHOR_SUFFIXES


def extract_scalar(text: str, key: str) -> str | None:
    match = re.search(rf"^\s*{re.escape(key)}:\s*(.+)$", text, re.MULTILINE)
    if not match:
        return None

    value = match.group(1).strip()
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1]
    return value


def extract_file_paths(text: str) -> list[str]:
    matches = re.finditer(
        r'^\s*-\s+path:\s*(?:"([^"]+)"|([^\n]+?))\s*$',
        text,
        re.MULTILINE,
    )
    results: list[str] = []
    for match in matches:
        quoted = match.group(1)
        bare = match.group(2)
        value = quoted if quoted is not None else bare
        if value is not None:
            results.append(value.strip())
    return results


def load_golden_text(case_id: str) -> str:
    return (GOLDEN_DIR / f"{case_id}.yaml").read_text(encoding="utf-8")


def get_semantic_rules(case: dict[str, Any]) -> dict[str, Any]:
    payload = case.get("semantic", {})
    return dict(payload) if isinstance(payload, dict) else {}


def get_semantic_forbidden_paths(case: dict[str, Any]) -> list[str]:
    semantic = get_semantic_rules(case)
    forbidden_paths = [str(path) for path in semantic.get("forbidden_paths", [])]

    for relative_path in [str(path) for path in case.get("comparison_paths", [])]:
        if relative_path not in forbidden_paths:
            forbidden_paths.append(relative_path)
    for relative_path in [str(path) for path in case.get("legacy_paths", [])]:
        if relative_path not in forbidden_paths:
            forbidden_paths.append(relative_path)

    return forbidden_paths


def path_is_within_target(relative_path: str, target_area: str) -> bool:
    normalized_target = target_area.rstrip("/")
    return relative_path == normalized_target or relative_path.startswith(normalized_target + "/")


def partition_case_context_files(repo_root: Path, case: dict[str, Any]) -> tuple[list[str], list[str]]:
    primary_files: list[str] = []
    for relative_path in [str(path) for path in case["source_paths"]]:
        if relative_path not in primary_files and (repo_root / relative_path).exists():
            primary_files.append(relative_path)

    support_files: list[str] = []
    for relative_path in DEFAULT_SUPPORT_FILES:
        if relative_path not in primary_files and relative_path not in support_files and (repo_root / relative_path).exists():
            support_files.append(relative_path)

    return primary_files, support_files


def check_contract_files() -> TestResult:
    result = TestResult(name="contract_files", passed=True)

    skill_text = SKILL_FILE.read_text(encoding="utf-8")
    output_shape = OUTPUT_SHAPE_FILE.read_text(encoding="utf-8")

    required_tokens = [
        "output-shape.md",
        "keep | split | merge",
        "keep_inline",
        "avoid",
        "why_not_fewer",
        "why_not_more",
        "confidence",
        "baseline docs",
        "anchor granularity",
        "comparison files",
    ]

    for token in required_tokens:
        if token not in skill_text and token not in output_shape:
            result.passed = False
            result.details.append(f"missing contract token: {token}")

    return result


def check_eval_docs(cases: list[dict[str, Any]]) -> TestResult:
    result = TestResult(name="eval_docs", passed=True)

    trigger_text = TRIGGER_FILE.read_text(encoding="utf-8")
    non_trigger_text = NON_TRIGGER_FILE.read_text(encoding="utf-8")
    decision_cases_text = DECISION_CASES_FILE.read_text(encoding="utf-8")

    if "Should this new Python endpoint" not in trigger_text:
        result.passed = False
        result.details.append("should-trigger.md no longer documents the Python endpoint trigger.")

    if "Implement the feature directly." not in non_trigger_text:
        result.passed = False
        result.details.append("should-not-trigger.md no longer documents direct implementation as a non-trigger.")

    documented_case_count = len(re.findall(r"^## Case", decision_cases_text, re.MULTILINE))
    if documented_case_count != len(cases):
        result.passed = False
        result.details.append(
            f"decision-cases.md documents {documented_case_count} cases, but eval/cases.json has {len(cases)}."
        )

    return result


def check_case_contracts(repo_root: Path, cases: list[dict[str, Any]]) -> TestResult:
    result = TestResult(name="case_contracts", passed=True)
    seen_ids: set[str] = set()

    for case in cases:
        case_id = str(case["id"])
        target_area = str(case["target_area"])
        source_paths = [str(path) for path in case.get("source_paths", [])]
        focus_paths = [str(path) for path in case.get("focus_paths", [])]
        comparison_paths = [str(path) for path in case.get("comparison_paths", [])]
        legacy_paths = [str(path) for path in case.get("legacy_paths", [])]
        expected_files = [str(path) for path in case.get("expected", {}).get("files", [])]
        semantic = get_semantic_rules(case)

        if case_id in seen_ids:
            result.passed = False
            result.details.append(f"duplicate case id: {case_id}")
        seen_ids.add(case_id)

        if not source_paths:
            result.passed = False
            result.details.append(f"{case_id}: source_paths is empty")
            continue

        if len(source_paths) != len(set(source_paths)):
            result.passed = False
            result.details.append(f"{case_id}: source_paths contains duplicates")

        if focus_paths:
            if len(focus_paths) != len(set(focus_paths)):
                result.passed = False
                result.details.append(f"{case_id}: focus_paths contains duplicates")
            missing_focus = [path for path in focus_paths if path not in source_paths]
            if missing_focus:
                result.passed = False
                result.details.append(f"{case_id}: focus_paths not present in source_paths {missing_focus!r}")

        if comparison_paths:
            if len(comparison_paths) != len(set(comparison_paths)):
                result.passed = False
                result.details.append(f"{case_id}: comparison_paths contains duplicates")
            missing_comparison = [path for path in comparison_paths if path not in source_paths]
            if missing_comparison:
                result.passed = False
                result.details.append(f"{case_id}: comparison_paths not present in source_paths {missing_comparison!r}")

        if legacy_paths:
            if len(legacy_paths) != len(set(legacy_paths)):
                result.passed = False
                result.details.append(f"{case_id}: legacy_paths contains duplicates")
            missing_legacy = [path for path in legacy_paths if path not in source_paths]
            if missing_legacy:
                result.passed = False
                result.details.append(f"{case_id}: legacy_paths not present in source_paths {missing_legacy!r}")

        overlapping_focus_and_comparison = [path for path in focus_paths if path in comparison_paths]
        if overlapping_focus_and_comparison:
            result.passed = False
            result.details.append(
                f"{case_id}: focus_paths overlaps comparison_paths {overlapping_focus_and_comparison!r}"
            )

        overlapping_focus_and_legacy = [path for path in focus_paths if path in legacy_paths]
        if overlapping_focus_and_legacy:
            result.passed = False
            result.details.append(
                f"{case_id}: focus_paths overlaps legacy_paths {overlapping_focus_and_legacy!r}"
            )

        overlapping_comparison_and_legacy = [path for path in comparison_paths if path in legacy_paths]
        if overlapping_comparison_and_legacy:
            result.passed = False
            result.details.append(
                f"{case_id}: comparison_paths overlaps legacy_paths {overlapping_comparison_and_legacy!r}"
            )

        leaked_expected_comparison = [path for path in expected_files if path in comparison_paths]
        if leaked_expected_comparison:
            result.passed = False
            result.details.append(
                f"{case_id}: expected.files includes comparison_paths {leaked_expected_comparison!r}"
            )

        leaked_expected_legacy = [path for path in expected_files if path in legacy_paths]
        if leaked_expected_legacy:
            result.passed = False
            result.details.append(
                f"{case_id}: expected.files includes legacy_paths {leaked_expected_legacy!r}"
            )

        overlapping_support = [path for path in source_paths if path in DEFAULT_SUPPORT_FILES]
        if overlapping_support:
            result.passed = False
            result.details.append(f"{case_id}: source_paths overlaps support files {overlapping_support!r}")

        if not path_is_within_target(source_paths[0], target_area):
            result.passed = False
            result.details.append(
                f"{case_id}: first source path {source_paths[0]!r} is not anchored inside target_area {target_area!r}"
            )

        if not any(path_is_within_target(path, target_area) for path in source_paths):
            result.passed = False
            result.details.append(f"{case_id}: no source path is anchored inside target_area {target_area!r}")

        if looks_like_file_path(target_area):
            if target_area not in source_paths:
                result.passed = False
                result.details.append(f"{case_id}: file-path target_area {target_area!r} is not present in source_paths")
            if focus_paths and target_area not in focus_paths:
                result.passed = False
                result.details.append(f"{case_id}: file-path target_area {target_area!r} is not present in focus_paths")
            allowed_target_area_prefixes = [str(value) for value in semantic.get("allowed_target_area_prefixes", [])]
            if allowed_target_area_prefixes:
                result.passed = False
                result.details.append(
                    f"{case_id}: file-path target_area cases must not define allowed_target_area_prefixes {allowed_target_area_prefixes!r}"
                )

        if not expected_files:
            result.passed = False
            result.details.append(f"{case_id}: expected.files is empty")

        primary_files, support_files = partition_case_context_files(repo_root, case)
        if not primary_files:
            result.passed = False
            result.details.append(f"{case_id}: primary prompt context is empty after file resolution")

        if source_paths and primary_files and primary_files[0] != source_paths[0]:
            result.passed = False
            result.details.append(
                f"{case_id}: prompt primary file order drifted; expected {source_paths[0]!r} first, found {primary_files[0]!r}"
            )

        if any(path in primary_files for path in support_files):
            result.passed = False
            result.details.append(f"{case_id}: support files leaked into primary prompt files")

    return result


def check_case_prompt(case: dict[str, Any]) -> TestResult:
    prompt = str(case["prompt"])
    case_id = str(case["id"])
    result = TestResult(name=f"prompt({case_id})", passed=True)

    if not re.search(r"(split|keep|layout|boundar|files|merge)", prompt, re.IGNORECASE):
        result.passed = False
        result.details.append("prompt does not look like a file-boundary planning request.")

    first_source_path = str(case["source_paths"][0]) if case.get("source_paths") else ""
    first_source_name = Path(first_source_path).name
    target_area = str(case["target_area"])
    if looks_like_file_path(target_area):
        if target_area not in prompt:
            result.passed = False
            result.details.append("prompt does not include the exact file-path target_area anchor.")
    elif target_area not in prompt and first_source_name not in prompt:
        result.passed = False
        result.details.append("prompt does not explicitly anchor the request with the target area or primary file.")

    return result


def check_fixture_files(repo_root: Path, case: dict[str, Any]) -> TestResult:
    case_id = str(case["id"])
    result = TestResult(name=f"fixtures({case_id})", passed=True)

    for relative_path in case["source_paths"]:
        candidate = repo_root / str(relative_path)
        if not candidate.exists():
            result.passed = False
            result.details.append(f"missing fixture file: {candidate}")

    return result


def validate_output_text(case: dict[str, Any], text: str, label: str) -> TestResult:
    return validate_output_text_mode(case, text, label, mode="strict")


def validate_output_text_mode(case: dict[str, Any], text: str, label: str, mode: str = "strict") -> TestResult:
    if mode == "semantic":
        return validate_output_text_semantic(case, text, label)
    return validate_output_text_strict(case, text, label)


def validate_output_text_strict(case: dict[str, Any], text: str, label: str) -> TestResult:
    case_id = str(case["id"])
    expected = dict(case["expected"])
    result = TestResult(name=f"{label}({case_id})", passed=True)

    required_scalars = (
        "strategy",
        "target_area",
        "repo_shape",
        "artifact_type",
        "stack",
        "why_not_fewer",
        "why_not_more",
        "confidence",
    )
    for key in required_scalars:
        if extract_scalar(text, key) in (None, ""):
            result.passed = False
            result.details.append(f"missing or empty scalar field: {key}")

    for enum_key in ("strategy", "repo_shape", "artifact_type", "stack", "confidence"):
        actual = extract_scalar(text, enum_key)
        expected_value = str(expected[enum_key]) if enum_key in expected else None
        if expected_value and actual != expected_value:
            result.passed = False
            result.details.append(f"{enum_key} expected {expected_value!r}, found {actual!r}")

    target_area = extract_scalar(text, "target_area")
    if target_area != str(case["target_area"]):
        result.passed = False
        result.details.append(f"target_area expected {case['target_area']!r}, found {target_area!r}")

    actual_paths = extract_file_paths(text)
    expected_paths = [str(path) for path in expected["files"]]
    if actual_paths != expected_paths:
        result.passed = False
        result.details.append(f"file paths expected {expected_paths!r}, found {actual_paths!r}")

    if len(re.findall(r'^\s*-\s+(?!path:)(?:"[^"]+"|.+)\s*$', text, re.MULTILINE)) < 3:
        result.passed = False
        result.details.append("output is missing expected list items for keep_inline, avoid, or risks.")

    lowered_text = text.lower()

    for snippet in expected["keep_inline"]:
        if str(snippet).lower() not in lowered_text:
            result.passed = False
            result.details.append(f"keep_inline snippet missing: {snippet}")

    for snippet in expected["avoid"]:
        if str(snippet).lower() not in lowered_text:
            result.passed = False
            result.details.append(f"avoid snippet missing: {snippet}")

    for snippet in expected.get("must_contain", []):
        if str(snippet).lower() not in lowered_text:
            result.passed = False
            result.details.append(f"required text missing: {snippet}")

    return result


def require_non_empty_scalar(result: TestResult, text: str, key: str) -> str | None:
    value = extract_scalar(text, key)
    if value in (None, ""):
        result.passed = False
        result.details.append(f"missing or empty scalar field: {key}")
    return value


def semantic_group_matches(lowered_text: str, group: Any) -> bool:
    if isinstance(group, str):
        return group.lower() in lowered_text
    if isinstance(group, list):
        return any(isinstance(option, str) and option.lower() in lowered_text for option in group)
    return False


def validate_semantic_file_groups(
    result: TestResult,
    actual_paths: list[str],
    groups: list[Any],
) -> None:
    for index, group in enumerate(groups, start=1):
        options = [str(option) for option in group] if isinstance(group, list) else [str(group)]
        if not any(option in actual_paths for option in options):
            result.passed = False
            result.details.append(
                f"semantic file group {index} expected one of {options!r}, found {actual_paths!r}"
            )


def validate_output_text_semantic(case: dict[str, Any], text: str, label: str) -> TestResult:
    case_id = str(case["id"])
    expected = dict(case["expected"])
    semantic = get_semantic_rules(case)
    result = TestResult(name=f"{label}({case_id})", passed=True)

    strategy = require_non_empty_scalar(result, text, "strategy")
    target_area = require_non_empty_scalar(result, text, "target_area")
    repo_shape = require_non_empty_scalar(result, text, "repo_shape")
    artifact_type = require_non_empty_scalar(result, text, "artifact_type")
    stack = require_non_empty_scalar(result, text, "stack")
    confidence = require_non_empty_scalar(result, text, "confidence")
    require_non_empty_scalar(result, text, "why_not_fewer")
    require_non_empty_scalar(result, text, "why_not_more")

    if strategy != str(expected["strategy"]):
        result.passed = False
        result.details.append(f"strategy expected {expected['strategy']!r}, found {strategy!r}")

    expected_target_area = str(case["target_area"])
    allowed_target_area_prefixes = [str(value) for value in semantic.get("allowed_target_area_prefixes", [])]
    if target_area != expected_target_area:
        if allowed_target_area_prefixes and any(target_area.startswith(prefix) for prefix in allowed_target_area_prefixes):
            pass
        else:
            result.passed = False
            result.details.append(f"target_area expected {expected_target_area!r}, found {target_area!r}")

    expected_stack = str(expected.get("stack", ""))
    allowed_stack = [expected_stack]
    allowed_stack.extend(str(value) for value in semantic.get("allowed_stack", []))
    if stack not in {value for value in allowed_stack if value}:
        result.passed = False
        result.details.append(f"stack expected one of {allowed_stack!r}, found {stack!r}")

    allowed_repo_shape = [str(value) for value in semantic.get("allowed_repo_shape", [])]
    if allowed_repo_shape and repo_shape not in allowed_repo_shape:
        result.passed = False
        result.details.append(f"repo_shape expected one of {allowed_repo_shape!r}, found {repo_shape!r}")

    allowed_artifact_type = [str(value) for value in semantic.get("allowed_artifact_type", [])]
    if allowed_artifact_type and artifact_type not in allowed_artifact_type:
        result.passed = False
        result.details.append(f"artifact_type expected one of {allowed_artifact_type!r}, found {artifact_type!r}")

    allowed_confidence = [str(value) for value in semantic.get("allowed_confidence", [])]
    if allowed_confidence and confidence not in allowed_confidence:
        result.passed = False
        result.details.append(f"confidence expected one of {allowed_confidence!r}, found {confidence!r}")

    actual_paths = extract_file_paths(text)
    if not actual_paths:
        result.passed = False
        result.details.append("missing semantic file paths")
    else:
        required_file_groups = list(semantic.get("required_file_groups", []))
        if required_file_groups:
            validate_semantic_file_groups(result, actual_paths, required_file_groups)
        else:
            expected_paths = [str(path) for path in expected["files"]]
            if actual_paths != expected_paths:
                result.passed = False
                result.details.append(f"file paths expected {expected_paths!r}, found {actual_paths!r}")

        max_files = semantic.get("max_files")
        if isinstance(max_files, int) and len(actual_paths) > max_files:
            result.passed = False
            result.details.append(f"semantic max_files expected <= {max_files}, found {len(actual_paths)}")

        min_files = semantic.get("min_files")
        if isinstance(min_files, int) and len(actual_paths) < min_files:
            result.passed = False
            result.details.append(f"semantic min_files expected >= {min_files}, found {len(actual_paths)}")

        forbidden_paths = get_semantic_forbidden_paths(case)
        for forbidden in forbidden_paths:
            if forbidden in actual_paths:
                result.passed = False
                result.details.append(f"semantic forbidden path present: {forbidden}")

    lowered_text = text.lower()
    for index, group in enumerate(semantic.get("required_term_groups", []), start=1):
        if not semantic_group_matches(lowered_text, group):
            result.passed = False
            result.details.append(f"semantic required term group {index} missing: {group!r}")

    return result


def check_mutation_anchor_uniqueness(case: dict[str, Any], text: str) -> list[str]:
    expected = dict(case["expected"])
    phrases = list(expected.get("must_contain", [])) or list(expected.get("keep_inline", []))[:1]
    details: list[str] = []

    for phrase in phrases[:1]:
        occurrences = len(re.findall(re.escape(str(phrase)), text, re.IGNORECASE))
        if occurrences != 1:
            details.append(
                f"mutation anchor phrase should appear exactly once in golden output: {phrase!r} (found {occurrences})"
            )

    return details


def check_golden_output(case: dict[str, Any], mode: str) -> TestResult:
    case_id = str(case["id"])
    golden_path = GOLDEN_DIR / f"{case_id}.yaml"
    if not golden_path.exists():
        return TestResult(
            name=f"golden({case_id})",
            passed=False,
            details=[f"missing golden output: {golden_path}"],
        )

    golden_text = golden_path.read_text(encoding="utf-8")
    result = validate_output_text_mode(case, golden_text, "golden", mode=mode)
    if mode == "strict":
        for detail in check_mutation_anchor_uniqueness(case, golden_text):
            result.passed = False
            result.details.append(detail)
    return result


def run_checks(selected_case: str | None, mode: str) -> list[TestResult]:
    repo_root, cases = load_cases()
    chosen_cases = [case for case in cases if selected_case in (None, str(case["id"]))]

    results = [
        check_contract_files(),
        check_eval_docs(cases),
        check_case_contracts(repo_root, cases),
    ]

    if selected_case and not chosen_cases:
        return results + [TestResult(name=f"case({selected_case})", passed=False, details=["unknown case id"])]

    for case in chosen_cases:
        results.append(check_case_prompt(case))
        results.append(check_fixture_files(repo_root, case))
        results.append(check_golden_output(case, mode))

    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Run plan-code-file-layout regression checks.")
    parser.add_argument("--case", help="Only run a single case id.")
    parser.add_argument("--mode", choices=("strict", "semantic"), default="strict", help="Validation mode.")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")
    parser.add_argument("--list-cases", action="store_true", help="Print available case ids and exit.")
    args = parser.parse_args()

    if args.list_cases:
        _, cases = load_cases()
        for case in cases:
            print(case["id"])
        return 0

    results = run_checks(args.case, args.mode)

    if args.json:
        print(json.dumps([result.__dict__ for result in results], ensure_ascii=False, indent=2))
    else:
        print("=" * 60)
        print(f"plan-code-file-layout evaluation report ({args.mode})")
        print("=" * 60)
        for result in results:
            status = "PASS" if result.passed else "FAIL"
            print(f"{status} - {result.name}")
            for detail in result.details:
                print(f"  {detail}")

        passed = sum(1 for result in results if result.passed)
        print()
        print(f"summary: {passed}/{len(results)} checks passed")

    return 0 if all(result.passed for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
