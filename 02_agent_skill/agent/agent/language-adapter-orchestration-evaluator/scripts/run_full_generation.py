from __future__ import annotations

from pathlib import Path
import argparse
import json
import subprocess
import sys
from collections import Counter

import yaml


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_ROOT = Path(r"D:\diypc\LLMceshi\full-generation-run")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def dump_yaml(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(payload, allow_unicode=True, sort_keys=False), encoding="utf-8")


def run_python(script: Path, args: list[str], allow_failure: bool = False) -> int:
    result = subprocess.run([sys.executable, str(script), *args], check=False)
    if result.returncode != 0 and not allow_failure:
        raise SystemExit(result.returncode)
    return result.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="run full generation（执行全量生成）")
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--total-candidate-goal", type=int, default=60000)
    parser.add_argument("--batch-size", type=int, default=1000)
    args = parser.parse_args()

    output_root = args.output_root
    manifest_path = output_root / "generated-run-manifest.yaml"
    pack_root = output_root / "packs"
    eval_root = output_root / "evals"
    summary_path = output_root / "generation-summary.yaml"

    output_root.mkdir(parents=True, exist_ok=True)
    pack_root.mkdir(parents=True, exist_ok=True)
    eval_root.mkdir(parents=True, exist_ok=True)

    run_python(
        SCRIPT_DIR / "generate_run_manifest.py",
        [
            "--total-candidate-goal",
            str(args.total_candidate_goal),
            "--batch-size",
            str(args.batch_size),
            "--output",
            str(manifest_path),
        ],
    )

    run_python(
        SCRIPT_DIR / "generate_candidate_corpus.py",
        [
            "--manifest",
            str(manifest_path),
            "--output-dir",
            str(pack_root),
        ],
    )

    statuses = Counter()
    total_items = 0
    failed_packs: list[str] = []
    for candidate_pack_path in sorted(pack_root.glob("language_adapter_pack_*.json")):
        eval_path = eval_root / f"{candidate_pack_path.stem}.eval.yaml"
        return_code = run_python(
            SCRIPT_DIR / "evaluate_candidate_batch.py",
            [
                "--input",
                str(candidate_pack_path),
                "--manifest",
                str(manifest_path),
                "--output",
                str(eval_path),
            ],
            allow_failure=True,
        )
        eval_payload = load_yaml(eval_path)
        status = str(eval_payload["evaluation_report"]["status"])
        statuses.update([status])
        total_items += len(load_json(candidate_pack_path)["candidate_pack"]["items"])
        if return_code != 0 or status != "pass":
            failed_packs.append(candidate_pack_path.name)

    summary = {
        "full_generation_summary": {
            "output_root": str(output_root),
            "manifest_ref": str(manifest_path),
            "pack_root": str(pack_root),
            "eval_root": str(eval_root),
            "pack_count": len(list(pack_root.glob("language_adapter_pack_*.json"))),
            "total_items": total_items,
            "status_counts": dict(statuses),
            "failed_packs": failed_packs,
        }
    }
    dump_yaml(summary_path, summary)
    print(f"full generation summary（全量生成汇总）: {summary_path}")
    return 1 if failed_packs else 0


if __name__ == "__main__":
    raise SystemExit(main())
