from __future__ import annotations

from pathlib import Path
import argparse
import json


DEFAULT_EVIDENCE_CODES = Path(r"D:\diypc\assets\templates\core_rule_evidence_codes_v1.json")
DEFAULT_STYLE_TIERS = Path(r"D:\diypc\assets\templates\core_rule_style_tiers_v1.json")


def build_output(evidence_codes_path: Path, style_tiers_path: Path) -> str:
    evidence_codes = json.loads(evidence_codes_path.read_text(encoding="utf-8"))
    style_tiers = json.loads(style_tiers_path.read_text(encoding="utf-8"))

    lines = [
        "evidence_alignment_plan:",
        "  evidence_sources:",
    ]
    for key, value in evidence_codes.items():
        lines.append(f'    - "{key}（证据码）: {value}"')
    lines.extend(
        [
            "  counterfactual_bindings:",
            '    - "反事实结果必须回接证据包与渲染载荷"',
            "  style_tier_bindings:",
        ]
    )
    for tier in style_tiers:
        lines.append(
            f'    - "{tier.get("tier_id", "")}（风格档位）: rank（排序）={tier.get("rank", "")}"'
        )
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="generate evidence alignment plan（生成证据对齐方案）")
    parser.add_argument("--evidence-codes", type=Path, default=DEFAULT_EVIDENCE_CODES)
    parser.add_argument("--style-tiers", type=Path, default=DEFAULT_STYLE_TIERS)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    content = build_output(args.evidence_codes, args.style_tiers)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")
    print(f"generated（已生成）: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
