#!/usr/bin/env python3
"""Integration test runner v3 that writes all results to files."""

import json
import subprocess
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_DIR / "scripts"
TMP_DIR = SKILL_DIR / "tmp"
TMP_DIR.mkdir(exist_ok=True)

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from report_helpers import (  # noqa: E402
    slice_build_targets,
    slice_config_links,
    slice_cycles,
    slice_file_edges,
    slice_impact_summary,
    slice_target_file,
)

REPO_ROOT = str(SKILL_DIR)
TESTS = [
    ("py1", "src/app/interfaces/order_controller.py", "python"),
    ("ts1", "src/app/services/orderApi.ts", "typescript"),
    ("go1", "src/app/entrypoints/main.go", "go"),
]

log_lines = []


def log(message):
    log_lines.append(message)


def build_summary(slice_data):
    outbound, inbound = slice_file_edges(slice_data)
    config_links = slice_config_links(slice_data)
    targets = slice_build_targets(slice_data)
    cycles = slice_cycles(slice_data)
    impact_summary = slice_impact_summary(slice_data)
    return {
        "schema_version": slice_data.get("schema_version", ""),
        "target_file": slice_target_file(slice_data),
        "confirmed_outbound_count": len(outbound),
        "confirmed_inbound_count": len(inbound),
        "config_link_count": len(config_links),
        "build_target_count": len(targets),
        "cycle_count": len(cycles),
        "total_impacted": impact_summary.get("total_impacted", 0),
        "pipeline_overall": slice_data.get("pipeline_status", {}).get("overall", "N/A"),
        "verify_status": "",
    }


def run_step(test_id, stage, script_name, args):
    output = str(TMP_DIR / f"{test_id}_{stage}.json")
    cmd = [sys.executable, str(SCRIPTS_DIR / script_name), *args, "--output", output]
    log(f"[{test_id}] {stage}: running {script_name}")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )
        log(f"[{test_id}] {stage}: rc={result.returncode}")
        if result.stderr:
            log(f"[{test_id}] {stage}: stderr={result.stderr[:100]}")
        log(f"[{test_id}] {stage}: output_exists={Path(output).exists()}")
        return result.returncode, output
    except Exception as exc:
        log(f"[{test_id}] {stage}: exception={exc}")
        return -1, output


def main():
    all_results = {}

    for test_id, file_rel, lang in TESTS:
        file_path = str(Path(REPO_ROOT) / file_rel).replace("/", "\\")
        log(f"=== {test_id}: {file_rel} ===")

        rc1, anchor = run_step(test_id, "anchor", "resolve_anchor.py", ["--file", file_path, "--repo-root", REPO_ROOT])
        rc2, stack = run_step(test_id, "stack", "detect_stack.py", ["--anchor", anchor])

        code = str(TMP_DIR / f"{test_id}_code.json")
        symbol = str(TMP_DIR / f"{test_id}_symbol.json")
        context = str(TMP_DIR / f"{test_id}_context.json")

        if Path(anchor).exists():
            run_step(test_id, "code", "collect_code_edges.py", ["--anchor", anchor, "--stack", stack])
            run_step(test_id, "symbol", "collect_symbol_edges.py", ["--anchor", anchor, "--stack", stack])
            run_step(test_id, "context", "collect_context_edges.py", ["--anchor", anchor, "--stack", stack])

        slice_file = str(TMP_DIR / f"{test_id}_slice.json")
        if Path(code).exists() and Path(context).exists():
            run_step(
                test_id,
                "slice",
                "build_slice.py",
                [
                    "--anchor",
                    anchor,
                    "--code",
                    code,
                    "--context",
                    context,
                    "--symbol",
                    symbol,
                    "--impact-depth",
                    "3",
                ],
            )

        verify = str(TMP_DIR / f"{test_id}_verify.json")
        if Path(slice_file).exists():
            run_step(test_id, "verify", "verify_claims.py", ["--slice", slice_file])

        results = {}
        for stage in ["anchor", "stack", "code", "symbol", "context", "slice", "verify"]:
            path = TMP_DIR / f"{test_id}_{stage}.json"
            if path.exists():
                try:
                    results[stage] = json.loads(path.read_text(encoding="utf-8", errors="replace"))
                except Exception as exc:
                    results[stage] = {"error": str(exc)}
            else:
                results[stage] = {"error": "file not found"}

        all_results[test_id] = {"file": file_rel, "language": lang, "stages": results}

        slice_data = results.get("slice", {})
        if slice_data:
            summary = build_summary(slice_data)
            summary["verify_status"] = results.get("verify", {}).get("status", "missing")
            all_results[test_id]["summary"] = summary

            log(f"[{test_id}] SUMMARY: target={summary['target_file']}")
            log(
                f"[{test_id}] SUMMARY: confirmed out={summary['confirmed_outbound_count']}, "
                f"in={summary['confirmed_inbound_count']}, config={summary['config_link_count']}"
            )
            log(
                f"[{test_id}] SUMMARY: cycles={summary['cycle_count']}, "
                f"impact={summary['total_impacted']}, "
                f"targets={summary['build_target_count']}, pipeline={summary['pipeline_overall']}"
            )
            log(
                f"[{test_id}] SUMMARY: schema={summary['schema_version'] or 'unknown'}, "
                f"verify={summary['verify_status']}"
            )
        else:
            all_results[test_id]["summary"] = {"error": "slice missing"}

    report = {
        "log": log_lines,
        "tests": all_results,
        "summaries": {
            test_id: payload.get("summary", {})
            for test_id, payload in all_results.items()
        },
        "tmp_files": [file.name for file in TMP_DIR.iterdir()],
    }

    out = TMP_DIR / "test_report_v3.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"Done. Report: {out}")


if __name__ == "__main__":
    main()
