from __future__ import annotations

from pathlib import Path
import argparse
import json
import math
from collections import Counter

import yaml


DEFAULT_REPLAY_ROOT = Path(r"D:\diypc\assets\replay")
DEFAULT_SKILL_ROOT = Path(r"D:\agent\skill\language-adapter-dataset-builder")
DEFAULT_PROMPT_TEMPLATE = Path(r"D:\diypc\LLMceshi\llm-candidate-pack-prompt-template.md")
DEFAULT_FILL_TEMPLATE = Path(r"D:\diypc\LLMceshi\candidate-pack-fill-template.xlsx")

PAIR_RECIPE = [
    ("comparison_explanation", "hard_case", 0.35),
    ("comparison_explanation", "ambiguous_sample", 0.25),
    ("safety_refusal", "hard_case", 0.20),
    ("safety_refusal", "redline_sample", 0.15),
    ("supplemental_parse", "label_rule", 0.05),
]

SCENE_LAYERS = [
    "需求表达场景",
    "清单理解场景",
    "约束冲突与歧义场景",
    "主备差异说明场景",
    "安全边界场景",
    "真实语言噪声场景",
]

FORBIDDEN_GOAL_SWAPS = [
    "最终配置推荐",
    "配件兼容性裁决",
    "方案排序",
    "购买动作建议",
    "上架/推送时机判断",
    "证据真值生成",
]


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_yaml(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(payload, allow_unicode=True, sort_keys=False), encoding="utf-8")


def scale_recipe(batch_size: int) -> list[dict]:
    raw = []
    for task_type, candidate_type, ratio in PAIR_RECIPE:
        raw_value = batch_size * ratio
        raw.append(
            {
                "task_type": task_type,
                "candidate_type": candidate_type,
                "ratio": ratio,
                "count": math.floor(raw_value),
                "fraction": raw_value - math.floor(raw_value),
            }
        )
    remainder = batch_size - sum(item["count"] for item in raw)
    for item in sorted(raw, key=lambda value: value["fraction"], reverse=True)[:remainder]:
        item["count"] += 1
    return [{"task_type": item["task_type"], "candidate_type": item["candidate_type"], "count": item["count"]} for item in raw]


def parse_replay_case(path: Path) -> dict | None:
    if path.name.startswith("_"):
        return None
    payload = load_json(path)
    patches = payload.get("patches", [])
    slot_values: dict[str, dict] = {}
    for patch in patches:
        for key, value in patch.get("slot_values", {}).items():
            slot_values[key] = value

    domain_keys = {
        "scene",
        "budget",
        "monitor_resolution",
        "noise_sensitivity",
        "case_size",
        "aesthetic",
        "reuse_parts",
        "water_cooling",
    }
    if not any(key in slot_values for key in domain_keys):
        return None

    def slot_value(key: str):
        value = slot_values.get(key, {})
        if "string_value" in value:
            return value["string_value"]
        if "number_value" in value:
            return value["number_value"]
        if "bool_value" in value:
            return value["bool_value"]
        if "string_list" in value:
            return value["string_list"]
        return None

    stem = path.stem
    scene = str(slot_value("scene") or "").strip() or "unknown"
    budget = slot_value("budget")
    resolution = str(slot_value("monitor_resolution") or "").strip()
    noise = str(slot_value("noise_sensitivity") or "").strip()
    case_size = str(slot_value("case_size") or "").strip()
    aesthetic = str(slot_value("aesthetic") or "").strip()
    reuse_parts = slot_value("reuse_parts") or []
    water_cooling = slot_value("water_cooling")

    personas: list[str] = []
    need_axes: list[str] = []
    difficulty_axes: list[str] = []

    if "esports" in stem or (scene == "gaming" and resolution == "1080P"):
        personas.append("电竞/高刷用户")
        need_axes.extend(["用途目标: 电竞/高刷", "分辨率目标: 1080P"])
    if "creator" in stem or (scene == "productivity" and resolution == "4K"):
        personas.append("创作/生产力用户")
        need_axes.extend(["用途目标: 创作/生产力", "分辨率目标: 4K"])
    if "office" in stem or "home" in stem:
        personas.append("家庭/办公稳定用户")
        need_axes.append("用途目标: 家庭/办公")
    if scene == "mixed":
        personas.append("混合用途用户")
        need_axes.append("用途目标: 混合用途")
    if reuse_parts:
        personas.append("复用旧件用户")
        need_axes.append("需求轴: 复用旧件")
        difficulty_axes.append("新装/升级边界不清")
    if noise == "quiet" or "quiet" in stem:
        personas.append("静音/小体积强偏好用户")
        need_axes.append("需求轴: 静音偏好")
    if case_size == "ITX" or "compact" in stem or "itx" in stem.lower():
        personas.append("静音/小体积强偏好用户")
        need_axes.append("需求轴: 体积限制")
    if aesthetic:
        personas.append("外观强偏好用户")
        need_axes.append(f"需求轴: 外观偏好:{aesthetic}")
    if isinstance(budget, (int, float)):
        if budget <= 4000:
            need_axes.append("预算控制: 低预算")
            difficulty_axes.append("预算边界不清")
        elif budget >= 15000:
            need_axes.append("预算控制: 高预算")
        else:
            need_axes.append("预算控制: 中预算")
    if water_cooling is False:
        need_axes.append("需求轴: 禁水冷")

    lower_name = stem.lower()
    if any(token in lower_name for token in ("unsat", "conflict", "incomplete", "denied", "fail", "quarantined")):
        difficulty_axes.extend(["条件冲突", "信息缺失"])
    if "revision" in lower_name:
        difficulty_axes.extend(["前后矛盾", "预算边界不清"])
    if "reuse" in lower_name and "old" in lower_name:
        difficulty_axes.append("信息缺失")
    if "local_model" in lower_name:
        need_axes.append("用途目标: 本地模型/高负载生产力")
    if "showcase" in lower_name:
        need_axes.append("需求轴: 外观展示")
    if "watercooling" in lower_name:
        difficulty_axes.append("偏好过强")

    if not personas:
        if scene == "gaming":
            personas.append("电竞/游戏用户")
            need_axes.append("用途目标: 游戏")
        elif scene == "productivity":
            personas.append("创作/生产力用户")
            need_axes.append("用途目标: 生产力")
        else:
            personas.append("新手首次装机用户")
    if not difficulty_axes:
        difficulty_axes.append("表达模糊")

    return {
        "case_id": payload.get("case_id", stem),
        "replay_ref": str(path),
        "scene_family": stem,
        "display_name": str(payload.get("name", "")).strip(),
        "scene": scene,
        "personas": sorted(dict.fromkeys(personas)),
        "need_axes": sorted(dict.fromkeys(need_axes)),
        "difficulty_axes": sorted(dict.fromkeys(difficulty_axes)),
    }


def load_replay_cases(replay_root: Path) -> list[dict]:
    cases: list[dict] = []
    for path in sorted(replay_root.glob("*.json")):
        item = parse_replay_case(path)
        if item is not None:
            cases.append(item)
    return cases


def rotate(values: list[dict], start: int, size: int) -> list[dict]:
    if not values:
        return []
    return [values[(start + offset) % len(values)] for offset in range(size)]


def aggregate_axes(cases: list[dict], key: str, limit: int) -> list[str]:
    counter: Counter[str] = Counter()
    for item in cases:
        counter.update(item.get(key, []))
    return [name for name, _ in counter.most_common(limit)]


def build_manifest(
    replay_root: Path,
    skill_root: Path,
    prompt_template_ref: Path,
    fill_template_ref: Path,
    total_candidate_goal: int,
    batch_size: int,
) -> dict:
    cases = load_replay_cases(replay_root)
    if not cases:
        raise ValueError("未找到真实 replay（回放） 资产，无法生成运行清单。")
    if total_candidate_goal <= 0 or batch_size <= 0:
        raise ValueError("total_candidate_goal（总候选目标数） 与 batch_size（单批大小） 必须大于 0。")
    if total_candidate_goal % batch_size != 0:
        raise ValueError("当前设计要求总候选目标数必须能被单批大小整除。")

    pack_count = total_candidate_goal // batch_size
    pair_recipe = scale_recipe(batch_size)
    scene_size = min(8, len(cases))
    packs = []
    for index in range(pack_count):
        selected_cases = rotate(cases, index * scene_size, scene_size)
        packs.append(
            {
                "pack_index": index + 1,
                "pack_id": f"language_adapter_pack_{index + 1:03d}",
                "target_item_count": batch_size,
                "expected_mix": pair_recipe,
                "required_cases": [
                    {
                        "case_id": item["case_id"],
                        "scene_family": item["scene_family"],
                        "display_name": item["display_name"],
                        "replay_ref": item["replay_ref"],
                        "personas": item["personas"],
                        "need_axes": item["need_axes"],
                        "difficulty_axes": item["difficulty_axes"],
                    }
                    for item in selected_cases
                ],
                "required_personas": aggregate_axes(selected_cases, "personas", 4),
                "required_need_axes": aggregate_axes(selected_cases, "need_axes", 6),
                "required_difficulty_axes": aggregate_axes(selected_cases, "difficulty_axes", 5),
            }
        )

    scene_counter = Counter(item["scene_family"] for item in cases)
    persona_counter = Counter()
    need_counter = Counter()
    difficulty_counter = Counter()
    for item in cases:
        persona_counter.update(item["personas"])
        need_counter.update(item["need_axes"])
        difficulty_counter.update(item["difficulty_axes"])

    return {
        "run_manifest": {
            "agent_id": "language-adapter-orchestration-evaluator",
            "goal": "围绕真实 replay（回放） 资产持续生成受控候选批次，并把结果接入下层 skill（技能） 校验主链。",
            "generation_guardrails": {
                "domain_statement": "所有候选必须首先服务于理解用户如何表达电脑组装与搭配清单需求，而不是替用户生成最终配置结论。",
                "scene_layers": SCENE_LAYERS,
                "forbidden_goal_swaps": FORBIDDEN_GOAL_SWAPS,
                "scene_coverage_rules": {
                    "min_scene_layers_per_batch": 6,
                    "min_persona_axes_per_batch": 4,
                    "min_need_axes_per_batch": 6,
                    "min_difficulty_axes_per_batch": 5,
                    "max_single_scene_family_share": 0.35,
                },
            },
            "baseline_refs": {
                "replay_root": str(replay_root),
                "skill_root": str(skill_root),
                "prompt_template_ref": str(prompt_template_ref),
                "fill_template_ref": str(fill_template_ref),
                "validate_candidate_pack_script": str(skill_root / "scripts" / "validate_candidate_pack.py"),
                "formalize_script": str(skill_root / "scripts" / "formalize_validated_candidates.py"),
                "qa_script": str(skill_root / "scripts" / "run_dataset_qa.py"),
            },
            "budget": {
                "total_candidate_goal": total_candidate_goal,
                "batch_size": batch_size,
                "pack_count": pack_count,
            },
            "global_expected_mix": pair_recipe,
            "global_scene_pool": {
                "scene_families": sorted(scene_counter.keys()),
                "persona_axes": [name for name, _ in persona_counter.most_common()],
                "need_axes": [name for name, _ in need_counter.most_common()],
                "difficulty_axes": [name for name, _ in difficulty_counter.most_common()],
            },
            "pack_plan": packs,
            "acceptance_rules": {
                "demo_source_allowed": False,
                "ungrounded_trace_allowed": False,
                "validator_rejected_allowed": 0,
                "validator_needs_review_allowed": 0,
                "label_rule_self_check_must_be_rewrite_needed": True,
            },
        }
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="generate run manifest（生成运行清单）")
    parser.add_argument("--replay-root", type=Path, default=DEFAULT_REPLAY_ROOT)
    parser.add_argument("--skill-root", type=Path, default=DEFAULT_SKILL_ROOT)
    parser.add_argument("--prompt-template-ref", type=Path, default=DEFAULT_PROMPT_TEMPLATE)
    parser.add_argument("--fill-template-ref", type=Path, default=DEFAULT_FILL_TEMPLATE)
    parser.add_argument("--total-candidate-goal", type=int, default=60000)
    parser.add_argument("--batch-size", type=int, default=1000)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    payload = build_manifest(
        replay_root=args.replay_root,
        skill_root=args.skill_root,
        prompt_template_ref=args.prompt_template_ref,
        fill_template_ref=args.fill_template_ref,
        total_candidate_goal=args.total_candidate_goal,
        batch_size=args.batch_size,
    )
    dump_yaml(args.output, payload)
    print(f"run manifest（运行清单）: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
