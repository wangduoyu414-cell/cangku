#!/usr/bin/env python3
"""DEPRECATED: use tmp/run_tests_v3.py for the maintained baseline run."""

import json
import subprocess
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_DIR / "scripts"
TMP_DIR = SKILL_DIR / "tmp"
TMP_DIR.mkdir(exist_ok=True)

REPO_ROOT = str(SKILL_DIR).replace("/", "\\")
TESTS = [
    ("py1", "src/app/interfaces/order_controller.py", "python"),
    ("ts1", "src/app/services/orderApi.ts", "typescript"),
    ("go1", "src/app/entrypoints/main.go", "go"),
]


def run_script_verbose(script_name, args, output_path):
    cmd = [sys.executable, str(SCRIPTS_DIR / script_name), *args, "--output", output_path]
    cmd_str = " ".join(f'"{a}"' for a in cmd)
    print(f"  CMD: {cmd_str[:100]}...", flush=True)
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=60,
        )
        if result.returncode != 0:
            print(f"  STDERR: {result.stderr[:200]}", flush=True)
            return result.returncode
        if result.stdout:
            print(f"  STDOUT: {result.stdout[:200]}", flush=True)
        return 0
    except Exception as exc:
        print(f"  EXCEPTION: {exc}", flush=True)
        return -1


def main():
    all_results = {}
    for test_id, file_rel, lang in TESTS:
        file_path = str(Path(REPO_ROOT) / file_rel).replace("/", "\\")
        base = TMP_DIR / test_id

        for suffix in [
            "_anchor.json",
            "_stack.json",
            "_code.json",
            "_symbol.json",
            "_context.json",
            "_slice.json",
            "_verify.json",
        ]:
            old_file = base.with_name(f"{test_id}{suffix}")
            if old_file.exists():
                old_file.unlink()

        print(f"\n=== Test {test_id}: {file_rel} ({lang}) ===", flush=True)

        anchor_path = str(TMP_DIR / f"{test_id}_anchor.json")
        rc = run_script_verbose(
            "resolve_anchor.py",
            ["--file", file_path, "--repo-root", REPO_ROOT],
            anchor_path,
        )
        print(f"  anchor rc={rc}, exists={Path(anchor_path).exists()}", flush=True)

        stack_path = str(TMP_DIR / f"{test_id}_stack.json")
        if Path(anchor_path).exists():
            rc = run_script_verbose("detect_stack.py", ["--anchor", anchor_path], stack_path)
            print(f"  stack rc={rc}, exists={Path(stack_path).exists()}", flush=True)
        else:
            print("  [SKIP stack - anchor not found]", flush=True)

        code_path = str(TMP_DIR / f"{test_id}_code.json")
        symbol_path = str(TMP_DIR / f"{test_id}_symbol.json")
        context_path = str(TMP_DIR / f"{test_id}_context.json")
        if Path(stack_path).exists():
            run_script_verbose("collect_code_edges.py", ["--anchor", anchor_path, "--stack", stack_path], code_path)
            run_script_verbose("collect_symbol_edges.py", ["--anchor", anchor_path, "--stack", stack_path], symbol_path)
            run_script_verbose("collect_context_edges.py", ["--anchor", anchor_path, "--stack", stack_path], context_path)
            print(
                f"  code={Path(code_path).exists()}, symbol={Path(symbol_path).exists()}, context={Path(context_path).exists()}",
                flush=True,
            )
        else:
            print("  [SKIP edges - stack not found]", flush=True)

        slice_path = str(TMP_DIR / f"{test_id}_slice.json")
        if Path(code_path).exists() and Path(context_path).exists():
            rc = run_script_verbose(
                "build_slice.py",
                [
                    "--anchor",
                    anchor_path,
                    "--code",
                    code_path,
                    "--context",
                    context_path,
                    "--symbol",
                    symbol_path,
                    "--impact-depth",
                    "3",
                ],
                slice_path,
            )
            print(f"  slice rc={rc}, exists={Path(slice_path).exists()}", flush=True)
        else:
            print("  [SKIP slice - edges not found]", flush=True)

        verify_path = str(TMP_DIR / f"{test_id}_verify.json")
        if Path(slice_path).exists():
            rc = run_script_verbose("verify_claims.py", ["--slice", slice_path], verify_path)
            print(f"  verify rc={rc}, exists={Path(verify_path).exists()}", flush=True)
        else:
            print("  [SKIP verify - slice not found]", flush=True)

        results = {}
        for stage in ["anchor", "stack", "code", "symbol", "context", "slice", "verify"]:
            path = TMP_DIR / f"{test_id}_{stage}.json"
            if path.exists():
                try:
                    results[stage] = json.loads(path.read_text(encoding="utf-8", errors="replace"))
                except Exception as exc:
                    results[stage] = {"error": f"parse error: {exc}"}
            else:
                results[stage] = {"error": "file not found"}

        all_results[test_id] = {"file": file_rel, "language": lang, "stages": results}

        slice_data = results.get("slice", {})
        if "meta" in slice_data:
            meta = slice_data["meta"]
            rel = slice_data.get("relation_summary", {})
            cycles = slice_data.get("dependency_cycles", [])
            impact = slice_data.get("change_impact", {})
            targets = slice_data.get("build_targets", [])
            pipeline = slice_data.get("pipeline_status", {})
            print(f"  => meta: {meta.get('target_file', 'N/A')}", flush=True)
            print(
                f"  => confirmed: out={rel.get('outbound_count', 0)}, "
                f"in={rel.get('inbound_count', 0)}, config={rel.get('config_link_count', 0)}",
                flush=True,
            )
            print(
                f"  => cycles={len(cycles)}, impact={impact.get('impact_summary', {}).get('total_impacted', 0)}, "
                f"targets={len(targets)}, pipeline={pipeline.get('overall', 'N/A')}",
                flush=True,
            )
        elif "error" in slice_data:
            print(f"  => SLICE ERROR: {slice_data['error']}", flush=True)
        else:
            print(f"  => No meta in slice (keys: {list(slice_data.keys())})", flush=True)

    report_path = TMP_DIR / "test_report_v2.json"
    report_path.write_text(json.dumps(all_results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nReport: {report_path}", flush=True)


if __name__ == "__main__":
    main()
