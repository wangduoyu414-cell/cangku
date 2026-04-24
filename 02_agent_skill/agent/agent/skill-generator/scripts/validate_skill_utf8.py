#!/usr/bin/env python3
"""Run the upstream quick validator with UTF-8 enabled."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import subprocess
import sys


DEFAULT_VALIDATOR = Path(
    r"D:\codex-haochi\deploy\lan\_verify-fix-setup\codex-home\skills\.system\skill-creator\scripts\quick_validate.py"
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run quick_validate.py with UTF-8 enabled.")
    parser.add_argument("skill_dir", help="Skill directory to validate.")
    parser.add_argument(
        "--validator",
        default=str(DEFAULT_VALIDATOR),
        help="Path to quick_validate.py.",
    )
    args = parser.parse_args()

    validator = Path(args.validator).resolve()
    if not validator.exists():
        raise FileNotFoundError(f"Validator not found: {validator}")

    skill_dir = Path(args.skill_dir).resolve()
    if not skill_dir.exists():
        raise FileNotFoundError(f"Skill directory not found: {skill_dir}")

    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"

    result = subprocess.run(
        [sys.executable, str(validator), str(skill_dir)],
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
