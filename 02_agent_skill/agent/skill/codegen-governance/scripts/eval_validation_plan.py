#!/usr/bin/env python3
"""
Evaluate repo-aware validation-plan inference against fixture cases.

This script materializes small temporary repositories, runs
suggest_validation_plan.py against each case, and checks that the inferred
signals and commands match expectations.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SUGGEST_SCRIPT = ROOT / "scripts" / "suggest_validation_plan.py"
DEFAULT_SUITE = ROOT / "evals" / "validation-plan-cases.json"


@dataclass
class CaseResult:
    case_id: str
    passed: bool
    messages: list[str]


def materialize_case(case_root: Path, files: dict[str, str]) -> None:
    for rel_path, content in files.items():
        path = case_root / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")


def run_case(case: dict) -> CaseResult:
    case_id = case.get("id", "unknown")
    with tempfile.TemporaryDirectory(prefix=f"cec-{case_id}-") as temp_dir:
        case_root = Path(temp_dir)
        materialize_case(case_root, case.get("files", {}))

        target = case_root / case["target"]
        cmd = [
            sys.executable,
            str(SUGGEST_SCRIPT),
            "--target",
            str(target),
            "--language",
            case["language"],
            "--json",
        ]
        proc = subprocess.run(
            cmd,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if proc.returncode != 0:
            return CaseResult(
                case_id=case_id,
                passed=False,
                messages=[f"suggest_validation_plan.py exited with {proc.returncode}: {proc.stderr.strip()}"],
            )

        try:
            payload = json.loads(proc.stdout)
        except Exception as exc:
            return CaseResult(
                case_id=case_id,
                passed=False,
                messages=[f"failed to parse JSON output: {exc}", proc.stdout.strip()],
            )

        signals = set(payload.get("signals", []))
        commands = {item["command"] for item in payload.get("executable", [])}
        cannot_infer = set(payload.get("cannot_infer", []))
        messages: list[str] = []

        for signal in case.get("expected_signals", []):
            if signal not in signals:
                messages.append(f"missing expected signal: {signal}")

        for command in case.get("expected_commands", []):
            if command not in commands:
                messages.append(f"missing expected command: {command}")

        for command in case.get("unexpected_commands", []):
            if command in commands:
                messages.append(f"unexpected command present: {command}")

        for item in case.get("expected_cannot_infer", []):
            if item not in cannot_infer:
                messages.append(f"missing expected cannot_infer item: {item}")

        return CaseResult(case_id=case_id, passed=not messages, messages=messages)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--suite", default=str(DEFAULT_SUITE), help="Path to validation-plan case JSON")
    args = parser.parse_args()

    suite_path = Path(args.suite)
    if not suite_path.exists():
        print(f"Suite file not found: {suite_path}", file=sys.stderr)
        return 2

    suite = json.loads(suite_path.read_text(encoding="utf-8"))
    results = [run_case(case) for case in suite.get("cases", [])]

    if not results:
        print("No validation-plan cases found.")
        return 0

    passed = sum(1 for result in results if result.passed)
    total = len(results)

    print(f"\n{'=' * 70}")
    print(f"Suite: {suite_path}")
    print(f"Results: {passed}/{total} passed")
    print(f"{'=' * 70}")
    for result in results:
        status = "PASS" if result.passed else "FAIL"
        print(f"  [{status}] {result.case_id}")
        for message in result.messages:
            print(f"     - {message}")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
