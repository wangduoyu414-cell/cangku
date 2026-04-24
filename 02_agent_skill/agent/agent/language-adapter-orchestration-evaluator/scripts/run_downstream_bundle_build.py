from __future__ import annotations

from pathlib import Path
import argparse
import json
import subprocess
import sys
from collections import Counter

import yaml


DEFAULT_SKILL_ROOT = Path(r"D:\agent\skill\language-adapter-dataset-builder")
DEFAULT_REPLAY_ROOT = Path(r"D:\diypc\assets\replay")
DEFAULT_GENERATION_ROOT = Path(r"D:\diypc\LLMceshi\full-generation-run")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_yaml(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(payload, allow_unicode=True, sort_keys=False), encoding="utf-8")


def run_bundle_for_pack(skill_root: Path, replay_root: Path, candidate_pack: Path, output_root: Path) -> tuple[int, str]:
    workdir = output_root / candidate_pack.stem
    command = [
        sys.executable,
        str(skill_root / "scripts" / "build_dataset_bundle.py"),
        "--replay-dir",
        str(replay_root),
        "--dataset-version",
        f"{candidate_pack.stem}_dataset_v1",
        "--rule-version-id",
        "published_rule_package_v2",
        "--workdir",
        str(workdir),
        "--candidate-pack",
        str(candidate_pack),
    ]
    result = subprocess.run(command, check=False)
    return result.returncode, str(workdir)


def summarize_bundle(path: Path) -> dict:
    qa_payload = load_json(path / "qa_report.json").get("qa_report", {})
    bundle_payload = load_json(path / "dataset_bundle.json").get("dataset_bundle", {})
    return {
        "bundle_ref": str(path / "dataset_bundle.json"),
        "qa_status": qa_payload.get("status", ""),
        "trainable": bool(bundle_payload.get("meta", {}).get("trainable")),
        "record_count": qa_payload.get("metrics", {}).get("record_count", 0),
        "redline_coverage": qa_payload.get("metrics", {}).get("redline_coverage", 0),
        "trace_source_alignment_rate": qa_payload.get("metrics", {}).get("trace_source_alignment_rate", 0),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="run downstream bundle build（执行下游数据包构建）")
    parser.add_argument("--generation-root", type=Path, default=DEFAULT_GENERATION_ROOT)
    parser.add_argument("--skill-root", type=Path, default=DEFAULT_SKILL_ROOT)
    parser.add_argument("--replay-root", type=Path, default=DEFAULT_REPLAY_ROOT)
    parser.add_argument("--output-root", type=Path)
    args = parser.parse_args()

    generation_root = args.generation_root
    pack_root = generation_root / "packs"
    output_root = args.output_root or (generation_root / "bundles")
    output_root.mkdir(parents=True, exist_ok=True)

    status_counter = Counter()
    qa_counter = Counter()
    failed: list[dict] = []
    completed: list[dict] = []

    for candidate_pack in sorted(pack_root.glob("language_adapter_pack_*.json")):
        return_code, workdir = run_bundle_for_pack(args.skill_root, args.replay_root, candidate_pack, output_root)
        if return_code != 0:
            status_counter.update(["build_failed"])
            failed.append({"pack": candidate_pack.name, "workdir": workdir, "return_code": return_code})
            continue
        summary = summarize_bundle(Path(workdir))
        qa_counter.update([summary["qa_status"] or "unknown"])
        status_counter.update(["build_succeeded"])
        completed.append({"pack": candidate_pack.name, **summary})

    summary_payload = {
        "downstream_bundle_summary": {
            "generation_root": str(generation_root),
            "output_root": str(output_root),
            "total_packs": len(list(pack_root.glob('language_adapter_pack_*.json'))),
            "build_status_counts": dict(status_counter),
            "qa_status_counts": dict(qa_counter),
            "failed_packs": failed,
            "completed_packs": completed,
        }
    }
    dump_yaml(output_root / "bundle-summary.yaml", summary_payload)
    print(f"downstream bundle summary（下游数据包汇总）: {output_root / 'bundle-summary.yaml'}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
