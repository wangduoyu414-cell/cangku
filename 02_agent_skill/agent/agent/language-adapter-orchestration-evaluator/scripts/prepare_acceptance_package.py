from __future__ import annotations

from pathlib import Path
import argparse

import yaml


DEFAULT_RUN_ROOT = Path(r"D:\diypc\LLMceshi\full-generation-run")
DEFAULT_OUTPUT_ROOT = Path(r"D:\diypc\LLMceshi\acceptance-package")


def load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def dump_yaml(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(payload, allow_unicode=True, sort_keys=False), encoding="utf-8")


def greedy_select_packs(pack_plan: list[dict], limit: int) -> list[dict]:
    remaining = list(pack_plan)
    selected: list[dict] = []
    covered_scenes: set[str] = set()
    covered_personas: set[str] = set()
    covered_needs: set[str] = set()
    covered_difficulties: set[str] = set()

    while remaining and len(selected) < limit:
        best = None
        best_score = -1
        for pack in remaining:
            scene_gain = len({item["scene_family"] for item in pack.get("required_cases", [])} - covered_scenes)
            persona_gain = len(set(pack.get("required_personas", [])) - covered_personas)
            need_gain = len(set(pack.get("required_need_axes", [])) - covered_needs)
            difficulty_gain = len(set(pack.get("required_difficulty_axes", [])) - covered_difficulties)
            score = scene_gain * 5 + persona_gain * 3 + need_gain * 2 + difficulty_gain
            if score > best_score:
                best_score = score
                best = pack
        if best is None:
            break
        selected.append(best)
        remaining.remove(best)
        covered_scenes.update(item["scene_family"] for item in best.get("required_cases", []))
        covered_personas.update(best.get("required_personas", []))
        covered_needs.update(best.get("required_need_axes", []))
        covered_difficulties.update(best.get("required_difficulty_axes", []))
    return selected


def build_acceptance_manifest(run_root: Path, limit: int) -> dict:
    manifest = load_yaml(run_root / "generated-run-manifest.yaml")["run_manifest"]
    bundle_summary = load_yaml(run_root / "bundles" / "bundle-summary.yaml")["downstream_bundle_summary"]
    bundle_index = {
        item["pack"].replace(".json", ""): item
        for item in bundle_summary.get("completed_packs", [])
    }

    selected = greedy_select_packs(manifest.get("pack_plan", []), limit)
    acceptance_entries = []
    for pack in selected:
        bundle_name = pack["pack_id"]
        bundle_info = bundle_index.get(bundle_name, {})
        bundle_root = run_root / "bundles" / bundle_name
        acceptance_entries.append(
            {
                "pack_id": bundle_name,
                "target_item_count": pack.get("target_item_count", 0),
                "scene_families": [item["scene_family"] for item in pack.get("required_cases", [])],
                "required_personas": pack.get("required_personas", []),
                "required_need_axes": pack.get("required_need_axes", []),
                "required_difficulty_axes": pack.get("required_difficulty_axes", []),
                "bundle_ref": bundle_info.get("bundle_ref", str(bundle_root / "dataset_bundle.json")),
                "qa_ref": str(bundle_root / "qa_report.json"),
                "formalization_ref": str(bundle_root / "formalization_report.json"),
                "validated_ref": str(bundle_root / "validated_supplement.json"),
                "task_index_ref": str(bundle_root / "task_datasets" / "task_dataset_index.json"),
                "qa_status": bundle_info.get("qa_status", ""),
                "trainable": bundle_info.get("trainable", False),
                "trace_source_alignment_rate": bundle_info.get("trace_source_alignment_rate", 0),
            }
        )

    return {
        "acceptance_package": {
            "run_root": str(run_root),
            "selection_size": len(acceptance_entries),
            "selection_method": "greedy set cover（贪心覆盖） over scene（场景）, persona（人群）, need（需求）, difficulty（难点）",
            "entries": acceptance_entries,
            "manual_checks": [
                "检查 comparison_explanation（主备比较解释） 是否真的只解释主备差异、风险、代价与条件变化",
                "检查 safety_refusal（安全拒答） 是否只覆盖装机域相邻红线，而不是泛化通用安全语料",
                "检查 trace_refs（追踪引用） 是否确实回指真实 replay（回放） 文件",
                "检查 label_rule（标注补充规则） 是否只作为补解析/标注规则承载，而不是变相做决策",
                "检查不同 pack（批次包） 是否确实覆盖不同业务场景族，而不是换壳重复",
            ],
        }
    }


def build_markdown(manifest: dict) -> str:
    package = manifest["acceptance_package"]
    lines = [
        "# Acceptance Package（验收包）",
        "",
        f"- `run_root（运行根目录）`: `{package['run_root']}`",
        f"- `selection_size（抽样数量）`: `{package['selection_size']}`",
        f"- `selection_method（抽样方法）`: {package['selection_method']}",
        "",
        "## Manual Checks（人工检查点）",
    ]
    for item in package["manual_checks"]:
        lines.append(f"- {item}")
    lines.append("")
    lines.append("## Selected Packs（抽样批次）")
    for entry in package["entries"]:
        lines.extend(
            [
                f"### `{entry['pack_id']}`",
                f"- `scene_families（场景族）`: {', '.join(entry['scene_families'])}",
                f"- `required_personas（人群）`: {', '.join(entry['required_personas'])}",
                f"- `required_need_axes（需求轴）`: {', '.join(entry['required_need_axes'])}",
                f"- `required_difficulty_axes（难点轴）`: {', '.join(entry['required_difficulty_axes'])}",
                f"- `qa_status（门禁状态）`: `{entry['qa_status']}`",
                f"- `trainable（可训练）`: `{entry['trainable']}`",
                f"- `trace_source_alignment_rate（追踪来源对齐率）`: `{entry['trace_source_alignment_rate']}`",
                f"- `bundle_ref（数据包）`: `{entry['bundle_ref']}`",
                f"- `qa_ref（门禁报告）`: `{entry['qa_ref']}`",
                f"- `formalization_ref（正式化报告）`: `{entry['formalization_ref']}`",
                f"- `validated_ref（已验证补充）`: `{entry['validated_ref']}`",
                f"- `task_index_ref（任务索引）`: `{entry['task_index_ref']}`",
                "",
            ]
        )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="prepare acceptance package（准备验收包）")
    parser.add_argument("--run-root", type=Path, default=DEFAULT_RUN_ROOT)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    payload = build_acceptance_manifest(args.run_root, args.limit)
    args.output_root.mkdir(parents=True, exist_ok=True)
    dump_yaml(args.output_root / "acceptance-manifest.yaml", payload)
    (args.output_root / "acceptance-summary.md").write_text(build_markdown(payload), encoding="utf-8")
    print(f"acceptance package（验收包）: {args.output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
