import argparse
import json
import re
from pathlib import Path

import yaml


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def read_yaml(path: Path):
    return yaml.safe_load(read_text(path))


def parse_bullet_code_values(block: str) -> list[str]:
    return re.findall(r"^- `([^`]+)`$", block, re.M)


def extract_section(source: str, start: str, end: str) -> str:
    match = re.search(start + r"\n(.*?)\n" + end, source, re.S | re.M)
    if not match:
        raise ValueError(f"Could not extract section between {start} and {end}")
    return match.group(1)


def walk_dict(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield key, value
            yield from walk_dict(value)
    elif isinstance(obj, list):
        for item in obj:
            yield from walk_dict(item)


def find_order_positions(text: str, items: list[str]) -> list[int]:
    positions = []
    cursor = 0
    for item in items:
        pos = text.find(item, cursor)
        positions.append(pos)
        if pos != -1:
            cursor = pos + len(item)
    return positions


def validate_case_input(case: dict, suite_name: str, allowed: dict[str, set[str]], errors: list[str]):
    payload = case.get("input", {})
    if isinstance(payload, str):
        return

    output_mode = payload.get("output_mode")
    if output_mode and output_mode not in allowed["output_modes"]:
        errors.append(f"{suite_name}:{case['id']}: invalid output_mode '{output_mode}'")

    task_mode = payload.get("task_mode")
    if task_mode and task_mode not in allowed["task_modes"]:
        errors.append(f"{suite_name}:{case['id']}: invalid task_mode '{task_mode}'")

    scene_card = payload.get("scene_card")
    if scene_card and scene_card not in allowed["scene_cards"]:
        errors.append(f"{suite_name}:{case['id']}: invalid scene_card '{scene_card}'")

    platform_surface = payload.get("platform_surface")
    if platform_surface and platform_surface not in allowed["platforms"]:
        errors.append(f"{suite_name}:{case['id']}: invalid platform_surface '{platform_surface}'")

    for key, value in walk_dict(payload):
        if key == "modifiers":
            for modifier in value:
                if modifier not in allowed["modifiers"]:
                    errors.append(f"{suite_name}:{case['id']}: invalid modifier '{modifier}'")


def validate_expected_output(case: dict, suite_prefix: str, root: Path, errors: list[str], checks: list[str]):
    expected = case.get("expected", {})
    golden_ref = expected.get("golden_output")
    if not golden_ref:
        errors.append(f"{suite_prefix}:{case['id']}: missing golden_output")
        return

    golden_path = root / golden_ref
    if not golden_path.exists():
        errors.append(f"{suite_prefix}:{case['id']}: missing golden_output '{golden_ref}'")
        return

    golden_text = read_text(golden_path)

    for section in expected.get("required_sections", []):
        if f"## {section}" not in golden_text:
            errors.append(f"{suite_prefix}:{case['id']}: golden missing heading '## {section}'")

    for text in expected.get("must_include", []):
        if text not in golden_text:
            errors.append(f"{suite_prefix}:{case['id']}: golden missing required text '{text}'")

    for text in expected.get("must_not_include", []):
        if text in golden_text:
            errors.append(f"{suite_prefix}:{case['id']}: golden contains forbidden text '{text}'")

    ranking = expected.get("ranking_expectation")
    if ranking:
        winner = ranking.get("winner")
        if winner and winner not in golden_text:
            errors.append(f"{suite_prefix}:{case['id']}: winner '{winner}' missing in golden")
        ordered = ranking.get("ordered_candidates", [])
        if ordered:
            positions = find_order_positions(golden_text, ordered)
            if any(pos == -1 for pos in positions):
                errors.append(f"{suite_prefix}:{case['id']}: ranked candidates missing from golden")
            elif positions != sorted(positions):
                errors.append(f"{suite_prefix}:{case['id']}: ranked candidates out of order in golden")

    evidence = expected.get("evidence_expectation")
    if evidence:
        for section in evidence.get("required_sections", []):
            if section not in golden_text:
                errors.append(f"{suite_prefix}:{case['id']}: missing evidence section text '{section}' in golden")
        for token in evidence.get("required_winner_evidence", []):
            if token not in golden_text:
                errors.append(f"{suite_prefix}:{case['id']}: missing winner evidence '{token}' in golden")

    checks.append(f"{suite_prefix}:{case['id']}: golden contract ok")


def validate_metadata(skill_text: str, guide_text: str, openai_yaml: dict, errors: list[str]):
    if "model-ready output" not in skill_text:
        errors.append("SKILL.md overview does not mention the default model-ready behavior")
    if "model-ready web prompt plus image input fields" not in guide_text:
        errors.append("input-fill-guide purpose does not mention the default model-ready output")

    short_description = openai_yaml["interface"]["short_description"]
    default_prompt = openai_yaml["interface"]["default_prompt"]
    if "模型可用" not in short_description and "结构化字段" not in short_description:
        errors.append("agents/openai.yaml short_description does not mention model-ready output")
    if "model-ready" not in default_prompt:
        errors.append("agents/openai.yaml default_prompt does not mention model-ready output")
    if "design-goal" not in default_prompt and "scenario briefs" not in default_prompt:
        errors.append("agents/openai.yaml default_prompt does not mention design-goal derivation flow")


def validate_dynamic_case(case: dict, root: Path, errors: list[str], checks: list[str]):
    example_path = root / case["source_example"]
    output_path = root / case["reference_output"]

    if not example_path.exists():
        errors.append(f"dynamic:{case['id']}: missing source_example '{case['source_example']}'")
        return
    if not output_path.exists():
        errors.append(f"dynamic:{case['id']}: missing reference_output '{case['reference_output']}'")
        return

    example = read_yaml(example_path)
    request = example["user_request"]
    output = read_text(output_path)

    shape = case["expected_output_shape"]
    required_shape_heads = {
        "single-image": "## Web Prompt",
        "sequence": "## Web Prompt",
        "scenario-validation": "## Recommended Route",
        "missing-fields": "## Missing Fields",
        "expanded-single-image": "## Task Summary",
        "expanded-sequence": "## Sequence Brief",
        "expanded-scenario-validation": "## Design Goal",
    }
    expected_head = required_shape_heads[shape]
    if expected_head not in output:
        errors.append(f"dynamic:{case['id']}: output shape '{shape}' missing head '{expected_head}'")

    for section in case.get("required_sections", []):
        if f"## {section}" not in output:
            errors.append(f"dynamic:{case['id']}: missing required section '{section}'")

    for token in case.get("required_request_signals", []):
        if token not in request:
            errors.append(f"dynamic:{case['id']}: request missing signal '{token}'")

    for token in case.get("required_output_evidence", []):
        if token not in output:
            errors.append(f"dynamic:{case['id']}: output missing evidence '{token}'")

    for token in case.get("forbidden_output_tokens", []):
        if token in output:
            errors.append(f"dynamic:{case['id']}: output contains forbidden token '{token}'")

    checks.append(f"dynamic:{case['id']}: example-to-output contract ok")


def main():
    parser = argparse.ArgumentParser(description="Run static contract checks for the image skill.")
    parser.add_argument("skill_dir", nargs="?", default=".", help="Path to the skill directory")
    args = parser.parse_args()

    root = Path(args.skill_dir).resolve()

    skill_text = read_text(root / "SKILL.md")
    guide_text = read_text(root / "references" / "input-fill-guide.md")
    openai_yaml = read_yaml(root / "agents" / "openai.yaml")
    task_suite = read_yaml(root / "evals" / "task" / "core.yaml")
    regression_suite = read_yaml(root / "evals" / "regression" / "core.yaml")
    trigger_suite = read_yaml(root / "evals" / "trigger" / "core.yaml")
    dynamic_suite = read_yaml(root / "evals" / "dynamic" / "core.yaml")

    allowed = {
        "output_modes": set(
            parse_bullet_code_values(
                extract_section(guide_text, r"### `output_mode`", r"### `task_mode`")
            )
        ),
        "task_modes": set(
            parse_bullet_code_values(
                extract_section(guide_text, r"### `task_mode`", r"### `scene_card`")
            )
        ),
        "scene_cards": set(
            parse_bullet_code_values(
                extract_section(guide_text, r"### `scene_card`", r"### `platform_surface`")
            )
        ),
        "platforms": set(
            parse_bullet_code_values(
                extract_section(guide_text, r"### `platform_surface`", r"### `modifiers`")
            )
        ),
        "modifiers": set(
            parse_bullet_code_values(
                extract_section(guide_text, r"### `modifiers`", r"## Template 0")
            )
        ),
    }

    errors: list[str] = []
    checks: list[str] = []

    validate_metadata(skill_text, guide_text, openai_yaml, errors)

    for case in task_suite["cases"]:
        validate_case_input(case, "task", allowed, errors)
        validate_expected_output(case, "task", root, errors, checks)

    for case in regression_suite["cases"]:
        validate_case_input(case, "regression", allowed, errors)
        validate_expected_output(case, "regression", root, errors, checks)

    for case in trigger_suite["cases"]:
        if not isinstance(case.get("input"), str):
            errors.append(f"trigger:{case['id']}: trigger input should stay string-based")

    for case in dynamic_suite["cases"]:
        validate_dynamic_case(case, root, errors, checks)

    summary = {
        "errors": errors,
        "checks": checks,
        "counts": {
            "task_cases": len(task_suite["cases"]),
            "regression_cases": len(regression_suite["cases"]),
            "trigger_cases": len(trigger_suite["cases"]),
            "dynamic_cases": len(dynamic_suite["cases"]),
            "output_modes": len(allowed["output_modes"]),
            "task_modes": len(allowed["task_modes"]),
            "scene_cards": len(allowed["scene_cards"]),
            "platforms": len(allowed["platforms"]),
            "modifiers": len(allowed["modifiers"]),
        },
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
