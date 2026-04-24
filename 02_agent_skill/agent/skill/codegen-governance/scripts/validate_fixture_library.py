#!/usr/bin/env python3
"""
Validate sample-library fixture governance consistency.

This script checks that runnable fixtures in the fixture library stay in sync
with the library README, coverage matrix, and regression entrypoints.

Fixture root resolution order:
1. `--fixtures-root`
2. `CODEGEN_GOVERNANCE_FIXTURES_ROOT`
3. `CODEGEN_EXECUTION_CONSTRAINT_FIXTURES_ROOT` (legacy compatibility)
4. known repo-relative fixture locations
5. legacy external fixture path

Usage:
    python scripts/validate_fixture_library.py
    python scripts/validate_fixture_library.py --fixtures-root D:\\path\\to\\fixtures
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE_ROOT_ENV = "CODEGEN_GOVERNANCE_FIXTURES_ROOT"
LEGACY_FIXTURE_ROOT_ENV = "CODEGEN_EXECUTION_CONSTRAINT_FIXTURES_ROOT"
LEGACY_FIXTURES_ROOT = Path(r"D:\yongyongmoban\examples\skills\codegen-execution-constraint")
DEFAULT_FIXTURE_CANDIDATES = (
    ROOT / "fixtures" / "codegen-governance",
    ROOT / "fixtures" / "codegen-execution-constraint",
    ROOT / "fixtures",
    ROOT / "examples" / "skills" / "codegen-governance",
    ROOT / "examples" / "skills" / "codegen-execution-constraint",
    ROOT.parent / "examples" / "skills" / "codegen-governance",
    ROOT.parent / "examples" / "skills" / "codegen-execution-constraint",
    LEGACY_FIXTURES_ROOT,
)
IGNORED_FIXTURE_DIRS = {"go-settlement-http-response"}
REQUIRED_SHARED_FILES = (
    "README.md",
    "TASK.md",
    "expected-contract.md",
    "expected-report.md",
    "sample-trigger.json",
    "sample-scenario-selection.json",
)


@dataclass(frozen=True)
class FixtureInfo:
    name: str
    path: Path


def resolve_fixtures_root(explicit_root: str | None) -> tuple[Path | None, list[Path], str | None]:
    attempted: list[Path] = []

    if explicit_root:
        path = Path(explicit_root).expanduser().resolve()
        attempted.append(path)
        return (path if path.exists() else None), attempted, "--fixtures-root"

    env_value = os.environ.get(FIXTURE_ROOT_ENV)
    if env_value:
        path = Path(env_value).expanduser().resolve()
        attempted.append(path)
        return (path if path.exists() else None), attempted, FIXTURE_ROOT_ENV

    legacy_env_value = os.environ.get(LEGACY_FIXTURE_ROOT_ENV)
    if legacy_env_value:
        path = Path(legacy_env_value).expanduser().resolve()
        attempted.append(path)
        return (path if path.exists() else None), attempted, LEGACY_FIXTURE_ROOT_ENV

    for candidate in DEFAULT_FIXTURE_CANDIDATES:
        candidate = candidate.resolve()
        attempted.append(candidate)
        if candidate.exists():
            return candidate, attempted, None

    return None, attempted, None


def discover_fixtures(fixtures_root: Path) -> list[FixtureInfo]:
    fixtures: list[FixtureInfo] = []
    for child in sorted(fixtures_root.iterdir()):
        if not child.is_dir():
            continue
        if child.name in IGNORED_FIXTURE_DIRS:
            continue
        fixtures.append(FixtureInfo(name=child.name, path=child))
    return fixtures


def has_source_file(fixture: FixtureInfo) -> bool:
    src_dir = fixture.path / "src"
    if not src_dir.exists():
        return False
    return any(path.is_file() for path in src_dir.rglob("*") if path.suffix in {".py", ".go", ".js", ".ts", ".vue"})


def has_test_file(fixture: FixtureInfo) -> bool:
    patterns = (
        "tests/**/*.py",
        "tests/**/*.js",
        "tests/**/*.ts",
        "src/**/*_test.go",
    )
    for pattern in patterns:
        if any(path.is_file() for path in fixture.path.glob(pattern)):
            return True
    return False


def parse_json(path: Path, issues: list[str]) -> None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        issues.append(f"{path}: JSON parse failed: {exc}")
        return
    if not isinstance(data, dict):
        issues.append(f"{path}: JSON root must be an object")


def collect_fixture_names_from_backticks(text: str) -> set[str]:
    return set(re.findall(r"`([A-Za-z0-9._-]+)`", text))


def collect_fixture_names_from_runner(text: str) -> set[str]:
    return set(
        match
        for match in re.findall(r'"([A-Za-z0-9._-]+)"', text)
        if any(ch == "-" for ch in match)
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixtures-root", help="Optional fixture root override")
    parser.add_argument("--print-root", action="store_true", help="Print the resolved fixture root and exit")
    args = parser.parse_args()

    fixtures_root, attempted, source = resolve_fixtures_root(args.fixtures_root)
    issues: list[str] = []

    if fixtures_root is None:
        print("Fixture root not found.", file=sys.stderr)
        if source == FIXTURE_ROOT_ENV:
            print(f"Checked environment override {FIXTURE_ROOT_ENV!r} first.", file=sys.stderr)
        elif source == LEGACY_FIXTURE_ROOT_ENV:
            print(f"Checked legacy environment override {LEGACY_FIXTURE_ROOT_ENV!r} first.", file=sys.stderr)
        elif source == "--fixtures-root":
            print("Checked the explicit --fixtures-root override first.", file=sys.stderr)
        else:
            print(
                f"No fixture root override was provided. Set {FIXTURE_ROOT_ENV}, "
                f"set legacy {LEGACY_FIXTURE_ROOT_ENV}, or use --fixtures-root.",
                file=sys.stderr,
            )
        print("Attempted locations:", file=sys.stderr)
        for path in attempted:
            print(f"- {path}", file=sys.stderr)
        return 2

    if args.print_root:
        print(fixtures_root)
        return 0

    fixtures = discover_fixtures(fixtures_root)
    fixture_names = {fixture.name for fixture in fixtures}

    for fixture in fixtures:
        for rel_path in REQUIRED_SHARED_FILES:
            target = fixture.path / rel_path
            if not target.exists():
                issues.append(f"{fixture.name}: missing required file {rel_path}")
        if not has_source_file(fixture):
            issues.append(f"{fixture.name}: missing source file under src/")
        if not has_test_file(fixture):
            issues.append(f"{fixture.name}: missing executable test file")
        for json_name in ("sample-trigger.json", "sample-scenario-selection.json"):
            json_path = fixture.path / json_name
            if json_path.exists():
                parse_json(json_path, issues)

    readme_path = fixtures_root / "README.md"
    coverage_path = fixtures_root / "COVERAGE-MATRIX.md"
    runner_path = fixtures_root / "run-all-fixture-tests.ps1"

    if not readme_path.exists():
        issues.append("fixture-library README.md missing")
        readme_names: set[str] = set()
    else:
        readme_names = collect_fixture_names_from_backticks(readme_path.read_text(encoding="utf-8"))

    if not coverage_path.exists():
        issues.append("fixture-library COVERAGE-MATRIX.md missing")
        coverage_names: set[str] = set()
    else:
        coverage_names = collect_fixture_names_from_backticks(coverage_path.read_text(encoding="utf-8"))

    if not runner_path.exists():
        issues.append("fixture-library run-all-fixture-tests.ps1 missing")
        runner_names: set[str] = set()
    else:
        runner_names = collect_fixture_names_from_runner(runner_path.read_text(encoding="utf-8"))

    missing_from_readme = sorted(fixture_names - readme_names)
    if missing_from_readme:
        issues.append("README.md missing fixtures: " + ", ".join(missing_from_readme))

    missing_from_coverage = sorted(fixture_names - coverage_names)
    if missing_from_coverage:
        issues.append("COVERAGE-MATRIX.md missing fixtures: " + ", ".join(missing_from_coverage))

    missing_from_runner = sorted(fixture_names - runner_names)
    if missing_from_runner:
        issues.append("run-all-fixture-tests.ps1 missing fixtures: " + ", ".join(missing_from_runner))

    if issues:
        print("Fixture library governance FAILED:")
        print(f"Fixture root: {fixtures_root}")
        for issue in issues:
            print(f"- {issue}")
        print(f"\nTotal issues: {len(issues)}")
        return 1

    print("Fixture library governance passed.")
    print(f"Fixture root: {fixtures_root}")
    if source == FIXTURE_ROOT_ENV:
        print(f"Source: environment variable {FIXTURE_ROOT_ENV}")
    elif source == LEGACY_FIXTURE_ROOT_ENV:
        print(f"Source: legacy environment variable {LEGACY_FIXTURE_ROOT_ENV}")
    elif source == "--fixtures-root":
        print("Source: explicit --fixtures-root override")
    else:
        print("Source: auto-discovered default candidate")
    print(f"Fixtures checked: {len(fixtures)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
