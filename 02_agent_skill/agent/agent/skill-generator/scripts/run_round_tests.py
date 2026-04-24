#!/usr/bin/env python3
"""Run structured round tests for skill-generator（技能生成器）."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import shutil
import subprocess
import sys
import time
from typing import Any

import yaml


SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent


@dataclass
class CommandResult:
    command: list[str]
    returncode: int
    stdout: str
    stderr: str
    duration_ms: int
    stdout_bytes: int
    stderr_bytes: int


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"YAML root must be a mapping: {path}")
    return data


def run_command(command: list[str]) -> CommandResult:
    start = time.perf_counter()
    completed = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace")
    duration_ms = round((time.perf_counter() - start) * 1000)
    stdout_bytes = len(completed.stdout.encode("utf-8", errors="replace"))
    stderr_bytes = len(completed.stderr.encode("utf-8", errors="replace"))
    return CommandResult(command, completed.returncode, completed.stdout, completed.stderr, duration_ms, stdout_bytes, stderr_bytes)


def resolve_validation_path(base: Path, raw_path: str) -> Path:
    if raw_path == "@skill_root":
        return SKILL_DIR
    return (base / raw_path).resolve()


def ensure_within(parent: Path, child: Path) -> None:
    parent = parent.resolve()
    child = child.resolve()
    if parent == child or parent in child.parents:
        return
    raise ValueError(f"Refusing to operate outside parent directory: {child} not within {parent}")


def reset_directory(path: Path, parent: Path) -> None:
    ensure_within(parent, path)
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def assert_files(case_dir: Path, expected_files: list[str]) -> list[str]:
    failures = []
    for file_name in expected_files:
        if not (case_dir / file_name).exists():
            failures.append(f"missing_file:{file_name}")
    return failures


def assert_snippets(case_dir: Path, required_snippets: dict[str, list[str]]) -> list[str]:
    failures = []
    for file_name, snippets in required_snippets.items():
        path = case_dir / file_name
        if not path.exists():
            failures.append(f"missing_for_snippet_check:{file_name}")
            continue
        content = path.read_text(encoding="utf-8")
        for snippet in snippets:
            if snippet not in content:
                failures.append(f"missing_snippet:{file_name}:{snippet}")
    return failures


def assert_no_template_markers(path: Path) -> list[str]:
    content = path.read_text(encoding="utf-8")
    failures = []
    if "{{" in content or "}}" in content:
        failures.append(f"template_marker_present:{path.name}")
    for line in content.splitlines():
        stripped = line.strip()
        if stripped in {"-", "- ", "1.", "1. "}:
            failures.append(f"empty_placeholder_line:{path.name}:{line}")
    return failures


def assert_semantic_file(case_dir: Path, file_name: str) -> list[str]:
    path = case_dir / file_name
    if not path.exists():
        return [f"missing_for_semantic_check:{file_name}"]

    failures = []
    if path.suffix == ".md":
        failures.extend(assert_no_template_markers(path))
        bullet_lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip().startswith(("- ", "1."))]
        if len(bullet_lines) < 2:
            failures.append(f"insufficient_semantic_content:{file_name}")
    elif path.suffix == ".yaml":
        data = load_yaml(path)
        if file_name == "skill-score-summary.yaml":
            if not isinstance(data.get("total_score"), int):
                failures.append("invalid_score_summary:total_score")
            if not isinstance(data.get("hard_gate_pass"), bool):
                failures.append("invalid_score_summary:hard_gate_pass")
            if not str(data.get("release_recommendation", "")).strip():
                failures.append("invalid_score_summary:release_recommendation")
        elif file_name == "experience-ledger.yaml":
            entries = data.get("entries", [])
            if not isinstance(entries, list) or not entries:
                failures.append("experience_ledger_empty")
            else:
                entry = entries[0]
                for key in ("id", "signal", "action", "outcome", "follow_up"):
                    if not str(entry.get(key, "")).strip():
                        failures.append(f"experience_ledger_missing:{key}")
        elif file_name == "run-manifest.yaml":
            created_files = data.get("created_files", [])
            if not isinstance(created_files, list) or not created_files:
                failures.append("run_manifest_empty")
            else:
                for listed in created_files:
                    if not (case_dir / listed).exists():
                        failures.append(f"run_manifest_missing_file:{listed}")
        elif file_name == "case-telemetry.yaml":
            for key in ("command_count", "total_wall_clock_ms", "created_file_count", "created_total_bytes"):
                value = data.get(key)
                if not isinstance(value, int) or value < 0:
                    failures.append(f"case_telemetry_invalid:{key}")
    return failures


def collect_file_stats(case_dir: Path) -> tuple[int, int]:
    files = [path for path in case_dir.iterdir() if path.is_file()]
    return len(files), sum(path.stat().st_size for path in files)


def write_case_telemetry(case_dir: Path, case_id: str, commands: list[CommandResult]) -> Path:
    created_file_count, created_total_bytes = collect_file_stats(case_dir)
    telemetry = {
        "case_id": case_id,
        "command_count": len(commands),
        "total_wall_clock_ms": sum(item.duration_ms for item in commands),
        "max_command_wall_clock_ms": max((item.duration_ms for item in commands), default=0),
        "stdout_bytes": sum(item.stdout_bytes for item in commands),
        "stderr_bytes": sum(item.stderr_bytes for item in commands),
        "created_file_count": created_file_count,
        "created_total_bytes": created_total_bytes,
    }
    path = case_dir / "case-telemetry.yaml"
    path.write_text(yaml.safe_dump(telemetry, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return path


def enrich_baseline_with_telemetry(case_dir: Path, telemetry_path: Path) -> None:
    baseline_path = case_dir / "baseline-comparison.md"
    if not baseline_path.exists():
        return
    telemetry = load_yaml(telemetry_path)
    content = baseline_path.read_text(encoding="utf-8")
    if "## Live Telemetry（实时遥测）" in content:
        return
    lines = [
        content.rstrip(),
        "",
        "## Live Telemetry（实时遥测）",
        f"- command_count（命令数）: {telemetry.get('command_count', 0)}",
        f"- total_wall_clock_ms（总耗时毫秒）: {telemetry.get('total_wall_clock_ms', 0)}",
        f"- max_command_wall_clock_ms（单命令最大耗时毫秒）: {telemetry.get('max_command_wall_clock_ms', 0)}",
        f"- created_file_count（产物文件数）: {telemetry.get('created_file_count', 0)}",
        f"- created_total_bytes（产物总字节数）: {telemetry.get('created_total_bytes', 0)}",
    ]
    baseline_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def summarize_round_telemetry(case_results: list[dict[str, Any]]) -> dict[str, int]:
    telemetry_items = [item.get("telemetry", {}) for item in case_results if isinstance(item.get("telemetry"), dict)]
    return {
        "case_telemetry_count": len([item for item in telemetry_items if item]),
        "total_command_count": sum(int(item.get("command_count", 0)) for item in telemetry_items),
        "total_wall_clock_ms": sum(int(item.get("total_wall_clock_ms", 0)) for item in telemetry_items),
        "total_stdout_bytes": sum(int(item.get("stdout_bytes", 0)) for item in telemetry_items),
        "total_stderr_bytes": sum(int(item.get("stderr_bytes", 0)) for item in telemetry_items),
        "total_created_file_count": sum(int(item.get("created_file_count", 0)) for item in telemetry_items),
        "total_created_bytes": sum(int(item.get("created_total_bytes", 0)) for item in telemetry_items),
    }


def write_round_telemetry(round_dir: Path, telemetry_summary: dict[str, int]) -> Path:
    path = round_dir / "round-telemetry.yaml"
    path.write_text(yaml.safe_dump(telemetry_summary, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return path


def write_regression_report(round_dir: Path, previous_summary_path: Path, current_results: list[dict[str, Any]], current_telemetry: dict[str, int]) -> Path:
    if not previous_summary_path.exists():
        raise FileNotFoundError(f"Previous summary not found: {previous_summary_path}")
    previous = load_yaml(previous_summary_path)
    previous_failures = {item["case_id"] for item in previous.get("results", []) if not item.get("passed", False)}
    current_failures = {item["case_id"] for item in current_results if not item.get("passed", False)}
    fixed = sorted(previous_failures - current_failures)
    new = sorted(current_failures - previous_failures)
    persistent = sorted(previous_failures & current_failures)

    previous_telemetry = previous.get("telemetry", {}) if isinstance(previous.get("telemetry"), dict) else {}
    lines = ["# regression-report（回归报告）", "", "## Fixed Failures（已修复失败）", ""]
    lines.extend([f"- {item}" for item in fixed] or ["- none（无）"])
    lines.extend(["", "## New Failures（新增失败）", ""])
    lines.extend([f"- {item}" for item in new] or ["- none（无）"])
    lines.extend(["", "## Persistent Failures（持续失败）", ""])
    lines.extend([f"- {item}" for item in persistent] or ["- none（无）"])
    lines.extend(["", "## Telemetry Delta（遥测差值）", ""])
    for key in ("total_command_count", "total_wall_clock_ms", "total_created_bytes"):
        previous_value = int(previous_telemetry.get(key, 0))
        current_value = int(current_telemetry.get(key, 0))
        delta = current_value - previous_value
        lines.append(f"- {key}: {previous_value} -> {current_value} (delta（差值） {delta})")

    path = round_dir / "regression-report.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def write_round_summary(round_dir: Path, round_name: str, case_results: list[dict[str, Any]], telemetry_summary: dict[str, int], extra_sections: list[str] | None = None) -> None:
    total_cases = len(case_results)
    passed_cases = sum(1 for item in case_results if item["passed"])
    pass_rate = 0.0 if total_cases == 0 else round((passed_cases / total_cases) * 100, 2)
    validation_cases = [item for item in case_results if str(item["case_id"]).startswith("validate:")]
    validation_status = "passed" if validation_cases and all(item["passed"] for item in validation_cases) else "failed"
    failed_case_ids = [item["case_id"] for item in case_results if not item["passed"]]

    lines = [f"# {round_name} aggregate-report（聚合报告）", "", "## Round Summary（轮次汇总）", ""]
    lines.append(f"- Cases Passed（通过用例）: {passed_cases}/{total_cases}")
    lines.append(f"- pass_rate（通过率）: {pass_rate}%")
    lines.append(f"- Validation Status（校验状态）: {validation_status}")
    lines.append(f"- total_command_count（总命令数）: {telemetry_summary.get('total_command_count', 0)}")
    lines.append(f"- total_wall_clock_ms（总耗时毫秒）: {telemetry_summary.get('total_wall_clock_ms', 0)}")
    lines.append(f"- total_created_bytes（总产物字节数）: {telemetry_summary.get('total_created_bytes', 0)}")
    lines.append("")
    for item in case_results:
        lines.append(f"- {item['case_id']}: {'pass' if item['passed'] else 'fail'}")
    lines.append("")
    lines.append("## Failures Fixed（已修复失败）")
    lines.append("")
    if failed_case_ids:
        for case_id in failed_case_ids:
            lines.append(f"- Pending fix（待修复）: {case_id}")
    else:
        lines.append("- No remaining failed cases in this round（本轮无剩余失败用例）")
    lines.append("")
    lines.append("## Residual Risks（剩余风险）")
    lines.append("")
    lines.append("- Real-world data volume is still lower than long-term production usage（真实数据量仍低于长期生产使用）")
    lines.append("- Telemetry is run-derived and local-only, not yet connected to external production observability（遥测目前来自本地运行，还未接入外部生产可观测系统）")
    if extra_sections:
        lines.append("")
        lines.extend(extra_sections)
    (round_dir / "aggregate-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def configure_streams() -> None:
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")


def run_case(case: dict[str, Any], round_dir: Path, force: bool, score_input: Path | None) -> dict[str, Any]:
    case_id = case["id"]
    mode = case["mode"]
    case_dir = round_dir / case_id
    if force:
        reset_directory(case_dir, round_dir)
    else:
        case_dir.mkdir(parents=True, exist_ok=True)
        if any(case_dir.iterdir()):
            return {
                "case_id": case_id,
                "passed": False,
                "failures": [f"stale_output_detected:{case_dir}"],
                "command_log": [],
            }

    commands: list[CommandResult] = []
    generator = case.get("generator", "scaffold")

    if generator == "end_to_end":
        input_file = Path(case["input_file"]).resolve()
        e2e_cmd = [
            sys.executable,
            str(SCRIPT_DIR / "generate_skill_bundle.py"),
            str(input_file),
            str(case_dir),
        ]
        if force:
            e2e_cmd.append("--force")
        commands.append(run_command(e2e_cmd))
    else:
        skill_name = case["skill_name"]
        request_summary = case["request_summary"]
        scaffold_cmd = [
            sys.executable,
            str(SCRIPT_DIR / "scaffold_skill_outputs.py"),
            str(case_dir),
            "--skill-name",
            skill_name,
            "--request-summary",
            request_summary,
            "--mode",
            mode,
        ]
        if force:
            scaffold_cmd.append("--force")
        commands.append(run_command(scaffold_cmd))

    case_score_input = score_input
    if case.get("score_input"):
        case_score_input = Path(case["score_input"]).resolve()

    if case_score_input is not None:
        score_cmd = [
            sys.executable,
            str(SCRIPT_DIR / "score_skill_qi.py"),
            str(case_score_input),
            "--output",
            str(case_dir / "skill-scorecard.md"),
            "--summary-output",
            str(case_dir / "skill-score-summary.yaml"),
        ]
        commands.append(run_command(score_cmd))

    telemetry_path = write_case_telemetry(case_dir, case_id, commands)
    enrich_baseline_with_telemetry(case_dir, telemetry_path)

    failures: list[str] = []
    for result in commands:
        if result.returncode != 0:
            failures.append(f"command_failed:{' '.join(result.command)}")

    failures.extend(assert_files(case_dir, case.get("expected_files", [])))
    failures.extend(assert_snippets(case_dir, case.get("required_snippets", {})))
    for semantic_file in case.get("semantic_required_files", []):
        failures.extend(assert_semantic_file(case_dir, semantic_file))
    if case.get("telemetry_required", True):
        failures.extend(assert_semantic_file(case_dir, "case-telemetry.yaml"))

    command_log = []
    for result in commands:
        command_log.append(
            {
                "command": result.command,
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "duration_ms": result.duration_ms,
                "stdout_bytes": result.stdout_bytes,
                "stderr_bytes": result.stderr_bytes,
            }
        )

    return {
        "case_id": case_id,
        "passed": not failures,
        "failures": failures,
        "command_log": command_log,
        "telemetry": load_yaml(telemetry_path),
    }


def main() -> int:
    configure_streams()
    parser = argparse.ArgumentParser(description="Run round tests for skill-generator.")
    parser.add_argument("round_file", help="Path to a round YAML file.")
    parser.add_argument("--output-dir", default=str(SKILL_DIR / "test-runs"), help="Directory for round outputs.")
    parser.add_argument("--force", action="store_true", help="Overwrite scaffold outputs if they already exist.")
    args = parser.parse_args()

    round_file = Path(args.round_file).resolve()
    round_data = load_yaml(round_file)
    round_meta = round_data.get("round", {})
    round_id = round_meta.get("id", round_file.stem)
    round_dir = Path(args.output_dir).resolve() / round_id
    output_root = Path(args.output_dir).resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    if args.force:
        reset_directory(round_dir, output_root)
    else:
        round_dir.mkdir(parents=True, exist_ok=True)
        if any(round_dir.iterdir()):
            print(f"[FAIL] stale_round_detected:{round_dir}")
            return 1

    score_inputs = round_data.get("score_inputs", [])
    score_input = None
    if score_inputs:
        score_input = (round_file.parent / score_inputs[0]).resolve()

    case_results = []
    for case in round_data.get("cases", []):
        if case.get("input_file"):
            case["input_file"] = str((round_file.parent / case["input_file"]).resolve())
        if case.get("score_input"):
            case["score_input"] = str((round_file.parent / case["score_input"]).resolve())
        case_results.append(run_case(case, round_dir, args.force, score_input))

    if round_data.get("trigger_eval"):
        trigger_output = round_dir / "trigger-report.yaml"
        trigger_cmd = [
            sys.executable,
            str(SCRIPT_DIR / "run_trigger_evals.py"),
            str((round_file.parent / round_data["trigger_eval"]["file"]).resolve()),
            "--skill-dir",
            str(SKILL_DIR),
            "--output",
            str(trigger_output),
        ]
        trigger_result = run_command(trigger_cmd)
        trigger_failures: list[str] = []
        if trigger_result.returncode != 0:
            trigger_failures.append("trigger_runner_failed")
        else:
            trigger_data = load_yaml(trigger_output)
            thresholds = round_data["trigger_eval"].get("thresholds", {})
            if trigger_data.get("precision", 0.0) < thresholds.get("precision", 0.0):
                trigger_failures.append("trigger_precision_below_threshold")
            if trigger_data.get("recall", 0.0) < thresholds.get("recall", 0.0):
                trigger_failures.append("trigger_recall_below_threshold")
        case_results.append(
            {
                "case_id": "trigger-eval",
                "passed": not trigger_failures,
                "failures": trigger_failures,
                "telemetry": {
                    "command_count": 1,
                    "total_wall_clock_ms": trigger_result.duration_ms,
                    "stdout_bytes": trigger_result.stdout_bytes,
                    "stderr_bytes": trigger_result.stderr_bytes,
                    "created_file_count": 1,
                    "created_total_bytes": trigger_output.stat().st_size if trigger_output.exists() else 0,
                },
                "command_log": [
                    {
                        "command": trigger_result.command,
                        "returncode": trigger_result.returncode,
                        "stdout": trigger_result.stdout,
                        "stderr": trigger_result.stderr,
                        "duration_ms": trigger_result.duration_ms,
                        "stdout_bytes": trigger_result.stdout_bytes,
                        "stderr_bytes": trigger_result.stderr_bytes,
                    }
                ],
            }
        )

    for skill_path in round_data.get("skill_validations", []):
        validate_cmd = [
            sys.executable,
            str(SCRIPT_DIR / "validate_skill_utf8.py"),
            str(resolve_validation_path(round_file.parent, skill_path)),
        ]
        validate_result = run_command(validate_cmd)
        case_results.append(
            {
                "case_id": f"validate:{skill_path}",
                "passed": validate_result.returncode == 0,
                "failures": [] if validate_result.returncode == 0 else [validate_result.stderr.strip() or validate_result.stdout.strip() or "validation_failed"],
                "telemetry": {
                    "command_count": 1,
                    "total_wall_clock_ms": validate_result.duration_ms,
                    "stdout_bytes": validate_result.stdout_bytes,
                    "stderr_bytes": validate_result.stderr_bytes,
                    "created_file_count": 0,
                    "created_total_bytes": 0,
                },
                "command_log": [
                    {
                        "command": validate_result.command,
                        "returncode": validate_result.returncode,
                        "stdout": validate_result.stdout,
                        "stderr": validate_result.stderr,
                        "duration_ms": validate_result.duration_ms,
                        "stdout_bytes": validate_result.stdout_bytes,
                        "stderr_bytes": validate_result.stderr_bytes,
                    }
                ],
            }
        )

    if round_data.get("openai_yaml_check"):
        check = round_data["openai_yaml_check"]
        command = [
            sys.executable,
            str(SCRIPT_DIR / "generate_openai_yaml_utf8.py"),
            str(SKILL_DIR),
        ]
        for item in check.get("interface", []):
            command.extend(["--interface", item])
        openai_result = run_command(command)
        openai_failures: list[str] = []
        if openai_result.returncode != 0:
            openai_failures.append("openai_yaml_generation_failed")
        else:
            try:
                load_yaml(SKILL_DIR / "agents" / "openai.yaml")
            except Exception as exc:  # noqa: BLE001
                openai_failures.append(f"openai_yaml_invalid:{exc}")
        case_results.append(
            {
                "case_id": "openai-yaml-check",
                "passed": not openai_failures,
                "failures": openai_failures,
                "telemetry": {
                    "command_count": 1,
                    "total_wall_clock_ms": openai_result.duration_ms,
                    "stdout_bytes": openai_result.stdout_bytes,
                    "stderr_bytes": openai_result.stderr_bytes,
                    "created_file_count": 1,
                    "created_total_bytes": (SKILL_DIR / "agents" / "openai.yaml").stat().st_size if (SKILL_DIR / "agents" / "openai.yaml").exists() else 0,
                },
                "command_log": [
                    {
                        "command": openai_result.command,
                        "returncode": openai_result.returncode,
                        "stdout": openai_result.stdout,
                        "stderr": openai_result.stderr,
                        "duration_ms": openai_result.duration_ms,
                        "stdout_bytes": openai_result.stdout_bytes,
                        "stderr_bytes": openai_result.stderr_bytes,
                    }
                ],
            }
        )

    telemetry_summary = summarize_round_telemetry(case_results)
    write_round_telemetry(round_dir, telemetry_summary)

    if round_data.get("telemetry_eval"):
        thresholds = round_data["telemetry_eval"].get("thresholds", {})
        telemetry_failures: list[str] = []
        if telemetry_summary.get("case_telemetry_count", 0) < thresholds.get("min_case_telemetry_count", 0):
            telemetry_failures.append("telemetry_case_count_below_threshold")
        if telemetry_summary.get("total_wall_clock_ms", 0) < thresholds.get("min_total_wall_clock_ms", 0):
            telemetry_failures.append("telemetry_wall_clock_below_threshold")
        if telemetry_summary.get("total_created_bytes", 0) < thresholds.get("min_total_created_bytes", 0):
            telemetry_failures.append("telemetry_created_bytes_below_threshold")
        case_results.append(
            {
                "case_id": "telemetry-eval",
                "passed": not telemetry_failures,
                "failures": telemetry_failures,
                "telemetry": telemetry_summary,
                "command_log": [],
            }
        )

    if round_data.get("previous_round_summary"):
        previous_summary = (round_file.parent / round_data["previous_round_summary"]).resolve()
        regression_failures: list[str] = []
        try:
            regression_path = write_regression_report(round_dir, previous_summary, case_results, telemetry_summary)
            regression_failures.extend(assert_semantic_file(round_dir, regression_path.name))
        except FileNotFoundError as exc:
            regression_failures.append(str(exc))
        case_results.append(
            {
                "case_id": "regression-report",
                "passed": not regression_failures,
                "failures": regression_failures,
                "command_log": [],
            }
        )

    if "round_level_expectations" in round_data:
        write_round_summary(round_dir, round_id, case_results, telemetry_summary)
        required_report = round_data["round_level_expectations"].get("required_report", [])
        required_snippets = round_data["round_level_expectations"].get("required_snippets", {})
        report_failures = assert_files(round_dir, required_report) + assert_snippets(round_dir, required_snippets)
        case_results.append(
            {
                "case_id": "round-level-report",
                "passed": not report_failures,
                "failures": report_failures,
                "command_log": [],
            }
        )

    summary = {
        "round_id": round_id,
        "passed": all(item["passed"] for item in case_results),
        "telemetry": telemetry_summary,
        "results": case_results,
    }
    summary_path = round_dir / "summary.yaml"
    summary_path.write_text(yaml.safe_dump(summary, allow_unicode=True, sort_keys=False), encoding="utf-8")

    print(summary_path)
    if summary["passed"]:
        return 0
    for item in case_results:
        if item["passed"]:
            continue
        print(f"[FAIL] {item['case_id']}: {item['failures']}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
