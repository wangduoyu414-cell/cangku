#!/usr/bin/env python3
"""Validate saved YAML outputs against plan-code-file-layout cases."""

from __future__ import annotations

import argparse
import io
import json
import sys
from dataclasses import asdict
from pathlib import Path


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


def validate_single(case_id: str, text: str, label: str) -> run_eval.TestResult:
    case = run_eval.get_case(case_id)
    if case is None:
        return run_eval.TestResult(name=f"{label}({case_id})", passed=False, details=["unknown case id"])
    return run_eval.validate_output_text(case, text, label)


def load_case_ids_from_manifest(manifest_path: Path) -> list[str]:
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    return [str(case["id"]) for case in payload.get("cases", [])]


def resolve_manifest_path(directory: Path, explicit_manifest: str | None) -> Path | None:
    if explicit_manifest:
        path = Path(explicit_manifest)
        return path if path.exists() else None

    candidates = [
        directory / "manifest.json",
        directory.parent / "manifest.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def validate_directory(directory: Path, require_all: bool, manifest: str | None) -> list[run_eval.TestResult]:
    _, cases = run_eval.load_cases()
    results: list[run_eval.TestResult] = []

    known_cases = {str(case["id"]): case for case in cases}
    seen_case_ids: set[str] = set()

    for path in sorted(directory.iterdir()):
        if not path.is_file() or path.suffix.lower() not in {".yaml", ".yml", ".txt"}:
            continue

        case_id = path.stem
        seen_case_ids.add(case_id)
        if case_id not in known_cases:
            results.append(
                run_eval.TestResult(
                    name=f"saved({case_id})",
                    passed=False,
                    details=[f"no matching case for file {path.name}"],
                )
            )
            continue

        text = path.read_text(encoding="utf-8")
        results.append(run_eval.validate_output_text(known_cases[case_id], text, "saved"))

    if require_all:
        manifest_path = resolve_manifest_path(directory, manifest)
        expected_case_ids = (
            load_case_ids_from_manifest(manifest_path)
            if manifest_path is not None
            else [str(case["id"]) for case in cases]
        )
        for case_id in expected_case_ids:
            if case_id not in seen_case_ids:
                results.append(
                    run_eval.TestResult(
                        name=f"saved({case_id})",
                        passed=False,
                        details=[f"missing file for case {case_id} in {directory}"],
                    )
                )

    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate saved plan-code-file-layout outputs.")
    parser.add_argument("--case", help="Case id for single-file or stdin validation.")
    parser.add_argument("--output", help="Path to a saved YAML output. If omitted, reads stdin.")
    parser.add_argument("--dir", help="Validate all *.yaml/*.yml/*.txt files in a directory by case id.")
    parser.add_argument("--require-all", action="store_true", help="In --dir mode, fail if any known case is missing.")
    parser.add_argument("--manifest", help="Optional manifest.json path used to scope --require-all in directory mode.")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")
    args = parser.parse_args()

    if args.dir:
        results = validate_directory(Path(args.dir), args.require_all, args.manifest)
    else:
        if not args.case:
            print("Single-output validation requires --case.", file=sys.stderr)
            return 1
        text = Path(args.output).read_text(encoding="utf-8") if args.output else sys.stdin.read()
        results = [validate_single(args.case, text, "saved")]

    if args.json:
        print(json.dumps([asdict(result) for result in results], ensure_ascii=False, indent=2))
    else:
        print("=" * 60)
        print("plan-code-file-layout saved-output validation")
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
