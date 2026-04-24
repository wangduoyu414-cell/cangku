#!/usr/bin/env python3
"""DEPRECATED: use tmp/run_tests_v3.py for the maintained baseline run."""

import io
import json
import os
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

SKILL_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_DIR / "scripts"
TMP_DIR = SKILL_DIR / "tmp"
TMP_DIR.mkdir(exist_ok=True)

REPO_ROOT = str(SKILL_DIR)
TESTS = [
    ("py1", "src/app/interfaces/order_controller.py", "python"),
    ("ts1", "src/app/services/orderApi.ts", "typescript"),
    ("go1", "src/app/entrypoints/main.go", "go"),
]


def run_script(script_name, args, output_path):
    cmd = [sys.executable, str(SCRIPTS_DIR / script_name), *args, "--output", str(output_path)]
    print(f"Running: {' '.join(cmd[:3])} ...", flush=True)
    return os.system(" ".join(f'"{a}"' for a in cmd) + " > NUL 2>&1")


def main():
    all_results = {}
    for test_id, file_rel, lang in TESTS:
        file_path = str(Path(REPO_ROOT) / file_rel).replace("/", "\\")
        base = TMP_DIR / test_id

        print(f"\n=== Test {test_id}: {file_rel} ===", flush=True)

        anchor_path = base.with_name(f"{test_id}_anchor.json")
        run_script(
            "resolve_anchor.py",
            ["--file", file_path, "--repo-root", REPO_ROOT],
            anchor_path,
        )

        stack_path = base.with_name(f"{test_id}_stack.json")
        run_script("detect_stack.py", ["--anchor", str(anchor_path)], stack_path)

        code_path = base.with_name(f"{test_id}_code.json")
        symbol_path = base.with_name(f"{test_id}_symbol.json")
        context_path = base.with_name(f"{test_id}_context.json")

        run_script("collect_code_edges.py", ["--anchor", str(anchor_path), "--stack", str(stack_path)], code_path)
        run_script("collect_symbol_edges.py", ["--anchor", str(anchor_path), "--stack", str(stack_path)], symbol_path)
        run_script("collect_context_edges.py", ["--anchor", str(anchor_path), "--stack", str(stack_path)], context_path)

        slice_path = base.with_name(f"{test_id}_slice.json")
        run_script(
            "build_slice.py",
            [
                "--anchor",
                str(anchor_path),
                "--code",
                str(code_path),
                "--context",
                str(context_path),
                "--symbol",
                str(symbol_path),
                "--impact-depth",
                "3",
            ],
            slice_path,
        )

        verify_path = base.with_name(f"{test_id}_verify.json")
        run_script("verify_claims.py", ["--slice", str(slice_path)], verify_path)

        results = {}
        for stage in ["anchor", "stack", "code", "symbol", "context", "slice", "verify"]:
            path = base.with_name(f"{test_id}_{stage}.json")
            if path.exists():
                try:
                    results[stage] = json.loads(path.read_text(encoding="utf-8"))
                except Exception:
                    results[stage] = {"error": "read failed"}
            else:
                results[stage] = {"error": "file not found"}

        all_results[test_id] = {
            "file": file_rel,
            "language": lang,
            "stages": results,
        }

        slice_data = results.get("slice", {})
        if "meta" in slice_data:
            meta = slice_data["meta"]
            rel = slice_data.get("relation_summary", {})
            cycles = slice_data.get("dependency_cycles", [])
            impact = slice_data.get("change_impact", {})
            targets = slice_data.get("build_targets", [])
            pipeline = slice_data.get("pipeline_status", {})
            print(f"  meta: {meta.get('target_file', 'N/A')}", flush=True)
            print(
                f"  confirmed: out={rel.get('outbound_count', 0)}, "
                f"in={rel.get('inbound_count', 0)}, config={rel.get('config_link_count', 0)}",
                flush=True,
            )
            print(
                f"  cycles: {len(cycles)}, impact: {impact.get('impact_summary', {}).get('total_impacted', 0)}, "
                f"build_targets: {len(targets)}",
                flush=True,
            )
            print(f"  pipeline: {pipeline.get('overall', 'N/A')}", flush=True)

    report_path = TMP_DIR / "test_report.json"
    report_path.write_text(json.dumps(all_results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nReport written to: {report_path}", flush=True)


if __name__ == "__main__":
    main()
