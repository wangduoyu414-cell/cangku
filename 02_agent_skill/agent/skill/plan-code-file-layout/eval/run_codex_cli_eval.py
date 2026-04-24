#!/usr/bin/env python3
"""Run plan-code-file-layout evaluations through Codex CLI."""

from __future__ import annotations

import argparse
import io
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


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

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_eval  # noqa: E402
import run_live_eval  # noqa: E402


DEFAULT_OUTPUT_DIR = run_eval.ROOT / "eval" / "codex_cli_outputs"
SMOKE_CASES = [
    "python_endpoint_keep_small",
    "legacy_conflict",
    "ts_backend_endpoint_split_io",
    "python_cli_merge_pass_through",
    "react_feature_split_exact_file_anchor",
]
ANCHOR_SCOPE_CASES = [
    "legacy_conflict",
    "python_cli_merge_pass_through",
    "react_feature_merge_exact_file_anchor",
    "react_feature_split_exact_file_anchor",
]
CONFLICT_CASES = [
    "python_interfaces_http_relocate_doc_conflict",
    "python_http_rollout_note_over_long_term_target",
    "python_http_same_phase_granularity_merge_wrapper",
    "python_endpoint_keep_conflicting_siblings",
]


def build_codex_prompt(repo_root: Path, case: dict[str, Any]) -> str:
    skill_bundle = run_live_eval.render_skill_bundle(case)
    case_prompt = run_live_eval.build_case_prompt(repo_root, case)
    return (
        "You are executing a repository skill evaluation inside Codex CLI. "
        "Follow the skill workflow and references exactly, and return only YAML with no markdown fences.\n\n"
        f"{skill_bundle}\n\n{case_prompt}\n"
    )


def choose_cases(all_cases: list[dict[str, Any]], suite: str, case_id: str | None) -> list[dict[str, Any]]:
    if case_id:
        return [case for case in all_cases if str(case["id"]) == case_id]

    if suite == "smoke":
        return [case for case in all_cases if str(case["id"]) in SMOKE_CASES]
    if suite == "anchor-scope":
        return [case for case in all_cases if str(case["id"]) in ANCHOR_SCOPE_CASES]
    if suite == "conflict":
        return [case for case in all_cases if str(case["id"]) in CONFLICT_CASES]

    return list(all_cases)


def run_case(
    repo_root: Path,
    case: dict[str, Any],
    output_dir: Path,
    codex_bin: str,
    model: str | None,
    sandbox: str,
    reasoning_effort: str | None,
    eval_mode: str,
) -> run_eval.TestResult:
    case_id = str(case["id"])
    output_dir.mkdir(parents=True, exist_ok=True)

    prompt_text = build_codex_prompt(repo_root, case)
    prompt_path = output_dir / f"{case_id}.prompt.txt"
    response_path = output_dir / f"{case_id}.response.yaml"
    log_path = output_dir / f"{case_id}.codex.log"

    prompt_path.write_text(prompt_text, encoding="utf-8")

    command = [
        codex_bin,
        "exec",
        "--skip-git-repo-check",
        "--ephemeral",
        "--sandbox",
        sandbox,
        "--color",
        "never",
        "-C",
        str(repo_root),
        "-o",
        str(response_path),
    ]

    if model:
        command.extend(["-m", model])
    if reasoning_effort:
        command.extend(["-c", f'reasoning_effort="{reasoning_effort}"'])

    command.append("-")

    try:
        completed = subprocess.run(
            command,
            input=prompt_text,
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            timeout=900,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return run_eval.TestResult(
            name=f"codex_cli({case_id})",
            passed=False,
            details=[f"timeout while running Codex CLI for case {case_id}", f"prompt: {prompt_path}"],
        )

    log_path.write_text(
        f"COMMAND:\n{' '.join(command)}\n\nSTDOUT:\n{completed.stdout}\n\nSTDERR:\n{completed.stderr}\n",
        encoding="utf-8",
    )

    if completed.returncode != 0:
        details = [f"codex exec failed with exit code {completed.returncode}", f"prompt: {prompt_path}", f"log: {log_path}"]
        stderr = completed.stderr.strip()
        stdout = completed.stdout.strip()
        if stderr:
            details.append(f"stderr: {stderr.splitlines()[-1]}")
        elif stdout:
            details.append(f"stdout: {stdout.splitlines()[-1]}")
        return run_eval.TestResult(name=f"codex_cli({case_id})", passed=False, details=details)

    if not response_path.exists():
        return run_eval.TestResult(
            name=f"codex_cli({case_id})",
            passed=False,
            details=[f"missing response file: {response_path}", f"prompt: {prompt_path}", f"log: {log_path}"],
        )

    response_text = response_path.read_text(encoding="utf-8")
    result = run_eval.validate_output_text_mode(case, response_text, "codex_cli", mode=eval_mode)
    result.details.insert(0, f"prompt: {prompt_path}")
    result.details.insert(1, f"response: {response_path}")
    result.details.insert(2, f"log: {log_path}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Run plan-code-file-layout evals through Codex CLI.")
    parser.add_argument("--case", help="Only run one case id.")
    parser.add_argument(
        "--suite",
        choices=("smoke", "anchor-scope", "conflict", "all"),
        default="smoke",
        help="Which case group to run when --case is not provided.",
    )
    parser.add_argument("--codex-bin", default="codex", help="Codex CLI executable path.")
    parser.add_argument("--model", help="Optional model override passed to codex exec.")
    parser.add_argument(
        "--eval-mode",
        choices=("strict", "semantic"),
        default="semantic",
        help="Validation mode applied to Codex CLI outputs.",
    )
    parser.add_argument(
        "--reasoning-effort",
        choices=("low", "medium", "high", "xhigh"),
        help="Optional reasoning effort override for codex exec.",
    )
    parser.add_argument(
        "--sandbox",
        choices=("read-only", "workspace-write", "danger-full-access"),
        default="read-only",
        help="Sandbox mode passed to codex exec.",
    )
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Directory for prompts, logs, and responses.")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")
    args = parser.parse_args()

    repo_root, cases = run_eval.load_cases()
    chosen_cases = choose_cases(cases, args.suite, args.case)
    if args.case and not chosen_cases:
        print(f"unknown case id: {args.case}", file=sys.stderr)
        return 1

    results = [
        run_case(
            repo_root=repo_root,
            case=case,
            output_dir=Path(args.output_dir),
            codex_bin=args.codex_bin,
            model=args.model,
            sandbox=args.sandbox,
            reasoning_effort=args.reasoning_effort,
            eval_mode=args.eval_mode,
        )
        for case in chosen_cases
    ]

    if args.json:
        print(json.dumps([result.__dict__ for result in results], ensure_ascii=False, indent=2))
    else:
        print("=" * 60)
        print(f"plan-code-file-layout Codex CLI evaluation report ({args.eval_mode})")
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
