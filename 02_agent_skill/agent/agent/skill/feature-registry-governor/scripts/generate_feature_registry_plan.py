from __future__ import annotations

from pathlib import Path
import argparse
import json


DEFAULT_REGISTRY = Path(r"D:\diypc\assets\templates\core_feature_registry_v1.json")


def build_output(registry_path: Path) -> str:
    payload = json.loads(registry_path.read_text(encoding="utf-8"))
    features = payload.get("features", [])

    lines = [
        "feature_registry_plan:",
        "  registry_refs:",
        f'    - "{registry_path}"',
        "  version_constraints:",
        f'    - "feature_registry_version_id（特征注册表版本标识）: {payload.get("feature_registry_version_id", "")}"',
        f'    - "schema_version（模式版本）: {payload.get("schema_version", "")}"',
        "  registered_features:",
    ]
    for feature in features:
        lines.append(
            f'    - "{feature.get("feature_key", "")}（特征键）: {feature.get("value_type", "")}"'
        )
    lines.append('  governance_notes:')
    lines.append('    - "未登记特征不得进入正式规则包"')
    lines.append('    - "规则包必须声明兼容的特征注册表版本"')
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="generate feature registry plan（生成特征注册表方案）")
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    content = build_output(args.registry)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")
    print(f"generated（已生成）: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
