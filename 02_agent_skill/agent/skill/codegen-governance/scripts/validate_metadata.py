"""
Validate metadata consistency across the skill repository.

Checks:
1. skill.yaml parses correctly and matches SKILL.md frontmatter
2. eval_suite in skill.yaml matches actual files in evals/
3. All JSON files in evals/ parse correctly
4. Template files contain required anchor sections
5. Schema files are valid YAML
6. SKILL.md references point to existing files
7. Prohibited patterns and lang-rules files are present for all target languages
8. validation-plan eval cases parse correctly

Usage:
    python scripts/validate_metadata.py
    python scripts/validate_metadata.py --verbose
    python scripts/validate_metadata.py --strict

Exit codes:
    0  — all checks passed
    1  — one or more checks failed
    2  — usage error
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]

# Anchors that MUST be present in each template file
REQUIRED_TEMPLATE_ANCHORS = {
    "references/pre-generation-contract-template.md": [
        "##-Contract-Metadata",
        "##-Target-Language",
        "##-Scope",
        "##-Selected-Scenario-Packs",
        "##-Input-Contract",
        "##-Return-And-Failure-Contract",
    ],
    "references/implementation-report-template.md": [
        "##-Report-Metadata",
        "##-Language-Specific-Rules-Applied",
        "##-Covered-Edge-Cases",
        "##-Residual-Risks",
        "##-Executed-Validation",
        "##-Validation-Not-Run",
        "##-Validation-Distinction",
        "##-Contract-Deviations",
    ],
}

# Required language-specific files per target language
REQUIRED_LANG_FILES = {
    "python": ["references/lang-rules/python.md", "references/prohibited-patterns/python.md"],
    "go": ["references/lang-rules/go.md", "references/prohibited-patterns/go.md"],
    "typescript": [
        "references/lang-rules/typescript.md",
        "references/prohibited-patterns/typescript.md",
    ],
    # JavaScript reuses TypeScript's prohibited patterns (no separate js-prohibited-patterns.md)
    "javascript": ["references/lang-rules/typescript.md"],
    "vue": ["references/lang-rules/vue.md", "references/prohibited-patterns/vue.md"],
}

# Required scenario pack files
REQUIRED_SCENARIO_PACKS = [
    "references/scenario-input-branching.md",
    "references/scenario-fallback-contract.md",
    "references/scenario-side-effect-runtime.md",
    "references/scenario-boundary-observability.md",
]

# Required base reference files
REQUIRED_REFERENCE_FILES = [
    "references/base-rules.md",
    "references/source-priority.md",
    "references/exception-policy.md",
    "references/environment-routing.md",
    "references/environment-coverage-index.md",
    "references/durable-reference-index.md",
    "references/reference-governance.md",
    "references/scenario-selection.md",
    "references/pre-generation-contract-template.md",
    "references/implementation-report-template.md",
    "references/development-guide.md",
]


def load_yaml(path: Path) -> object:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def extract_frontmatter(path: Path) -> object:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not match:
        raise ValueError("missing frontmatter block")
    return yaml.safe_load(match.group(1))


def check_yaml_and_frontmatter(issues: list[str]) -> dict:
    """Check skill.yaml and SKILL.md frontmatter consistency."""
    skill_yaml_path = ROOT / "skill.yaml"
    skill_md_path = ROOT / "SKILL.md"
    result = {}

    try:
        skill = load_yaml(skill_yaml_path)
    except Exception as exc:
        issues.append(f"skill.yaml parse failed: {exc}")
        skill = {}

    if not isinstance(skill, dict):
        issues.append("skill.yaml must parse to a mapping")
        skill = {}

    try:
        frontmatter = extract_frontmatter(skill_md_path)
    except Exception as exc:
        issues.append(f"SKILL.md frontmatter parse failed: {exc}")
        frontmatter = {}

    if not isinstance(frontmatter, dict):
        issues.append("SKILL.md frontmatter must parse to a mapping")
        frontmatter = {}

    skill_id = skill.get("id")
    frontmatter_name = frontmatter.get("name")
    if skill_id and frontmatter_name and skill_id != frontmatter_name:
        issues.append(
            f"SKILL.md frontmatter name mismatch: {frontmatter_name!r} != {skill_id!r}"
        )

    # SKILL.md frontmatter is intentionally minimal and may omit version.
    # Only compare versions when SKILL.md explicitly carries one.
    skill_version = skill.get("version", "")
    frontmatter_version = frontmatter.get("version")
    if frontmatter_version is not None and skill_version != frontmatter_version:
        issues.append(
            f"Version mismatch: skill.yaml version={skill_version!r}, "
            f"SKILL.md frontmatter version={frontmatter_version!r}"
        )

    # Check description length (too short = likely copy-paste error)
    desc = skill.get("description", "")
    if len(desc) < 50:
        issues.append(f"skill.yaml description too short ({len(desc)} chars): {desc!r}")

    result["skill"] = skill
    result["frontmatter"] = frontmatter
    return result


def check_eval_suite(skill: dict, issues: list[str]) -> None:
    """Check eval_suite consistency."""
    eval_dir = ROOT / "evals"

    eval_suite = skill.get("eval_suite", [])
    if not isinstance(eval_suite, list):
        issues.append("skill.yaml eval_suite must be a list of file paths")
        eval_suite = []

    listed_eval_paths = {Path(item).as_posix() for item in eval_suite if isinstance(item, str)}
    for rel_path in sorted(listed_eval_paths):
        target = ROOT / rel_path
        if not target.exists():
            issues.append(f"eval_suite missing file: {rel_path}")

    if not eval_dir.exists():
        issues.append("evals/ directory does not exist")
        return

    actual_eval_paths = {
        path.relative_to(ROOT).as_posix() for path in eval_dir.iterdir() if path.is_file()
    }
    missing_from_eval_suite = sorted(actual_eval_paths - listed_eval_paths)
    if missing_from_eval_suite:
        issues.append(
            "eval_suite missing repo eval assets: " + ", ".join(missing_from_eval_suite)
        )

    # Check JSON eval files parse correctly
    for json_path in sorted(eval_dir.glob("*.json")):
        try:
            doc = load_json(json_path)
        except Exception as exc:
            issues.append(f"{json_path.relative_to(ROOT)} parse failed: {exc}")
            continue
        if not isinstance(doc, dict):
            issues.append(f"{json_path.relative_to(ROOT)} must parse to a JSON object")


def check_template_anchors(issues: list[str]) -> None:
    """Check that template files contain required anchor sections."""
    for rel_path, required_anchors in REQUIRED_TEMPLATE_ANCHORS.items():
        path = ROOT / rel_path
        if not path.exists():
            issues.append(f"Template file missing: {rel_path}")
            continue

        text = path.read_text(encoding="utf-8")
        missing = []
        for anchor in required_anchors:
            if anchor not in text:
                missing.append(anchor)

        if missing:
            issues.append(
                f"Template {rel_path} missing anchors: " + ", ".join(missing)
            )


def check_schema_files(issues: list[str]) -> None:
    """Check that schema files are valid YAML."""
    schema_dir = ROOT / "references"
    for yaml_file in schema_dir.glob("schema*.yaml"):
        try:
            doc = load_yaml(yaml_file)
        except Exception as exc:
            issues.append(f"Schema file {yaml_file.name} parse failed: {exc}")
            continue
        if not isinstance(doc, dict):
            issues.append(f"Schema file {yaml_file.name} must parse to a mapping")


def check_lang_files(issues: list[str]) -> None:
    """Check that language-specific files exist for all target languages."""
    for lang, files in REQUIRED_LANG_FILES.items():
        for rel_path in files:
            path = ROOT / rel_path
            if not path.exists():
                issues.append(f"Language file missing for {lang}: {rel_path}")


def check_scenario_packs(issues: list[str]) -> None:
    """Check that all scenario pack files exist."""
    for rel_path in REQUIRED_SCENARIO_PACKS:
        path = ROOT / rel_path
        if not path.exists():
            issues.append(f"Scenario pack file missing: {rel_path}")


def check_reference_files(issues: list[str]) -> None:
    """Check that all required reference files exist."""
    for rel_path in REQUIRED_REFERENCE_FILES:
        path = ROOT / rel_path
        if not path.exists():
            issues.append(f"Required reference file missing: {rel_path}")


def check_md_references(issues: list[str]) -> None:
    """Check that markdown files reference existing paths."""
    md_files = [
        path
        for path in ROOT.rglob("*.md")
        if "__pycache__" not in path.parts
    ]

    for md_path in md_files:
        text = md_path.read_text(encoding="utf-8")
        # Match markdown links: [text](./path) or [text](../path)
        # or bare references: [name](path)
        links = re.findall(r"\[([^\]]+)\]\(([^)]+)\)", text)
        for _label, url in links:
            # Skip external URLs and anchors
            if url.startswith("http") or url.startswith("#") or url.startswith("mailto:"):
                continue
            # Normalize relative path
            ref_path = (md_path.parent / url).resolve()
            # Handle anchors in URLs
            ref_path = Path(str(ref_path).split("#")[0])
            if not ref_path.exists():
                issues.append(
                    f"{md_path.relative_to(ROOT)}: broken reference to {url!r} "
                    f"(resolved: {ref_path.relative_to(ROOT)})"
                )


def check_eval_content(issues: list[str]) -> None:
    """Check that eval JSON files have required fields."""
    eval_dir = ROOT / "evals"

    trigger_path = eval_dir / "trigger.json"
    if trigger_path.exists():
        try:
            data = load_json(trigger_path)
            if (
                "should_trigger" not in data
                and "should_not_trigger" not in data
                and "recover_anchor_then_activate" not in data
            ):
                issues.append(
                    "trigger.json missing all trigger decision arrays "
                    "('should_trigger', 'should_not_trigger', 'recover_anchor_then_activate')"
                )
            for case in data.get("should_trigger", []):
                if "id" not in case:
                    issues.append("trigger.json: case missing 'id'")
                if "text" not in case:
                    issues.append(f"trigger.json: case {case.get('id', '?')} missing 'text'")
                if "expected_trigger" not in case and "expected_decision" not in case:
                    issues.append(
                        f"trigger.json: case {case.get('id', '?')} missing "
                        "'expected_trigger' or 'expected_decision'"
                    )
            for case in data.get("should_not_trigger", []):
                if "id" not in case:
                    issues.append("trigger.json: no-trigger case missing 'id'")
            for case in data.get("recover_anchor_then_activate", []):
                if "id" not in case:
                    issues.append("trigger.json: recover-anchor case missing 'id'")
                if "text" not in case:
                    issues.append(
                        f"trigger.json: recover-anchor case {case.get('id', '?')} missing 'text'"
                    )
        except Exception as exc:
            issues.append(f"trigger.json validation error: {exc}")

    tasks_path = eval_dir / "tasks.json"
    if tasks_path.exists():
        try:
            data = load_json(tasks_path)
            if "tasks" not in data:
                issues.append("tasks.json missing 'tasks' array")
            for task in data.get("tasks", []):
                if "id" not in task:
                    issues.append("tasks.json: task missing 'id'")
                if "scenario_packs" not in task:
                    issues.append(f"tasks.json: task {task.get('id', '?')} missing 'scenario_packs'")
        except Exception as exc:
            issues.append(f"tasks.json validation error: {exc}")

    scenario_path = eval_dir / "scenario-selection-cases.json"
    if scenario_path.exists():
        try:
            data = load_json(scenario_path)
            if "cases" not in data:
                issues.append("scenario-selection-cases.json missing 'cases' array")
        except Exception as exc:
            issues.append(f"scenario-selection-cases.json validation error: {exc}")

    validation_plan_path = eval_dir / "validation-plan-cases.json"
    if validation_plan_path.exists():
        try:
            data = load_json(validation_plan_path)
            if "cases" not in data:
                issues.append("validation-plan-cases.json missing 'cases' array")
            for case in data.get("cases", []):
                if "id" not in case:
                    issues.append("validation-plan-cases.json: case missing 'id'")
                if "language" not in case:
                    issues.append(f"validation-plan-cases.json: case {case.get('id', '?')} missing 'language'")
                if "target" not in case:
                    issues.append(f"validation-plan-cases.json: case {case.get('id', '?')} missing 'target'")
                if "files" not in case:
                    issues.append(f"validation-plan-cases.json: case {case.get('id', '?')} missing 'files'")
        except Exception as exc:
            issues.append(f"validation-plan-cases.json validation error: {exc}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--strict", action="store_true",
        help="Treat warnings as errors")
    args = parser.parse_args()

    issues: list[str] = []

    # Run all checks
    result = check_yaml_and_frontmatter(issues)
    skill = result.get("skill", {})
    check_eval_suite(skill, issues)
    check_template_anchors(issues)
    check_schema_files(issues)
    check_lang_files(issues)
    check_scenario_packs(issues)
    check_reference_files(issues)
    check_md_references(issues)
    check_eval_content(issues)

    # Count by severity
    fatal_issues = [i for i in issues if i.startswith("[FATAL]")]
    other_issues = [i for i in issues if not i.startswith("[FATAL]")]

    if fatal_issues:
        print("Metadata validation FAILED:")
        for issue in fatal_issues:
            print(f"- {issue}")

    if other_issues and args.verbose:
        print("\nWarnings:")
        for issue in other_issues:
            print(f"- {issue}")

    if other_issues and args.strict:
        print("\nStrict mode: treating warnings as errors:")
        for issue in other_issues:
            print(f"- {issue}")
        return 1

    if issues:
        print(f"\nMetadata validation failed with {len(issues)} issue(s).")
        return 1

    print("Metadata validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
