#!/usr/bin/env python3
"""Export a manual/offline evaluation pack for plan-code-file-layout."""

from __future__ import annotations

import argparse
import io
import json
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

import run_eval  # noqa: E402
import run_live_eval  # noqa: E402


def yaml_stub() -> str:
    return """decision:
  strategy: keep | split | merge
  target_area: ""
  repo_shape: feature-first | layer-first | package-first | mixed
  artifact_type: ui-component | service-endpoint | cli-command | data-pipeline-step | library-module
  stack: python | typescript-javascript | vue | go | mixed | unknown
  files:
    - path: ""
      role: ""
      responsibility: ""
      reason: ""
  keep_inline: []
  avoid: []
  why_not_fewer: ""
  why_not_more: ""
  risks: []
  confidence: high | medium | low
"""


def build_manifest_entry(case: dict[str, Any]) -> dict[str, Any]:
    expected = dict(case["expected"])
    return {
        "id": case["id"],
        "prompt": case["prompt"],
        "target_area": case["target_area"],
        "source_paths": case["source_paths"],
        "expected_summary": {
            "strategy": expected["strategy"],
            "repo_shape": expected["repo_shape"],
            "artifact_type": expected["artifact_type"],
            "stack": expected["stack"],
            "confidence": expected["confidence"],
            "files": expected["files"],
        },
        "validation_command": (
            "python eval/validate_saved_output.py "
            f"--case {case['id']} --output outputs/{case['id']}.yaml"
        ),
    }


def write_pack(root: Path, repo_root: Path, cases: list[dict[str, Any]]) -> None:
    prompts_dir = root / "prompts"
    outputs_dir = root / "outputs"
    expected_dir = root / "expected"
    prompts_dir.mkdir(parents=True, exist_ok=True)
    outputs_dir.mkdir(parents=True, exist_ok=True)
    expected_dir.mkdir(parents=True, exist_ok=True)

    skill_bundle = run_live_eval.render_skill_bundle()
    manifest: dict[str, Any] = {
        "repo_root": str(repo_root),
        "cases": [],
    }

    for case in cases:
        case_id = str(case["id"])
        prompt = run_live_eval.build_case_prompt(repo_root, case)
        system_prompt = (
            "You are executing a repository skill evaluation. "
            "Follow the skill workflow and references exactly, and return only YAML.\n\n"
            f"{skill_bundle}"
        )

        prompt_path = prompts_dir / f"{case_id}.prompt.txt"
        prompt_path.write_text(f"SYSTEM:\n{system_prompt}\n\nUSER:\n{prompt}\n", encoding="utf-8")

        output_path = outputs_dir / f"{case_id}.yaml"
        if not output_path.exists():
            output_path.write_text(yaml_stub(), encoding="utf-8")

        expected_summary_path = expected_dir / f"{case_id}.json"
        expected_summary_path.write_text(
            json.dumps(build_manifest_entry(case), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        manifest["cases"].append(build_manifest_entry(case))

    (root / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    readme = f"""# Manual Eval Pack

This pack lets you test `plan-code-file-layout` without any API key.

## Steps

1. Open a prompt file from `prompts/`.
2. Paste it into any model UI or use it for human review.
3. Save the YAML-only answer into the matching file under `outputs/`.
4. Validate one output:
   `python {run_eval.ROOT / 'eval' / 'validate_saved_output.py'} --case <case-id> --output <output-file>`
5. Validate the whole pack:
   `python {run_eval.ROOT / 'eval' / 'validate_saved_output.py'} --dir {outputs_dir} --require-all`

## Files

- `prompts/`: Full prompt bundles with system prompt and repository context.
- `outputs/`: Empty YAML stubs where answers should be saved.
- `expected/`: Short summaries of what the evaluator expects for each case.
- `manifest.json`: Machine-readable overview of all cases.
"""
    (root / "README.md").write_text(readme, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Export a manual evaluation pack for plan-code-file-layout.")
    parser.add_argument(
        "--output-dir",
        default=str(run_eval.ROOT / "eval" / "manual_pack"),
        help="Destination directory for the exported pack.",
    )
    parser.add_argument("--case", help="Only export one case id.")
    args = parser.parse_args()

    repo_root, cases = run_eval.load_cases()
    chosen_cases = [case for case in cases if args.case in (None, str(case["id"]))]
    if args.case and not chosen_cases:
        print(f"unknown case id: {args.case}", file=sys.stderr)
        return 1

    output_dir = Path(args.output_dir)
    write_pack(output_dir, repo_root, chosen_cases)
    print(f"manual eval pack written to: {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
