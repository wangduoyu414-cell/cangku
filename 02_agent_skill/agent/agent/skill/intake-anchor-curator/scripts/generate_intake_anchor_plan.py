from __future__ import annotations

from pathlib import Path
import argparse


DEFAULT_BASELINE = Path(r"D:\diypc\docs\核心重写任务04_输入归纳与原话锚点基线.md")


def extract_patterns(text: str) -> list[str]:
    patterns: list[str] = []
    for marker in [
        "预算",
        "用途场景",
        "分辨率",
        "外观方向",
        "静音偏好",
        "机箱尺寸",
        "品牌排除",
        "旧件复用",
        "超频倾向",
        "水冷倾向",
        "电源档位",
    ]:
        if marker in text:
            patterns.append(marker)
    return patterns


def build_output(baseline: Path) -> str:
    text = baseline.read_text(encoding="utf-8")
    patterns = extract_patterns(text)
    lines = [
        "intake_anchor_plan:",
        f'  baseline_ref: "{baseline}"',
        "  high_frequency_patterns:",
    ]
    for item in patterns:
        lines.append(f'    - "{item}"')
    lines.extend(
        [
            "  soft_preference_rules:",
            '    - "最好但不是必须（软偏好表达）保留为 soft preference（软偏好）"',
            '    - "预算能省则省（预算软引导）不得伪造硬上限"',
            "  conflict_candidate_rules:",
            '    - "同轮冲突表达必须输出 conflict_candidates（冲突候选）"',
            "  anchor_binding_rules:",
            '    - "field_key（字段键）必须绑定到具体偏好项"',
            '    - "高频标准表达默认零 LLM（大语言模型） 调用"',
            "  supplemental_parser_rules:",
            '    - "每轮最多一次 supplemental parse（补解析）"',
            '    - "补解析只返回结构化增量与锚点，不改写状态真相"',
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="generate intake anchor plan（生成输入锚点方案）")
    parser.add_argument("--baseline", type=Path, default=DEFAULT_BASELINE)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    content = build_output(args.baseline)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")
    print(f"generated（已生成）: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
