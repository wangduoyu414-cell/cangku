from __future__ import annotations

from pathlib import Path
import argparse


DEFAULT_RULES_DOC = Path(r"D:\diypc\docs\RULES.md")
DEFAULT_TASK13_DOC = Path(r"D:\diypc\docs\核心重写任务13_回放评测发布门禁.md")


def build_output(rules_doc: Path, task13_doc: Path) -> str:
    rules_text = rules_doc.read_text(encoding="utf-8")
    task13_text = task13_doc.read_text(encoding="utf-8")

    gate_dims = [
        "回放案例失败",
        "质量阈值越界",
        "静态依赖方向违规",
        "降级策略缺失",
    ]
    if "runtime metrics" in task13_text or "真实运行时指标" in task13_text:
        gate_dims.append("真实运行时指标")
    if "replayd" in rules_text:
        gate_dims.append("过渡期旧回放对照结果")

    lines = [
        "release_gate_impact:",
        f'  rules_ref: "{rules_doc}"',
        f'  task13_ref: "{task13_doc}"',
        "  gate_dimensions:",
    ]
    for dim in gate_dims:
        lines.append(f'    - "{dim}"')
    lines.extend(
        [
            "  required_reports:",
            '    - "replay_report（回放报告）"',
            '    - "release_gate（发布门禁报告）"',
            "  blocking_risks:",
            '    - "不得跳过 corereplay（核心回放进程）"',
            '    - "不得跳过 rulepublish（规则发布进程）"',
            '    - "不得把 replayd（旧回放进程） 当作新核心正式门禁"',
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="generate release gate impact（生成发布门禁影响）")
    parser.add_argument("--rules-doc", type=Path, default=DEFAULT_RULES_DOC)
    parser.add_argument("--task13-doc", type=Path, default=DEFAULT_TASK13_DOC)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    content = build_output(args.rules_doc, args.task13_doc)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")
    print(f"generated（已生成）: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
