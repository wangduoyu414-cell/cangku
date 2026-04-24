from __future__ import annotations

from pathlib import Path
import argparse
import json


DEFAULT_WORKBOOK_JSON = Path(r"D:\diypc\assets\templates\core_rule_workbook_v1.json")
DEFAULT_TEMPLATE_XLSX = Path(r"D:\diypc\assets\templates\核心规则维护模板.xlsx")


def build_output(workbook_json: Path, template_xlsx: Path) -> str:
    payload = json.loads(workbook_json.read_text(encoding="utf-8"))
    metadata = payload.get("metadata", {})
    action_rules = payload.get("action_rules", [])
    push_rules = payload.get("push_rules", [])
    templates = payload.get("templates", [])

    workbook_tabs = [
        "00_填写说明",
        "01_目标画像规则表",
        "02_问题策略表",
        "03_派生事实规则表",
        "04_兼容关系规则表",
        "05_硬约束求解规则表",
        "06_优化指标规则表",
        "07_证明与解释规则表",
        "08_字段引用说明",
    ]

    lines = [
        "rule_asset_plan:",
        f'  workbook_template_ref: "{template_xlsx}"',
        f'  workbook_schema_ref: "{workbook_json}"',
        "  workbook_tabs:",
    ]
    for tab in workbook_tabs:
        lines.append(f'    - "{tab}"')
    lines.extend(
        [
            "  workbook_constraints:",
            f'    - "schema_version（模式版本）: {metadata.get("schema_version", "")}"',
            f'    - "workbook_mode（工作簿模式）: {metadata.get("workbook_mode", "")}"',
            f'    - "max_condition_depth（最大条件深度）: {metadata.get("max_condition_depth", "")}"',
            f'    - "max_rule_complexity（最大规则复杂度）: {metadata.get("max_rule_complexity", "")}"',
            "  draft_import_targets:",
            '    - "D:\\diypc\\python_tools\\policy_importer"',
            "  published_pack_targets:",
            '    - "D:\\diypc\\internal\\rules\\compiler"',
            '    - "published rule package（已发布规则包）"',
            "  current_runtime_coverage:",
            f'    - "action_rules（动作规则）: {len(action_rules)}"',
            f'    - "push_rules（推送规则）: {len(push_rules)}"',
            f'    - "templates（模板）: {len(templates)}"',
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="generate rule workbook plan（生成规则工作簿方案）")
    parser.add_argument("--workbook-json", type=Path, default=DEFAULT_WORKBOOK_JSON)
    parser.add_argument("--template-xlsx", type=Path, default=DEFAULT_TEMPLATE_XLSX)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    content = build_output(args.workbook_json, args.template_xlsx)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")
    print(f"generated（已生成）: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
