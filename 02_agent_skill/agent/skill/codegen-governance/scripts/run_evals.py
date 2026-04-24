#!/usr/bin/env python3
"""
Unified evaluation runner for codegen-governance.

Runs all eval suites and metadata checks, producing a consolidated report.
This is the entry point for both manual testing and CI pipelines.

Usage:
    python scripts/run_evals.py              # Run all evals
    python scripts/run_evals.py --ci        # CI mode: strict, stop on first failure
    python scripts/run_evals.py --verbose   # Verbose output
    python scripts/run_evals.py --json      # JSON output for machine consumption
    python scripts/run_evals.py --check-missing  # Check anchor completeness only

Eval stages:
    1. Metadata validation    (validate_metadata.py)
    2. Trigger evaluation     (eval_trigger_and_scenario.py --trigger)
    3. Scenario eval          (eval_trigger_and_scenario.py --scenarios)
    4. Task structure eval    (eval_trigger_and_scenario.py --tasks)
    5. Validation plan eval   (eval_validation_plan.py)
    6. Contract quality       (eval_contract_output.py --check-missing)
    7. Check-skill fixtures   (skills/audit/scripts/run_evals.py)

Exit codes:
    0  — all stages passed
    1  — one or more stages failed
    2  — usage error
    3  — dependency error (required file missing)
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT / "scripts"


if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


# ---------------------------------------------------------------------------
# Stage definitions
# ---------------------------------------------------------------------------

@dataclass
class StageResult:
    name: str
    description: str
    passed: bool = False
    exit_code: int = -1
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    details: dict = field(default_factory=dict)
    error: Optional[str] = None

    @property
    def status(self) -> str:
        if self.error:
            return f"ERROR: {self.error}"
        return "PASSED" if self.passed else "FAILED"


def run_stage(
    name: str,
    description: str,
    script: Path,
    args: list[str],
    env: Optional[dict] = None,
) -> StageResult:
    """Run a single eval stage and capture results."""
    import time

    result = StageResult(name=name, description=description)
    start = time.time()

    try:
        cmd = [sys.executable, str(script)] + args
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=str(ROOT),
            env=env or None,
        )
        result.exit_code = proc.returncode
        result.stdout = proc.stdout or ""
        result.stderr = proc.stderr or ""
        result.passed = proc.returncode == 0
    except FileNotFoundError as exc:
        result.error = f"Script not found: {exc}"
        result.exit_code = 3
    except Exception as exc:  # pragma: no cover — defensive
        result.error = str(exc)
        result.exit_code = 3
    finally:
        result.duration_ms = int((time.time() - start) * 1000)

    return result


def parse_trigger_output(stdout: str) -> dict:
    """Parse trigger eval stdout to extract pass/fail counts."""
    total = passed = 0
    for line in stdout.splitlines():
        if "correct" in line and "/" in line:
            parts = line.split()
            for i, p in enumerate(parts):
                if p == "correct" and i > 0:
                    ratio = parts[i - 1]
                    if "/" in ratio:
                        passed_str, total_str = ratio.split("/")
                        try:
                            passed = int(passed_str)
                            total = int(total_str)
                        except ValueError:
                            pass
    return {"total": total, "passed": passed}


def parse_scenario_output(stdout: str) -> dict:
    """Parse scenario eval stdout to extract pass/fail counts and avg score."""
    total = passed = 0
    avg_score = 0.0
    for line in stdout.splitlines():
        if "correct" in line and "/" in line:
            parts = line.split()
            for i, p in enumerate(parts):
                if p == "correct" and i > 0:
                    ratio = parts[i - 1]
                    if "/" in ratio:
                        passed_str, total_str = ratio.split("/")
                        try:
                            passed = int(passed_str)
                            total = int(total_str)
                        except ValueError:
                            pass
        if "Avg score:" in line:
            parts = line.split()
            for i, p in enumerate(parts):
                if p == "score:" and i + 1 < len(parts):
                    try:
                        avg_score = float(parts[i + 1])
                    except ValueError:
                        pass
    return {"total": total, "passed": passed, "avg_score": avg_score}


def parse_metadata_output(stdout: str, stderr: str) -> dict:
    """Parse metadata validation output."""
    combined = stdout + stderr
    passed = "passed" in combined.lower()
    return {"passed": passed}


def parse_contract_check_output(stdout: str) -> dict:
    """Parse contract anchor check output."""
    total = 0
    anchors: list[str] = []
    for line in stdout.splitlines():
        if line.startswith("  ##-"):
            total += 1
            anchors.append(line.strip())
    return {"total_anchors": total, "anchors": anchors}


# ---------------------------------------------------------------------------
# CI mode helper
# ---------------------------------------------------------------------------

def run_ci_mode(stages: list[StageResult]) -> None:
    """Run in CI mode: strict checks, report first failure."""
    print("\n" + "=" * 70)
    print("CI MODE: Strict validation")
    print("=" * 70 + "\n")

    for result in stages:
        icon = "PASS" if result.passed else "FAIL"
        print(f"[{icon}] Stage {stages.index(result) + 1}: {result.name}")
        print(f"       {result.description}")

        if result.error:
            print(f"       !! {result.error}")

        if not result.passed and result.stderr:
            # Show last 10 lines of stderr
            stderr_lines = result.stderr.strip().splitlines()
            if stderr_lines:
                print("       stderr (last 10 lines):")
                for line in stderr_lines[-10:]:
                    print(f"         {line}")

        if result.stdout and "-v" in sys.argv:
            stdout_lines = result.stdout.strip().splitlines()
            if stdout_lines:
                print("       stdout:")
                for line in stdout_lines[-10:]:
                    print(f"         {line}")

        print()

        if not result.passed:
            first_failure = result
            print("=" * 70)
            print(f"CI FAILED at stage: {first_failure.name}")
            print(f"Exit code: {first_failure.exit_code}")
            if first_failure.error:
                print(f"Error: {first_failure.error}")
            print("=" * 70)
            print("\nTo debug, run with --verbose for full output.")
            print("Run individual stages:")
            for s in stages:
                print(f"  python {SCRIPTS_DIR}/{s.name.lower().replace(' ', '_')}.py")
            sys.exit(1)


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--ci", action="store_true",
        help="CI mode: strict, stop on first failure, compact output")
    parser.add_argument("--verbose", "-v", action="store_true",
        help="Verbose output")
    parser.add_argument("--json", action="store_true",
        help="Output results as JSON")
    parser.add_argument("--check-missing", action="store_true",
        help="Only check anchor completeness (skip model output evals)")
    parser.add_argument("--metadata-only", action="store_true",
        help="Only run metadata validation")
    parser.add_argument("--skip-metadata", action="store_true",
        help="Skip metadata validation (for faster iteration)")
    parser.add_argument("--output", "-o", metavar="FILE",
        help="Write JSON results to file")

    args = parser.parse_args()

    print("=" * 70)
    print(f"codegen-governance eval runner")
    print(f"Started: {datetime.now(timezone.utc).isoformat()}")
    print(f"Working directory: {ROOT}")
    print("=" * 70)

    stages: list[StageResult] = []

    # Stage 1: Metadata validation
    if not args.skip_metadata:
        stage = run_stage(
            name="Metadata Validation",
            description="skill.yaml, SKILL.md frontmatter, eval_suite, template anchors",
            script=SCRIPTS_DIR / "validate_metadata.py",
            args=["--verbose"] if args.verbose else [],
        )
        stage.details = parse_metadata_output(stage.stdout, stage.stderr)
        stages.append(stage)

    # Stage 2: Trigger evaluation
    if not args.check_missing:
        trigger_path = ROOT / "evals" / "trigger.json"
        if trigger_path.exists():
            stage = run_stage(
                name="Trigger Evaluation",
                description="Should trigger / should not trigger classification",
                script=SCRIPTS_DIR / "eval_trigger_and_scenario.py",
                args=["--trigger", str(trigger_path)],
            )
            stage.details = parse_trigger_output(stage.stdout)
            stages.append(stage)

        # Stage 3: Scenario selection evaluation
        scenario_path = ROOT / "evals" / "scenario-selection-cases.json"
        if scenario_path.exists():
            stage = run_stage(
                name="Scenario Selection",
                description="Pack A/B/C/D selection correctness",
                script=SCRIPTS_DIR / "eval_trigger_and_scenario.py",
                args=["--scenarios", str(scenario_path)],
            )
            stage.details = parse_scenario_output(stage.stdout)
            stages.append(stage)

        # Stage 4: Task structure evaluation
        tasks_path = ROOT / "evals" / "tasks.json"
        if tasks_path.exists():
            stage = run_stage(
                name="Task Structure",
                description="Task eval cases structure validation",
                script=SCRIPTS_DIR / "eval_trigger_and_scenario.py",
                args=["--tasks", str(tasks_path)],
            )
            stages.append(stage)

    # Stage 5: validation-plan inference evaluation
    validation_plan_path = ROOT / "evals" / "validation-plan-cases.json"
    if validation_plan_path.exists():
        stage = run_stage(
            name="Validation Plan Inference",
            description="Repo-aware validation command inference cases",
            script=SCRIPTS_DIR / "eval_validation_plan.py",
            args=["--suite", str(validation_plan_path)],
        )
        stages.append(stage)

    # Stage 6: Contract anchor completeness check
    stage = run_stage(
        name="Contract Anchor Check",
        description="Pre-Generation Contract MUST anchor completeness",
        script=SCRIPTS_DIR / "eval_contract_output.py",
        args=["--check-missing"],
    )
    stage.details = parse_contract_check_output(stage.stdout)
    stages.append(stage)

    # Stage 7: audit fixture evaluation
    check_skill_runner = ROOT / "skills" / "audit" / "scripts" / "run_evals.py"
    if check_skill_runner.exists():
        stage = run_stage(
            name="Check Skill Fixtures",
            description="audit positive and negative report fixtures",
            script=check_skill_runner,
            args=[],
        )
        stages.append(stage)

    # Run CI mode summary if requested (collects all results first)
    if args.ci:
        run_ci_mode(stages)
        total_passed = sum(1 for s in stages if s.passed)
        total_stages = len(stages)
        all_passed = total_passed == total_stages
        return 0 if all_passed else 1

    # Compute overall results
    total_passed = sum(1 for s in stages if s.passed)
    total_stages = len(stages)
    all_passed = total_passed == total_stages

    # Report results
    if args.json:
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "repo": str(ROOT),
            "total_stages": total_stages,
            "passed_stages": total_passed,
            "all_passed": all_passed,
            "exit_code": 0 if all_passed else 1,
            "stages": [
                {
                    "name": s.name,
                    "description": s.description,
                    "passed": s.passed,
                    "exit_code": s.exit_code,
                    "duration_ms": s.duration_ms,
                    "error": s.error,
                    "details": s.details,
                }
                for s in stages
            ],
        }
        output = json.dumps(report, indent=2)
        if args.output:
            Path(args.output).write_text(output, encoding="utf-8")
            print(f"\nJSON report written to: {args.output}")
        else:
            print(output)
    else:
        print("\n" + "=" * 70)
        print("EVALUATION SUMMARY")
        print("=" * 70)
        for i, result in enumerate(stages, start=1):
            icon = "PASS" if result.passed else "FAIL"
            print(f"[{icon}] {i}. {result.name}")
            print(f"     {result.description}")
            print(f"     Duration: {result.duration_ms}ms")
            if result.error:
                print(f"     ERROR: {result.error}")
            if args.verbose and result.stdout:
                for line in result.stdout.strip().splitlines()[:5]:
                    print(f"     > {line}")
            if args.verbose and result.stderr:
                for line in result.stderr.strip().splitlines()[:3]:
                    print(f"     ! {line}")
            print()

        print("=" * 70)
        print(f"Overall: {total_passed}/{total_stages} stages passed")
        print(f"Result: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
        print("=" * 70)

        if all_passed:
            print("\nAll eval stages passed. Skill is in good health.")
        else:
            print("\nSome eval stages failed. Run with --verbose for details.")
            if not args.ci:
                print("\nTo run in CI mode (stop on first failure):")
                print("  python scripts/run_evals.py --ci")
            print("\nTo run individual stages:")
            print(f"  python {SCRIPTS_DIR / 'validate_metadata.py'}")
            print(f"  python {SCRIPTS_DIR / 'eval_trigger_and_scenario.py'} --all")
            print(f"  python {SCRIPTS_DIR / 'eval_contract_output.py'} --check-missing")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())

