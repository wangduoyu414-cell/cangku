from __future__ import annotations

from pathlib import Path
import argparse


DEFAULT_BASELINE = Path(r"D:\diypc\核心模块重写总任务书.md")


def build_output(baseline: Path) -> str:
    text = baseline.read_text(encoding="utf-8")
    allowed_scope = [
        "低置信补解析",
        "复杂解释润色",
        "安全拒答",
    ]
    forbidden_scope = [
        "方案排序",
        "推送时机判断",
        "证据事实生成",
        "规则命中裁决",
        "状态真相维护",
    ]
    lines = [
        "language_scope_plan:",
        f'  baseline_ref: "{baseline}"',
        "  allowed_scope:",
    ]
    for item in allowed_scope:
        if item in text:
            lines.append(f'    - "{item}"')
    lines.append("  forbidden_scope:")
    for item in forbidden_scope:
        lines.append(f'    - "{item}"')
    lines.extend(
        [
            "  grounding_rules:",
            '    - "任何自然语言输出都必须可追溯到模板或证据包"',
            '    - "标准推荐结果优先模板，不走 LLM（大语言模型）"',
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="generate language scope plan（生成语言窄口方案）")
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
