#!/usr/bin/env python3
"""Optional live evaluation runner for the plan-code-file-layout skill."""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request
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

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT_DIR = ROOT / "eval" / "live_outputs"
DEFAULT_CONTINUE_CONFIG = Path.home() / ".continue" / "config.yaml"
CORE_REFERENCE_FILES = [
    "core-principles.md",
    "repo-shape.md",
    "output-shape.md",
]
ARTIFACT_REFERENCE_FILES = {
    "ui-component": "artifact-ui-component.md",
    "service-endpoint": "artifact-service-endpoint.md",
    "cli-command": "artifact-cli-command.md",
    "data-pipeline-step": "artifact-data-pipeline-step.md",
    "library-module": "artifact-library-module.md",
}
STACK_REFERENCE_FILES = {
    "python": "stack-python.md",
    "typescript-javascript": "stack-typescript-javascript.md",
    "vue": "stack-vue.md",
    "go": "stack-go.md",
}

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_eval as static_eval  # noqa: E402


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def maybe_load_continue_credentials(model: str, config_path: Path) -> tuple[str | None, str | None]:
    if not config_path.exists():
        return None, None

    text = config_path.read_text(encoding="utf-8")
    pattern = (
        r"-\s+uses:\s+openai/"
        + re.escape(model)
        + r"\s+with:\s*(?P<body>(?:\n\s{6,}.+)+)"
    )
    match = re.search(pattern, text)
    if not match:
        return None, None

    body = match.group("body")
    api_key_match = re.search(r"OPENAI_API_KEY:\s*(\S+)", body)
    api_base_match = re.search(r"OPENAI_BASE_URL:\s*(\S+)", body)
    api_key = api_key_match.group(1) if api_key_match else None
    api_base = api_base_match.group(1) if api_base_match else None
    return api_key, api_base


def infer_artifact_type(case: dict[str, Any]) -> str | None:
    relative_paths = [str(path).lower() for path in case.get("source_paths", [])]
    target_area = str(case.get("target_area", "")).lower()
    prompt = str(case.get("prompt", "")).lower()
    combined = "\n".join(relative_paths + [target_area, prompt])

    if any(marker in combined for marker in ("/jobs/", "/transforms/", "/sinks/", "etl", "pipeline step", "batch step")):
        return "data-pipeline-step"
    if any(marker in combined for marker in ("/scripts/", "/ops/", " cli ", "cli command", "command ")):
        return "cli-command"
    if any(marker in combined for marker in ("endpoint", "route", "handler", "controller", "webhook", "rpc")):
        return "service-endpoint"
    if any(path.endswith((".vue", ".tsx", ".jsx")) for path in relative_paths) or any(
        marker in combined for marker in ("component", "page", "panel", "composable")
    ):
        return "ui-component"
    if any(marker in combined for marker in ("/packages/go/", "library module", "shared helper", "codec", "package")):
        return "library-module"
    return None


def infer_stack(case: dict[str, Any]) -> str | None:
    relative_paths = [str(path).lower() for path in case.get("source_paths", [])]
    if any(path.endswith(".vue") for path in relative_paths):
        return "vue"
    if any(path.endswith(".go") for path in relative_paths):
        return "go"
    if any(path.endswith((".ts", ".tsx", ".js", ".jsx")) for path in relative_paths):
        return "typescript-javascript"
    if any(path.endswith(".py") for path in relative_paths):
        return "python"
    return None


def should_include_anti_patterns(case: dict[str, Any]) -> bool:
    relative_paths = [str(path).lower() for path in case.get("source_paths", [])]
    prompt = str(case.get("prompt", "")).lower()
    combined = "\n".join(relative_paths + [prompt])
    signals = (
        "merge",
        "tiny",
        "pass-through",
        "pass through",
        "utils",
        "common",
        "shared",
        "helper",
        "helpers",
        "index.ts",
        "index.py",
        "index.go",
    )
    return any(signal in combined for signal in signals)


def select_reference_paths(case: dict[str, Any]) -> list[Path]:
    reference_dir = ROOT / "references"
    selected_names = list(CORE_REFERENCE_FILES)

    artifact_type = infer_artifact_type(case)
    artifact_reference = ARTIFACT_REFERENCE_FILES.get(artifact_type or "")
    if artifact_reference and artifact_reference not in selected_names:
        selected_names.append(artifact_reference)

    stack = infer_stack(case)
    stack_reference = STACK_REFERENCE_FILES.get(stack or "")
    if stack_reference and stack_reference not in selected_names:
        selected_names.append(stack_reference)

    if should_include_anti_patterns(case):
        selected_names.append("anti-patterns.md")

    paths: list[Path] = []
    for name in selected_names:
        path = reference_dir / name
        if path.exists() and path not in paths:
            paths.append(path)
    return paths


def render_skill_bundle(case: dict[str, Any]) -> str:
    parts = [
        "# Skill",
        read_text(ROOT / "SKILL.md"),
    ]

    for path in select_reference_paths(case):
        parts.append(f"# Reference: {path.name}")
        parts.append(read_text(path))

    return "\n\n".join(parts)


def build_case_prompt(repo_root: Path, case: dict[str, Any]) -> str:
    primary_files, support_files = static_eval.partition_case_context_files(repo_root, case)
    focus_files = [str(path) for path in case.get("focus_paths", [])]
    comparison_files = [str(path) for path in case.get("comparison_paths", [])]
    legacy_files = [str(path) for path in case.get("legacy_paths", [])]
    target_area = str(case["target_area"])
    is_exact_file_anchor = static_eval.looks_like_file_path(target_area)
    forbidden_return_files = static_eval.get_semantic_forbidden_paths(case)
    if focus_files:
        primary_set = set(primary_files)
        focus_files = [path for path in focus_files if path in primary_set]
    if comparison_files:
        primary_set = set(primary_files)
        comparison_files = [path for path in comparison_files if path in primary_set]
    if legacy_files:
        primary_set = set(primary_files)
        legacy_files = [path for path in legacy_files if path in primary_set]

    remaining_primary_files = [
        path
        for path in primary_files
        if path not in set(focus_files) and path not in set(comparison_files) and path not in set(legacy_files)
    ]

    context_lines = [
        f"User request:\n{case['prompt']}",
        f"Repository root: {repo_root}",
        f"Target area: {target_area}",
        (
            f"Anchor lock: copy target_area exactly as `{target_area}`. This request uses an exact file-path anchor. "
            "Do not rewrite it into prose, do not widen it to the parent directory, and do not replace it with a broader feature anchor."
            if is_exact_file_anchor
            else f"Anchor lock: copy target_area exactly as `{target_area}`. This request uses a directory, feature, or module anchor. "
            "Do not rewrite it into prose, and do not narrow it down to a single file unless the request itself anchors on that file."
        ),
        "Important scope rule: recommend only the production files for the concrete target slice named in the request. Nearby comparison files are reference only and must not be copied into the returned file plan unless the request explicitly expands scope.",
        "Important precedence rule: if baseline repository docs explicitly define a target layer, module boundary, or migration direction that conflicts with the local layout, follow the baseline docs and treat the local layout as legacy evidence.",
        "Important compatibility rule: files shown as legacy compatibility shims, transitional bridges, or rollout-only paths are evidence or migration risks by default and must not be included in `files` unless the request explicitly asks to preserve transitional files.",
    ]

    if forbidden_return_files:
        context_lines.append("Forbidden returned files (evidence only; never place these under `decision.files` unless the user explicitly expands scope):")
        context_lines.extend(f"- {relative_path}" for relative_path in forbidden_return_files)

    if focus_files:
        context_lines.append("Target slice files:")
        context_lines.extend(f"- {relative_path}" for relative_path in focus_files)
    else:
        context_lines.append("Primary implementation files:")
        context_lines.extend(f"- {relative_path}" for relative_path in primary_files)

    if comparison_files:
        context_lines.append("Nearby comparison files (reference only; they may be mentioned in rationale but must not appear in `decision.files`):")
        context_lines.extend(f"- {relative_path}" for relative_path in comparison_files)

    if legacy_files:
        context_lines.append("Legacy compatibility files (evidence only; do not include these files in the answer unless the request explicitly asks to preserve transitional files):")
        context_lines.extend(f"- {relative_path}" for relative_path in legacy_files)
        context_lines.append("Legacy compatibility files to exclude from `files` by default:")
        context_lines.extend(f"- {relative_path}" for relative_path in legacy_files)

    if remaining_primary_files:
        context_lines.append("Additional local context files:")
        context_lines.extend(f"- {relative_path}" for relative_path in remaining_primary_files)

    if support_files:
        context_lines.append("Baseline repository files:")
        context_lines.extend(f"- {relative_path}" for relative_path in support_files)
    context_lines.append("")
    context_lines.append("Repository context:")

    if focus_files:
        context_lines.append("")
        context_lines.append("Target slice file contents:")

    for relative_path in focus_files or []:
        path = repo_root / relative_path
        context_lines.append(f"\n## File: {relative_path}\n")
        context_lines.append("```text")
        context_lines.append(read_text(path))
        context_lines.append("```")

    if comparison_files:
        context_lines.append("")
        context_lines.append("Comparison file contents (reference only; do not include these files in the answer unless the request scope explicitly includes them):")

    for relative_path in comparison_files:
        path = repo_root / relative_path
        context_lines.append(f"\n## File: {relative_path}\n")
        context_lines.append("```text")
        context_lines.append(read_text(path))
        context_lines.append("```")

    if legacy_files:
        context_lines.append("")
        context_lines.append("Legacy compatibility file contents (evidence only; treat these as migration context or temporary bridges unless the request explicitly asks to keep transitional files):")

    for relative_path in legacy_files:
        path = repo_root / relative_path
        context_lines.append(f"\n## File: {relative_path}\n")
        context_lines.append("```text")
        context_lines.append(read_text(path))
        context_lines.append("```")

    if remaining_primary_files:
        context_lines.append("")
        context_lines.append("Additional local context file contents:")

    for relative_path in remaining_primary_files if focus_files or comparison_files else primary_files:
        path = repo_root / relative_path
        context_lines.append(f"\n## File: {relative_path}\n")
        context_lines.append("```text")
        context_lines.append(read_text(path))
        context_lines.append("```")

    if support_files:
        context_lines.append("")
        context_lines.append("Baseline repository context (these files override conflicting local layout when they explicitly define the target layer or module boundary):")

    for relative_path in support_files:
        path = repo_root / relative_path
        context_lines.append(f"\n## File: {relative_path}\n")
        context_lines.append("```text")
        context_lines.append(read_text(path))
        context_lines.append("```")

    context_lines.append("")
    context_lines.append(f"Return only YAML that follows the skill output contract. `target_area` must equal `{target_area}` exactly.")
    if forbidden_return_files:
        context_lines.append("Return-scope reminder: forbidden returned files may be cited in explanation, but they must not appear under `decision.files`.")
    return "\n".join(context_lines)


def extract_response_text(payload: dict[str, Any]) -> str:
    if isinstance(payload.get("output_text"), str) and payload["output_text"].strip():
        return payload["output_text"].strip()

    chunks: list[str] = []
    for item in payload.get("output", []):
        for content in item.get("content", []):
            text = content.get("text") or content.get("output_text")
            if isinstance(text, str) and text.strip():
                chunks.append(text.strip())

    return "\n".join(chunks).strip()


def call_openai(model: str, system_prompt: str, user_prompt: str, api_key: str, base_url: str) -> dict[str, Any]:
    payload = {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": [{"type": "input_text", "text": system_prompt}],
            },
            {
                "role": "user",
                "content": [{"type": "input_text", "text": user_prompt}],
            },
        ],
    }

    request = urllib.request.Request(
        url=f"{base_url.rstrip('/')}/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def run_case(
    repo_root: Path,
    case: dict[str, Any],
    skill_bundle: str,
    output_dir: Path,
    model: str,
    api_key: str | None,
    base_url: str,
    dry_run: bool,
) -> static_eval.TestResult:
    case_id = str(case["id"])
    output_dir.mkdir(parents=True, exist_ok=True)

    system_prompt = (
        "You are executing a repository skill evaluation. "
        "Follow the skill workflow and references exactly, and return only YAML.\n\n"
        f"{skill_bundle}"
    )
    user_prompt = build_case_prompt(repo_root, case)

    prompt_path = output_dir / f"{case_id}.prompt.txt"
    prompt_path.write_text(f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_prompt}\n", encoding="utf-8")

    if dry_run:
        return static_eval.TestResult(
            name=f"live({case_id})",
            passed=True,
            details=[f"dry run only; prompt written to {prompt_path}"],
        )

    if not api_key:
        return static_eval.TestResult(
            name=f"live({case_id})",
            passed=False,
            details=["OPENAI_API_KEY is not set. Use --dry-run to inspect prompts without calling the API."],
        )

    try:
        payload = call_openai(model=model, system_prompt=system_prompt, user_prompt=user_prompt, api_key=api_key, base_url=base_url)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return static_eval.TestResult(
            name=f"live({case_id})",
            passed=False,
            details=[f"HTTP {exc.code}: {body}"],
        )
    except Exception as exc:  # pragma: no cover - defensive runtime handling
        return static_eval.TestResult(
            name=f"live({case_id})",
            passed=False,
            details=[f"request failed: {exc}"],
        )

    response_json_path = output_dir / f"{case_id}.response.json"
    response_json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    response_text = extract_response_text(payload)
    response_text_path = output_dir / f"{case_id}.response.yaml"
    response_text_path.write_text(response_text, encoding="utf-8")

    result = static_eval.validate_output_text(case, response_text, "live")
    result.details.insert(0, f"prompt: {prompt_path}")
    result.details.insert(1, f"response: {response_text_path}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Run live model evaluations for plan-code-file-layout.")
    parser.add_argument("--case", help="Only run one case id.")
    parser.add_argument("--model", default=os.environ.get("OPENAI_MODEL", ""), help="Model name. Defaults to OPENAI_MODEL.")
    parser.add_argument("--base-url", default=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"))
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--continue-config", default=str(DEFAULT_CONTINUE_CONFIG), help="Optional Continue config.yaml path for loading model credentials.")
    parser.add_argument("--dry-run", action="store_true", help="Write prompts without calling the API.")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")
    args = parser.parse_args()

    repo_root, cases = static_eval.load_cases()
    chosen_cases = [case for case in cases if args.case in (None, str(case["id"]))]
    if args.case and not chosen_cases:
        print(f"unknown case id: {args.case}", file=sys.stderr)
        return 1

    if not args.dry_run and not args.model:
        print("Missing model name. Set OPENAI_MODEL or pass --model.", file=sys.stderr)
        return 1

    continue_config = Path(args.continue_config)
    api_key = os.environ.get("OPENAI_API_KEY")
    base_url = args.base_url
    if not api_key and args.model:
        continue_api_key, continue_api_base = maybe_load_continue_credentials(args.model, continue_config)
        api_key = continue_api_key or api_key
        if continue_api_base:
            base_url = continue_api_base

    output_dir = Path(args.output_dir)

    results = [
        run_case(
            repo_root=repo_root,
            case=case,
            skill_bundle=render_skill_bundle(case),
            output_dir=output_dir,
            model=args.model,
            api_key=api_key,
            base_url=base_url,
            dry_run=args.dry_run,
        )
        for case in chosen_cases
    ]

    if args.json:
        print(json.dumps([result.__dict__ for result in results], ensure_ascii=False, indent=2))
    else:
        print("=" * 60)
        print("plan-code-file-layout live evaluation report")
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
