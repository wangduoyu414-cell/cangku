from __future__ import annotations

from pathlib import Path
import argparse
import json


DEFAULT_SUITE_DIR = Path(r"D:\diypc\assets\replay_suite_default")


def build_output(suite_dir: Path) -> str:
    suite_meta = json.loads((suite_dir / "_suite.json").read_text(encoding="utf-8"))
    fixtures = sorted([p for p in suite_dir.glob("*.json") if p.name != "_suite.json"])
    thresholds = suite_meta.get("thresholds", {})

    lines = [
        "replay_eval_plan:",
        f'  suite_root: "{suite_dir}"',
        f'  suite_id: "{suite_meta.get("suite_id", "")}"',
        "  suite_targets:",
    ]
    for fixture in fixtures:
        lines.append(f'    - "{fixture.name}"')
    lines.extend(
        [
            "  diff_dimensions:",
            '    - "action_diff（动作差异）"',
            '    - "primary_recommendation_diff（主推差异）"',
            '    - "push_type_diff（推送类型差异）"',
            '    - "should_push_diff（是否推送差异）"',
            '    - "evidence_strength_diff（证据等级差异）"',
            "  quality_thresholds:",
        ]
    )
    for key, value in thresholds.items():
        lines.append(f'    - "{key}（阈值键）: {value}"')
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="generate replay plan（生成回放方案）")
    parser.add_argument("--suite-dir", type=Path, default=DEFAULT_SUITE_DIR)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    content = build_output(args.suite_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")
    print(f"generated（已生成）: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
