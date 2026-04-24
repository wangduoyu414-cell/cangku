#!/usr/bin/env python3
"""Generate a populated skill bundle draft from structured raw inputs."""

from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path
import sys

import yaml


def load_yaml(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"YAML root must be a mapping: {path}")
    return data


def bullets(items: list[str], fallback: str) -> list[str]:
    cleaned = [item.strip() for item in items if isinstance(item, str) and item.strip()]
    return cleaned or [fallback]


def write_markdown(path: Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_request(output_dir: Path, payload: dict) -> Path:
    lines = [
        f"# {payload['skill_name']} request（技能请求）",
        "",
        "## Mode（模式）",
        f"- {payload['mode']}",
        "",
        "## Summary（摘要）",
        f"- {payload['request_summary']}",
        "",
        "## Constraints（约束）",
    ]
    lines.extend(f"- {item}" for item in bullets(payload.get("constraints", []), "No explicit constraints（无显式约束）"))
    lines.extend(["", "## Quality Goals（质量目标）"])
    lines.extend(f"- {item}" for item in bullets(payload.get("quality_goals", []), "Produce a reusable and testable skill package（生成可复用可测试的技能包）"))
    path = output_dir / "request.md"
    write_markdown(path, lines)
    return path


def write_skill_brief(output_dir: Path, payload: dict) -> Path:
    lines = [
        f"# {payload['skill_name']} brief（技能简报）",
        "",
        "## Goal（目标）",
        f"- {payload['request_summary']}",
        "",
        "## Scope（边界）",
    ]
    lines.extend(f"- {item}" for item in bullets(payload.get("scope", []), "Clarify the bounded reusable workflow（明确有边界的可复用工作流）"))
    lines.extend(["", "## Non-Scope（非边界）"])
    lines.extend(f"- {item}" for item in bullets(payload.get("non_scope", []), "Do not expand into unrelated repository-wide work（不扩展到无关的仓库级工作）"))
    lines.extend(["", "## Inputs（输入）"])
    lines.extend(f"- {item}" for item in bullets(payload.get("inputs", []), "Repeated requests（重复请求）"))
    lines.extend(["", "## Outputs（输出）"])
    lines.extend(f"- {item}" for item in bullets(payload.get("outputs", []), "Skill bundle（技能包）"))
    lines.extend(["", "## Risks（风险）"])
    lines.extend(f"- {item}" for item in bullets(payload.get("risks", []), "Overfit examples（对样例过拟合）"))
    lines.extend(["", "## Success Bar（成功门槛）"])
    lines.extend(f"- {item}" for item in bullets(payload.get("success_bar", []), "Boundary and eval pack are both explicit（边界与评测包都明确）"))
    path = output_dir / "skill-brief.md"
    write_markdown(path, lines)
    return path


def write_iteration_backlog(output_dir: Path, payload: dict) -> Path:
    backlog = payload.get("iteration_backlog", {})
    lines = [
        f"# {payload['skill_name']} iteration backlog（技能迭代待办）",
        "",
        "## Next Fixes（下一轮修复）",
    ]
    next_fixes = bullets(backlog.get("next_fixes", []), "Add stronger eval coverage（增加更强评测覆盖）")
    for index, item in enumerate(next_fixes, start=1):
        lines.append(f"{index}. {item}")
    lines.extend(["", "## Deferred Work（延后事项）"])
    lines.extend(f"- {item}" for item in bullets(backlog.get("deferred_work", []), "Live telemetry integration（接入实时遥测）"))
    lines.extend(["", "## Why Now（当前优先原因）"])
    lines.extend(f"- {item}" for item in bullets(backlog.get("why_now", []), "Current failures cluster around boundary clarity（当前失败集中在边界清晰度）"))
    path = output_dir / "iteration-backlog.md"
    write_markdown(path, lines)
    return path


def write_baseline(output_dir: Path, payload: dict) -> Path:
    baseline = payload.get("baseline", {})
    quality_delta = baseline.get("quality_delta", {})
    cost_delta = baseline.get("cost_delta", {})
    notes = bullets(baseline.get("notes", []), "Quality gains must remain explainable（质量增益必须可解释）")

    lines = [
        f"# {payload['skill_name']} baseline comparison（技能基线对比）",
        "",
        "## Comparison（对比对象）",
        f"- Candidate（候选版本）: {baseline.get('candidate', payload['skill_name'])}",
        f"- Baseline（基线版本）: {baseline.get('baseline', 'without_skill（不带技能）')}",
        "",
        "## Quality Delta（质量差值）",
        f"- correctness（正确性）: {quality_delta.get('correctness', 'higher')}",
        f"- actionability（可执行性）: {quality_delta.get('actionability', 'higher')}",
        f"- scope_clarity（边界清晰度）: {quality_delta.get('scope_clarity', 'higher')}",
        f"- contract_completeness（契约完整度）: {quality_delta.get('contract_completeness', 'higher')}",
        "",
        "## Cost Delta（成本差值）",
        f"- token_estimate（令牌估算）: {cost_delta.get('token_estimate', 'explained')}",
        f"- wall_clock_estimate（耗时估算）: {cost_delta.get('wall_clock_estimate', 'explained')}",
        f"- tool_call_estimate（工具调用估算）: {cost_delta.get('tool_call_estimate', 'explained')}",
        "",
        "## Notes（说明）",
    ]
    lines.extend(f"- {item}" for item in notes)
    path = output_dir / "baseline-comparison.md"
    write_markdown(path, lines)
    return path


def build_experience_entries(payload: dict) -> list[dict]:
    if payload.get("experience_entries"):
        return payload["experience_entries"]

    repeated = bullets(payload.get("repeated_signals", []), payload["request_summary"])
    failures = bullets(payload.get("failure_feedback", []), "No major failures observed（尚无主要失败）")
    return [
        {
            "id": f"{payload['skill_name']}-{payload['mode']}-001",
            "timestamp": date.today().isoformat(),
            "scenario": payload["mode"],
            "signal": repeated[0],
            "context": bullets(payload.get("constraints", []), "Standard local constraints（标准本地约束）")[0],
            "action": bullets(payload.get("success_patterns", []), "Draft the reusable default path（起草可复用默认路径）")[0],
            "outcome": "success",
            "baseline": "without_skill",
            "quality_delta": "higher",
            "cost_delta": {
                "token_estimate": "slightly_higher",
                "wall_clock_estimate": "similar",
                "tool_call_estimate": "similar",
            },
            "rule_candidate": failures[0],
            "confidence": "repeated-observation",
            "freshness": "stable",
            "affected_dimension": "scope_and_signal",
            "evidence_refs": ["request.md", "baseline-comparison.md"],
            "follow_up": "promote-to-default-path",
        }
    ]


def write_experience_ledger(output_dir: Path, payload: dict) -> Path:
    path = output_dir / "experience-ledger.yaml"
    data = {"entries": build_experience_entries(payload)}
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return path


def write_failure_attribution(output_dir: Path, payload: dict) -> Path | None:
    if payload["mode"] != "iterate":
        return None
    section = payload.get("failure_attribution", {})
    lines = [
        f"# {payload['skill_name']} failure attribution（失败归因）",
        "",
        "## Failure Cluster（失败簇）",
    ]
    lines.extend(f"- {item}" for item in bullets(section.get("failure_cluster", payload.get("failure_feedback", [])), "Repeated failure cluster（重复失败簇）"))
    lines.extend(["", "## Symptoms（症状）"])
    lines.extend(f"- {item}" for item in bullets(section.get("symptoms", []), "Outputs drift away from the intended contract（输出偏离预期契约）"))
    lines.extend(["", "## Affected SKILL-QI Dimensions（受影响维度）"])
    lines.extend(f"- {item}" for item in bullets(section.get("affected_dimensions", []), "Learning & Lift（学习闭环与增益）"))
    lines.extend(["", "## Suspected Root Cause（疑似根因）"])
    lines.extend(f"- {item}" for item in bullets(section.get("suspected_root_cause", []), "Failure examples were not promoted into guardrails（失败样例未升级为护栏）"))
    lines.extend(["", "## Repair Direction（修复方向）"])
    lines.extend(f"- {item}" for item in bullets(section.get("repair_direction", []), "Upgrade repeated failures into guardrails（把重复失败升级为护栏）"))
    path = output_dir / "failure-attribution.md"
    write_markdown(path, lines)
    return path


def write_model_upgrade(output_dir: Path, payload: dict) -> Path | None:
    if payload["mode"] != "model-upgrade":
        return None
    section = payload.get("model_upgrade", {})
    lines = [
        f"# {payload['skill_name']} model upgrade note（升模说明）",
        "",
        "## Stable Core（稳定内核）",
    ]
    lines.extend(f"- {item}" for item in bullets(section.get("stable_core", []), "Keep safety and output contract requirements（保留安全与输出契约要求）"))
    lines.extend(["", "## Model-Sensitive Layer（模型敏感层）"])
    lines.extend(f"- {item}" for item in bullets(section.get("model_sensitive_layer", []), "Reduce step-by-step scaffolding that no longer adds value（缩减不再增值的分步脚手架）"))
    lines.extend(["", "## Removed Scaffolding（已删除脚手架）"])
    lines.extend(f"- {item}" for item in bullets(section.get("removed_scaffolding", []), "Verbose step-by-step hints（冗长分步提示）"))
    lines.extend(["", "## New Misuse Risks（新增误用风险）"])
    lines.extend(f"- {item}" for item in bullets(section.get("new_misuse_risks", []), "Model may over-compress nuanced edge cases（模型可能过度压缩细微边界场景）"))
    path = output_dir / "model-upgrade-note.md"
    write_markdown(path, lines)
    return path


def write_manifest(output_dir: Path, payload: dict, created_files: list[Path]) -> Path:
    path = output_dir / "run-manifest.yaml"
    data = {
        "skill_name": payload["skill_name"],
        "mode": payload["mode"],
        "request_summary": payload["request_summary"],
        "created_at": date.today().isoformat(),
        "created_files": [item.name for item in created_files],
    }
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a populated skill bundle draft from YAML input.")
    parser.add_argument("input_file", help="Structured YAML input.")
    parser.add_argument("output_dir", help="Output directory.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files if present.")
    args = parser.parse_args()

    payload = load_yaml(Path(args.input_file).resolve())
    required_keys = {"skill_name", "mode", "request_summary"}
    missing = [key for key in required_keys if key not in payload]
    if missing:
        raise ValueError(f"Missing required keys: {', '.join(missing)}")

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if any(output_dir.iterdir()) and not args.force:
        raise FileExistsError(f"Output directory is not empty: {output_dir}. Use --force to overwrite.")

    created: list[Path] = []
    created.append(write_request(output_dir, payload))
    created.append(write_skill_brief(output_dir, payload))
    created.append(write_iteration_backlog(output_dir, payload))
    created.append(write_baseline(output_dir, payload))
    created.append(write_experience_ledger(output_dir, payload))
    failure_path = write_failure_attribution(output_dir, payload)
    if failure_path is not None:
        created.append(failure_path)
    upgrade_path = write_model_upgrade(output_dir, payload)
    if upgrade_path is not None:
        created.append(upgrade_path)
    created.append(write_manifest(output_dir, payload, created))

    for path in created:
        print(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
