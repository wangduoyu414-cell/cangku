#!/usr/bin/env python3
"""Run lightweight trigger evals for skill-generator（技能生成器）."""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import sys

import yaml


POSITIVE_TERMS = {
    "skill": 2,
    "技能": 2,
    "重复": 2,
    "repeated": 2,
    "recurring": 2,
    "upgrade": 2,
    "升级": 2,
    "failure": 2,
    "失败": 2,
    "eval": 1,
    "评测": 1,
    "回归": 1,
    "model": 1,
    "升模": 2,
    "长期复用": 2,
    "baseline": 1,
    "基线": 1,
    "模板": 1,
    "验证": 1,
    "回滚": 1,
    "playbook": 1,
}

NEGATIVE_TERMS = {
    "一次性": 3,
    "one-off": 3,
    "summary": 2,
    "总结": 2,
    "brainstorm": 2,
    "文案": 2,
    "copywriting": 2,
    "修一下": 2,
    "bug": 2,
    "架构": 2,
}


def load_yaml(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"YAML root must be a mapping: {path}")
    return data


def read_description(skill_dir: Path) -> str:
    skill_md = skill_dir / "SKILL.md"
    content = skill_md.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        raise ValueError("Invalid SKILL.md frontmatter.")
    frontmatter = yaml.safe_load(match.group(1))
    if not isinstance(frontmatter, dict) or "description" not in frontmatter:
        raise ValueError("SKILL.md frontmatter missing description.")
    return str(frontmatter["description"])


def predict(prompt: str, description: str) -> tuple[bool, int, int]:
    _ = description
    text = prompt.lower()
    positive = sum(weight for term, weight in POSITIVE_TERMS.items() if term.lower() in text)
    negative = sum(weight for term, weight in NEGATIVE_TERMS.items() if term.lower() in text)
    return positive >= 3 and positive > negative, positive, negative


def confusion(expected: bool, actual: bool) -> str:
    if expected and actual:
        return "tp"
    if expected and not actual:
        return "fn"
    if not expected and actual:
        return "fp"
    return "tn"


def ratio(numerator: int, denominator: int) -> float:
    return 0.0 if denominator == 0 else round(numerator / denominator, 4)


def configure_streams() -> None:
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")


def main() -> int:
    configure_streams()
    parser = argparse.ArgumentParser(description="Run trigger evals for a skill.")
    parser.add_argument("trigger_file", help="Path to trigger-evals.yaml.")
    parser.add_argument("--skill-dir", required=True, help="Skill directory containing SKILL.md.")
    parser.add_argument("--output", help="Optional YAML output path.")
    args = parser.parse_args()

    trigger_file = Path(args.trigger_file).resolve()
    skill_dir = Path(args.skill_dir).resolve()
    trigger_data = load_yaml(trigger_file)
    description = read_description(skill_dir)

    results = []
    tp = fp = fn = tn = 0

    for expected_key, expected_value in (("should_trigger", True), ("should_not_trigger", False)):
        for case in trigger_data.get("cases", {}).get(expected_key, []):
            prompt = case["prompt"]
            actual, positive_score, negative_score = predict(prompt, description)
            bucket = confusion(expected_value, actual)
            if bucket == "tp":
                tp += 1
            elif bucket == "fp":
                fp += 1
            elif bucket == "fn":
                fn += 1
            else:
                tn += 1
            results.append(
                {
                    "id": case["id"],
                    "expected": expected_value,
                    "actual": actual,
                    "bucket": bucket,
                    "positive_score": positive_score,
                    "negative_score": negative_score,
                    "reason": case.get("reason", ""),
                }
            )

    precision = ratio(tp, tp + fp)
    recall = ratio(tp, tp + fn)
    summary = {
        "precision": precision,
        "recall": recall,
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "results": results,
    }

    output_text = yaml.safe_dump(summary, allow_unicode=True, sort_keys=False)
    if args.output:
        Path(args.output).write_text(output_text, encoding="utf-8")
    else:
        print(output_text, end="")
    return 0


if __name__ == "__main__":
    sys.exit(main())
