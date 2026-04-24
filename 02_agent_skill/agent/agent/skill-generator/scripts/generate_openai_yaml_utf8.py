#!/usr/bin/env python3
"""Run generate_openai_yaml.py with UTF-8 enabled and passthrough arguments."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import subprocess
import sys


DEFAULT_GENERATOR = Path(
    r"D:\codex-haochi\deploy\lan\_verify-fix-setup\codex-home\skills\.system\skill-creator\scripts\generate_openai_yaml.py"
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run generate_openai_yaml.py with UTF-8 enabled.")
    parser.add_argument("skill_dir", help="Skill directory.")
    parser.add_argument("--generator", default=str(DEFAULT_GENERATOR), help="Path to generate_openai_yaml.py.")
    parser.add_argument("--name", help="Optional skill name override.")
    parser.add_argument("--interface", action="append", default=[], help="Repeated key=value interface override.")
    args = parser.parse_args()

    generator = Path(args.generator).resolve()
    skill_dir = Path(args.skill_dir).resolve()

    if not generator.exists():
        raise FileNotFoundError(f"Generator not found: {generator}")
    if not skill_dir.exists():
        raise FileNotFoundError(f"Skill directory not found: {skill_dir}")

    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"

    command = [sys.executable, str(generator), str(skill_dir)]
    if args.name:
        command.extend(["--name", args.name])
    for item in args.interface:
        command.extend(["--interface", item])

    result = subprocess.run(command, env=env, text=True, capture_output=True, check=False)
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
