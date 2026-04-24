#!/usr/bin/env python3
"""
Run the audit fixture suite.

This runner reuses the parent repository's eval_contract_output.py so the
audit skill stays aligned with the main structured-output validator.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SKILL_ROOT = Path(__file__).resolve().parents[1]
SUITE = SKILL_ROOT / "evals" / "report-quality.json"
EVAL_SCRIPT = ROOT / "scripts" / "eval_contract_output.py"


def main() -> int:
    if not SUITE.exists():
        print(f"Missing suite file: {SUITE}", file=sys.stderr)
        return 2
    if not EVAL_SCRIPT.exists():
        print(f"Missing eval script: {EVAL_SCRIPT}", file=sys.stderr)
        return 2

    cmd = [sys.executable, str(EVAL_SCRIPT), "--suite", str(SUITE), "--type", "report"]
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    if proc.stdout:
        print(proc.stdout, end="")
    if proc.stderr:
        print(proc.stderr, end="", file=sys.stderr)

    return proc.returncode


if __name__ == "__main__":
    sys.exit(main())

