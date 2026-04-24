from __future__ import annotations

from pathlib import Path
import argparse
import json


DEFAULT_FIELD_DICT = Path(r"D:\diypc\assets\compiled\schemas\field_dictionary.json")
DEFAULT_WORKBOOK = Path(r"D:\diypc\电脑配件参数采集规划.xlsx")


def build_output(field_dict: Path, workbook: Path) -> str:
    payload = json.loads(field_dict.read_text(encoding="utf-8"))
    fields = payload.get("fields", [])
    hard_constraint_count = sum(1 for field in fields if field.get("allow_in_hard_constraints"))
    evidence_count = sum(1 for field in fields if field.get("role") == "evidence")
    commerce_count = sum(1 for field in fields if field.get("role") == "commerce")

    lines = [
        "fact_asset_plan:",
        f'  source_workbooks:',
        f'    - "{workbook}"',
        "  fact_version_binding:",
        f'    - "compile_version（编译版本）: {payload.get("compile_version", "")}"',
        f'    - "source_sha256（来源摘要）: {payload.get("source_sha256", "")}"',
        "  field_dictionary_summary:",
        f'    - "field_count（字段总数）: {len(fields)}"',
        f'    - "hard_constraint_fields（可进硬约束字段数）: {hard_constraint_count}"',
        f'    - "evidence_fields（证据字段数）: {evidence_count}"',
        f'    - "commerce_fields（商业字段数）: {commerce_count}"',
        "  field_mapping_notes:",
        '    - "字段必须先进入字段字典，再进入正式事实资产消费路径"',
        '    - "事实资产必须绑定事实摘要版本、价格快照版本与商品目录版本"',
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="generate fact asset plan（生成事实资产方案）")
    parser.add_argument("--field-dict", type=Path, default=DEFAULT_FIELD_DICT)
    parser.add_argument("--workbook", type=Path, default=DEFAULT_WORKBOOK)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    content = build_output(args.field_dict, args.workbook)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")
    print(f"generated（已生成）: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
