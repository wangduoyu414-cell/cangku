#!/usr/bin/env python3
"""
Suggest repo-aware validation commands for a target file or module.

This helper keeps Validation Plan entries anchored to the local repository's
actual tooling instead of falling back to generic, non-runnable advice.

Usage:
    python scripts/suggest_validation_plan.py --target path/to/file.py
    python scripts/suggest_validation_plan.py --target src/foo.ts --language typescript
    python scripts/suggest_validation_plan.py --target src/bar.go --repo-root . --json
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
import sys
import tomllib
from typing import Any, Optional


REPO_MARKERS = (
    "go.mod",
    "package.json",
    "pyproject.toml",
    "pytest.ini",
    "ruff.toml",
    ".ruff.toml",
    "mypy.ini",
    ".mypy.ini",
    "poetry.lock",
    "uv.lock",
    "tox.ini",
    "noxfile.py",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
)

PYTHON_TEST_DIRS = ("tests", "test")
PYTHON_TOOLING_MARKERS = (
    "pyproject.toml",
    "pytest.ini",
    "ruff.toml",
    ".ruff.toml",
    "mypy.ini",
    ".mypy.ini",
    "tox.ini",
    "noxfile.py",
    "poetry.lock",
    "uv.lock",
)
JS_CHECK_SCRIPTS = ("check", "lint", "typecheck", "test:unit", "test:e2e", "e2e")
ESLINT_CONFIGS = (
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.cjs",
    ".eslintrc.json",
    ".eslintrc.yaml",
    ".eslintrc.yml",
    "eslint.config.js",
    "eslint.config.cjs",
    "eslint.config.mjs",
    "eslint.config.ts",
)
VITEST_CONFIGS = (
    "vitest.config.ts",
    "vitest.config.js",
    "vitest.config.mts",
    "vitest.config.cjs",
)
PLAYWRIGHT_CONFIGS = (
    "playwright.config.ts",
    "playwright.config.js",
    "playwright.config.mjs",
    "playwright.config.cjs",
)
GOLANGCI_CONFIGS = (
    ".golangci.yml",
    ".golangci.yaml",
    ".golangci.toml",
    ".golangci.json",
)
STATICCHECK_CONFIGS = ("staticcheck.conf",)


@dataclass
class SuggestedCommand:
    command: str
    rationale: str


@dataclass
class ValidationPlanSuggestion:
    repo_root: str
    target: str
    language: str
    signals: list[str] = field(default_factory=list)
    executable: list[SuggestedCommand] = field(default_factory=list)
    cannot_infer: list[str] = field(default_factory=list)


def normalize_language(value: str) -> str:
    lowered = value.lower()
    aliases = {
        "py": "python",
        "ts": "typescript",
        "js": "javascript",
    }
    return aliases.get(lowered, lowered)


def infer_language(target: Path, explicit: Optional[str]) -> str:
    if explicit:
        return normalize_language(explicit)

    suffix = target.suffix.lower()
    if suffix == ".py":
        return "python"
    if suffix == ".go":
        return "go"
    if suffix in {".ts", ".tsx"}:
        return "typescript"
    if suffix in {".js", ".jsx", ".mjs", ".cjs"}:
        return "javascript"
    if suffix == ".vue":
        return "vue"
    return "unknown"


def detect_repo_root(target: Path, explicit_root: Optional[Path]) -> Path:
    if explicit_root:
        return explicit_root.resolve()

    start = target.resolve()
    if start.is_file():
        start = start.parent

    for candidate in (start, *start.parents):
        if any((candidate / marker).exists() for marker in REPO_MARKERS):
            return candidate
    return start


def load_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def load_toml(path: Path) -> dict[str, Any]:
    try:
        with path.open("rb") as f:
            data = tomllib.load(f)
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def first_existing(paths: list[Path]) -> Optional[Path]:
    for path in paths:
        if path.exists():
            return path
    return None


def relative_to_root(path: Path, root: Path) -> str:
    try:
        return str(path.resolve().relative_to(root.resolve()))
    except ValueError:
        return str(path.resolve())


def add_command(plan: ValidationPlanSuggestion, command: str, rationale: str) -> None:
    if any(item.command == command for item in plan.executable):
        return
    plan.executable.append(SuggestedCommand(command=command, rationale=rationale))


def detect_python_tooling(repo_root: Path) -> dict[str, Any]:
    pyproject_path = repo_root / "pyproject.toml"
    pyproject = load_toml(pyproject_path) if pyproject_path.exists() else {}
    tool = pyproject.get("tool", {}) if isinstance(pyproject.get("tool", {}), dict) else {}

    if (repo_root / "uv.lock").exists() or "uv" in tool:
        runner_prefix = "uv run "
        runner_name = "uv"
    elif (repo_root / "poetry.lock").exists() or "poetry" in tool:
        runner_prefix = "poetry run "
        runner_name = "poetry"
    else:
        runner_prefix = ""
        runner_name = ""

    uses_pytest = (repo_root / "pytest.ini").exists() or "pytest" in tool
    has_ruff = any((repo_root / name).exists() for name in ("ruff.toml", ".ruff.toml")) or "ruff" in tool
    has_mypy = any((repo_root / name).exists() for name in ("mypy.ini", ".mypy.ini")) or "mypy" in tool
    has_tox = (repo_root / "tox.ini").exists()
    has_nox = (repo_root / "noxfile.py").exists()

    return {
        "runner_prefix": runner_prefix,
        "runner_name": runner_name,
        "uses_pytest": uses_pytest,
        "has_ruff": has_ruff,
        "has_mypy": has_mypy,
        "has_tox": has_tox,
        "has_nox": has_nox,
        "pyproject": pyproject,
    }


def python_command(prefix: str, base: str) -> str:
    return f"{prefix}{base}".strip()


def suggest_python(target: Path, repo_root: Path, plan: ValidationPlanSuggestion) -> None:
    rel_target = relative_to_root(target, repo_root)
    tooling = detect_python_tooling(repo_root)
    prefix = tooling["runner_prefix"]

    plan.signals.append("python target detected")
    if tooling["runner_name"]:
        plan.signals.append(f"{tooling['runner_name']} environment detected")
    if any((repo_root / marker).exists() for marker in PYTHON_TOOLING_MARKERS):
        plan.signals.append("python repo tooling detected")

    add_command(
        plan,
        python_command(prefix, f"python -m py_compile {rel_target}"),
        "Syntax validation is always available for a concrete Python file.",
    )

    candidate_tests = [
        repo_root / "tests" / f"test_{target.stem}.py",
        repo_root / "tests" / f"{target.stem}_test.py",
        repo_root / "test" / f"test_{target.stem}.py",
    ]
    test_file = first_existing(candidate_tests)

    if tooling["uses_pytest"]:
        if test_file:
            add_command(
                plan,
                python_command(prefix, f"python -m pytest -q {relative_to_root(test_file, repo_root)}"),
                "A focused pytest-style test file exists for this target.",
            )
        elif any((repo_root / directory).exists() for directory in PYTHON_TEST_DIRS):
            add_command(
                plan,
                python_command(prefix, "python -m pytest -q"),
                "Repository pytest configuration or test directories suggest pytest is the primary test runner.",
            )
        else:
            plan.cannot_infer.append("Pytest appears configured, but no test directory or focused test file was found.")
    elif test_file:
        add_command(
            plan,
            python_command(
                prefix,
                f"python -m unittest discover -s {relative_to_root(test_file.parent, repo_root)} -p \"{test_file.name}\"",
            ),
            "A focused unittest-style test file exists for this target.",
        )
    elif any((repo_root / directory).exists() for directory in PYTHON_TEST_DIRS):
        add_command(
            plan,
            python_command(prefix, "python -m unittest discover"),
            "Repository test directories exist even though no focused test file was inferred safely.",
        )
    else:
        plan.cannot_infer.append("No Python test directory or focused test file was found.")

    if tooling["has_ruff"]:
        add_command(
            plan,
            python_command(prefix, f"ruff check {rel_target}"),
            "Repository configuration suggests Ruff is part of the local toolchain.",
        )
    else:
        plan.cannot_infer.append("Ruff configuration was not found in the local repository.")

    if tooling["has_mypy"]:
        add_command(
            plan,
            python_command(prefix, f"mypy {rel_target}"),
            "Repository configuration suggests mypy is available for typed Python targets.",
        )
    else:
        plan.cannot_infer.append("Mypy configuration was not found in the local repository.")

    if tooling["has_tox"]:
        add_command(
            plan,
            "tox -q",
            "The repository includes tox.ini, suggesting tox is a supported validation entrypoint.",
        )
    if tooling["has_nox"]:
        add_command(
            plan,
            "nox",
            "The repository includes noxfile.py, suggesting nox is a supported validation entrypoint.",
        )


def detect_go_tooling(module_root: Path) -> dict[str, bool]:
    has_tests = any(path.is_file() for path in module_root.rglob("*_test.go"))
    has_golangci = any((module_root / name).exists() for name in GOLANGCI_CONFIGS)
    has_staticcheck = any((module_root / name).exists() for name in STATICCHECK_CONFIGS)
    return {
        "has_tests": has_tests,
        "has_golangci": has_golangci,
        "has_staticcheck": has_staticcheck,
    }


def suggest_go(target: Path, repo_root: Path, plan: ValidationPlanSuggestion) -> None:
    plan.signals.append("go target detected")
    module_root = detect_repo_root(target, repo_root)
    if (module_root / "go.mod").exists():
        plan.signals.append("go.mod found")
    rel_module_root = relative_to_root(module_root, repo_root)
    prefix = "" if rel_module_root == "." else f"cd {rel_module_root} && "
    tooling = detect_go_tooling(module_root)
    if tooling["has_tests"]:
        plan.signals.append("go test files detected")

    add_command(
        plan,
        f"{prefix}go test ./... -v",
        "Go modules validate behavior best through package-level tests from the module root.",
    )
    add_command(
        plan,
        f"{prefix}go vet ./...",
        "Static vetting is standard for local Go implementation changes.",
    )
    add_command(
        plan,
        f"{prefix}go build ./...",
        "Build validation catches compile and wiring issues across the local module.",
    )

    if tooling["has_tests"]:
        add_command(
            plan,
            f"{prefix}go test -race ./...",
            "The module already has Go tests, so race-aware validation is a useful concurrency check.",
        )
    else:
        plan.cannot_infer.append("No Go test files were found, so race-aware validation was not suggested.")

    if tooling["has_golangci"]:
        add_command(
            plan,
            f"{prefix}golangci-lint run",
            "The repository includes a golangci-lint configuration file.",
        )
    else:
        plan.cannot_infer.append("golangci-lint configuration was not found in the local module.")

    if tooling["has_staticcheck"]:
        add_command(
            plan,
            f"{prefix}staticcheck ./...",
            "The repository includes staticcheck configuration.",
        )
    else:
        plan.cannot_infer.append("staticcheck configuration was not found in the local module.")


def load_package_metadata(package_json: Path) -> dict[str, Any]:
    data = load_json(package_json)
    scripts = data.get("scripts", {})
    dependencies = data.get("dependencies", {})
    dev_dependencies = data.get("devDependencies", {})
    package_manager = data.get("packageManager", "")
    return {
        "data": data,
        "scripts": scripts if isinstance(scripts, dict) else {},
        "dependencies": dependencies if isinstance(dependencies, dict) else {},
        "devDependencies": dev_dependencies if isinstance(dev_dependencies, dict) else {},
        "packageManager": package_manager if isinstance(package_manager, str) else "",
    }


def detect_package_manager(package_root: Path, metadata: dict[str, Any]) -> str:
    package_manager = metadata.get("packageManager", "")
    if package_manager.startswith("pnpm@"):
        return "pnpm"
    if package_manager.startswith("yarn@"):
        return "yarn"
    if package_manager.startswith("npm@"):
        return "npm"
    if (package_root / "pnpm-lock.yaml").exists():
        return "pnpm"
    if (package_root / "yarn.lock").exists():
        return "yarn"
    return "npm"


def merged_deps(metadata: dict[str, Any]) -> set[str]:
    deps = set(metadata.get("dependencies", {}).keys())
    deps.update(metadata.get("devDependencies", {}).keys())
    return deps


def script_command(package_manager: str, script_name: str) -> str:
    if package_manager == "npm":
        return "npm test" if script_name == "test" else f"npm run {script_name}"
    if package_manager == "pnpm":
        return f"pnpm {script_name}" if script_name == "test" else f"pnpm run {script_name}"
    return f"yarn {script_name}"


def exec_command(package_manager: str, binary: str, args: str = "") -> str:
    suffix = f" {args}".rstrip() if args else ""
    if package_manager == "npm":
        return f"npx {binary}{suffix}"
    if package_manager == "pnpm":
        return f"pnpm exec {binary}{suffix}"
    return f"yarn {binary}{suffix}"


def has_any_file(root: Path, names: tuple[str, ...]) -> bool:
    return any((root / name).exists() for name in names)


def suggest_node_like(target: Path, repo_root: Path, language: str, plan: ValidationPlanSuggestion) -> None:
    package_json = first_existing(
        [repo_root / "package.json", *[parent / "package.json" for parent in target.resolve().parents]]
    )
    rel_target = relative_to_root(target, repo_root)

    if not package_json:
        plan.cannot_infer.append("No package.json was found near the target.")
        if language == "javascript":
            add_command(
                plan,
                f"node --check {rel_target}",
                "JavaScript syntax validation is directly available for a concrete file.",
            )
        return

    package_root = package_json.parent
    rel_package_root = relative_to_root(package_root, repo_root)
    prefix = "" if rel_package_root == "." else f"cd {rel_package_root} && "
    metadata = load_package_metadata(package_json)
    scripts = metadata["scripts"]
    deps = merged_deps(metadata)
    package_manager = detect_package_manager(package_root, metadata)

    plan.signals.append(f"package.json found at {relative_to_root(package_root, repo_root)}")
    plan.signals.append(f"{package_manager} package manager inferred")

    if "test" in scripts:
        add_command(
            plan,
            f"{prefix}{script_command(package_manager, 'test')}",
            "The local package defines an explicit test script.",
        )
    else:
        plan.cannot_infer.append("No package test script was found in the nearest package.json.")

    for script_name in JS_CHECK_SCRIPTS:
        if script_name in scripts:
            add_command(
                plan,
                f"{prefix}{script_command(package_manager, script_name)}",
                f"The local package defines a '{script_name}' script.",
            )

    has_typescript = "typescript" in deps or (package_root / "tsconfig.json").exists()
    has_vue_tsc = "vue-tsc" in deps
    has_eslint = "eslint" in deps or has_any_file(package_root, ESLINT_CONFIGS)
    has_vitest = "vitest" in deps or has_any_file(package_root, VITEST_CONFIGS)
    has_playwright = "@playwright/test" in deps or has_any_file(package_root, PLAYWRIGHT_CONFIGS)

    if language in {"typescript", "vue"}:
        if "typecheck" not in scripts:
            if language == "vue" and has_vue_tsc:
                add_command(
                    plan,
                    f"{prefix}{exec_command(package_manager, 'vue-tsc', '--noEmit')}",
                    "The package exposes vue-tsc and no explicit typecheck script was found.",
                )
            elif has_typescript:
                add_command(
                    plan,
                    f"{prefix}{exec_command(package_manager, 'tsc', '--noEmit')}",
                    "TypeScript configuration exists even though no explicit typecheck script was found.",
                )

    if has_eslint and "lint" not in scripts:
        add_command(
            plan,
            f"{prefix}{exec_command(package_manager, 'eslint', rel_target)}",
            "ESLint appears configured even though no lint script was found.",
        )

    if has_vitest and "test" not in scripts and "test:unit" not in scripts:
        add_command(
            plan,
            f"{prefix}{exec_command(package_manager, 'vitest', 'run')}",
            "Vitest appears to be installed even though no explicit unit-test script was found.",
        )

    if has_playwright and "test:e2e" not in scripts and "e2e" not in scripts:
        add_command(
            plan,
            f"{prefix}{exec_command(package_manager, 'playwright', 'test')}",
            "Playwright appears configured even though no explicit e2e script was found.",
        )

    if language == "javascript":
        add_command(
            plan,
            f"node --check {rel_target}",
            "JavaScript syntax validation is directly available for a concrete file.",
        )


def build_suggestion(target: Path, repo_root: Path, language: str) -> ValidationPlanSuggestion:
    plan = ValidationPlanSuggestion(
        repo_root=str(repo_root.resolve()),
        target=str(target.resolve()),
        language=language,
    )

    if language == "python":
        suggest_python(target, repo_root, plan)
    elif language == "go":
        suggest_go(target, repo_root, plan)
    elif language in {"javascript", "typescript", "vue"}:
        suggest_node_like(target, repo_root, language, plan)
    else:
        plan.cannot_infer.append("Unsupported or unknown language; no repo-aware validation commands inferred.")

    return plan


def print_human(plan: ValidationPlanSuggestion) -> None:
    print(f"Repo root: {plan.repo_root}")
    print(f"Target: {plan.target}")
    print(f"Language: {plan.language}")
    if plan.signals:
        print("Signals:")
        for signal in plan.signals:
            print(f"- {signal}")
    if plan.executable:
        print("Executable:")
        for item in plan.executable:
            print(f"- command: {item.command}")
            print(f"  - rationale: {item.rationale}")
    if plan.cannot_infer:
        print("Cannot infer:")
        for item in plan.cannot_infer:
            print(f"- {item}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", required=True, help="Target file or directory")
    parser.add_argument("--repo-root", help="Optional repository root override")
    parser.add_argument("--language", help="Optional language override")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of human-readable output")
    args = parser.parse_args()

    target = Path(args.target)
    if not target.exists():
        print(f"Error: target not found: {target}", file=sys.stderr)
        return 2

    repo_root = detect_repo_root(target, Path(args.repo_root) if args.repo_root else None)
    language = infer_language(target, args.language)
    suggestion = build_suggestion(target, repo_root, language)

    if args.json:
        print(
            json.dumps(
                {
                    **asdict(suggestion),
                    "executable": [asdict(item) for item in suggestion.executable],
                },
                indent=2,
            )
        )
    else:
        print_human(suggestion)

    return 0


if __name__ == "__main__":
    sys.exit(main())
