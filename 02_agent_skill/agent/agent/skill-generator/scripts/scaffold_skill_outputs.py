#!/usr/bin/env python3
"""Scaffold standard skill-generator outputs from bundled templates."""

from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path
import sys


SCRIPT_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = SCRIPT_DIR.parent / "assets" / "templates"

DEFAULT_FILES = {
    "request-template.md": "request.md",
    "skill-brief-template.md": "skill-brief.md",
    "skill-scorecard-template.md": "skill-scorecard.md",
    "iteration-backlog-template.md": "iteration-backlog.md",
    "experience-ledger-template.yaml": "experience-ledger.yaml",
    "baseline-comparison-template.md": "baseline-comparison.md",
    "run-manifest-template.yaml": "run-manifest.yaml",
}

MODE_EXTRA_FILES = {
    "iterate": {
        "failure-attribution-template.md": "failure-attribution.md",
    },
    "model-upgrade": {
        "model-upgrade-note-template.md": "model-upgrade-note.md",
    },
}


def replace_tokens(text: str, skill_name: str, request_summary: str, mode: str) -> str:
    return (
        text.replace("{{skill_name}}", skill_name)
        .replace("{{request_summary}}", request_summary)
        .replace("{{mode}}", mode)
        .replace("{{today}}", date.today().isoformat())
    )


def write_file(src: Path, dst: Path, skill_name: str, request_summary: str, mode: str, force: bool) -> None:
    if dst.exists() and not force:
        raise FileExistsError(f"Refusing to overwrite existing file without --force: {dst}")
    content = src.read_text(encoding="utf-8")
    dst.write_text(replace_tokens(content, skill_name, request_summary, mode), encoding="utf-8")


def selected_files(mode: str) -> dict[str, str]:
    files = dict(DEFAULT_FILES)
    files.update(MODE_EXTRA_FILES.get(mode, {}))
    return files


def update_run_manifest(path: Path, skill_name: str, request_summary: str, mode: str, written: list[Path]) -> None:
    lines = [
        f'skill_name: "{skill_name}"',
        f'mode: "{mode}"',
        f'request_summary: "{request_summary}"',
        f'created_at: "{date.today().isoformat()}"',
        "created_files:",
    ]
    for item in written:
        lines.append(f'  - "{item.name}"')
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Scaffold skill-generator output files.")
    parser.add_argument("output_dir", help="Directory where scaffolded files will be written.")
    parser.add_argument("--skill-name", required=True, help="Target skill name.")
    parser.add_argument(
        "--request-summary",
        default="Turn repeated work into a reusable and testable skill package.",
        help="One-line request summary inserted into the brief template.",
    )
    parser.add_argument(
        "--mode",
        choices=["generate", "iterate", "model-upgrade"],
        default="generate",
        help="Current run mode.",
    )
    parser.add_argument("--force", action="store_true", help="Overwrite existing files.")
    args = parser.parse_args()

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    written = []
    for template_name, output_name in selected_files(args.mode).items():
        src = TEMPLATE_DIR / template_name
        dst = output_dir / output_name
        write_file(src, dst, args.skill_name, args.request_summary, args.mode, args.force)
        written.append(dst)

    manifest_path = output_dir / "run-manifest.yaml"
    update_run_manifest(manifest_path, args.skill_name, args.request_summary, args.mode, written)

    for path in written:
        print(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
