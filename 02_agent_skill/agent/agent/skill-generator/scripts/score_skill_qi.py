#!/usr/bin/env python3
"""Score a skill package using the SKILL-QI weighting model."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

import yaml


DIMENSIONS = [
    ("scope_and_signal", "Scope & Signal（边界与信号）", 25),
    ("knowledge_packaging", "Knowledge Packaging（知识封装）", 15),
    ("instruction_to_action", "Instruction-to-Action（指令到行动）", 20),
    ("limits_and_interfaces", "Limits & Interfaces（限制与接口）", 20),
    ("learning_and_lift", "Learning & Lift（学习闭环与增益）", 20),
]

HARD_GATES = {
    "scope_and_signal": 4,
    "instruction_to_action": 4,
}


def load_yaml(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError("Input must be a YAML mapping.")
    return data


def release_recommendation(total: int, ready: bool) -> str:
    if ready and total >= 85:
        return "production-ready（可正式使用）"
    if total >= 70:
        return "beta（测试版）"
    return "draft（草稿版）"


def render_report(skill_name: str, scores: dict, hard_checks: dict, total: int, ready: bool) -> str:
    lines = [f"# {skill_name} scorecard（技能评分卡）", "", "## Summary（汇总）", ""]
    lines.append(f"- total_score（总分）: {total}/100")
    lines.append(f"- hard_gate_pass（硬门槛通过）: {'yes' if ready else 'no'}")
    lines.append(f"- release_recommendation（发布建议）: {release_recommendation(total, ready)}")
    lines.append("")
    lines.append("## Dimensions（维度）")
    lines.append("")
    for key, label, weight in DIMENSIONS:
        item = scores.get(key, {})
        score = item.get("score", "")
        reason = item.get("reason", "")
        lines.append(f"- {label}: {score}/5, weight（权重） {weight}, reason（原因）: {reason}")
    lines.append("")
    lines.append("## Hard Checks（硬检查）")
    lines.append("")
    for key, value in hard_checks.items():
        lines.append(f"- {key}: {'pass' if value else 'fail'}")
    return "\n".join(lines) + "\n"


def build_summary(skill_name: str, scores: dict, hard_checks: dict, total: int, ready: bool) -> dict:
    summary = {
        "skill_name": skill_name,
        "total_score": total,
        "hard_gate_pass": ready,
        "release_recommendation": release_recommendation(total, ready),
        "dimensions": {},
        "hard_checks": hard_checks,
    }
    for key, label, weight in DIMENSIONS:
        item = scores.get(key, {})
        summary["dimensions"][key] = {
            "label": label,
            "weight": weight,
            "score": item.get("score"),
            "reason": item.get("reason", ""),
        }
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Score SKILL-QI from a YAML input file.")
    parser.add_argument("input_file", help="YAML file with scores and hard checks.")
    parser.add_argument("--output", help="Optional output markdown path.")
    parser.add_argument("--summary-output", help="Optional output YAML summary path.")
    args = parser.parse_args()

    data = load_yaml(Path(args.input_file))
    skill_name = data.get("skill_name", "unnamed-skill")
    scores = data.get("scores", {})
    hard_checks = data.get("hard_checks", {})
    if not isinstance(scores, dict) or not isinstance(hard_checks, dict):
        raise ValueError("scores and hard_checks must both be mappings.")

    total = 0
    hard_gate_pass = True

    for key, _label, weight in DIMENSIONS:
        item = scores.get(key, {})
        if not isinstance(item, dict) or "score" not in item:
            raise ValueError(f"Missing score block for dimension: {key}")
        score = item["score"]
        if not isinstance(score, int) or score < 1 or score > 5:
            raise ValueError(f"Score for {key} must be an integer between 1 and 5.")
        total += round((score / 5) * weight)
        if key in HARD_GATES and score < HARD_GATES[key]:
            hard_gate_pass = False

    for key, value in hard_checks.items():
        if not isinstance(value, bool):
            raise ValueError(f"Hard check {key} must be true/false.")
        if not value:
            hard_gate_pass = False

    report = render_report(skill_name, scores, hard_checks, total, hard_gate_pass)
    summary = build_summary(skill_name, scores, hard_checks, total, hard_gate_pass)

    if args.output:
        output_path = Path(args.output)
        output_path.write_text(report, encoding="utf-8")
    else:
        print(report, end="")

    if args.summary_output:
        summary_path = Path(args.summary_output)
        summary_path.write_text(yaml.safe_dump(summary, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
