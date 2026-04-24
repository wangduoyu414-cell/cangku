---
name: release-gate-auditor
description: 服务 `D:\diypc（项目根目录）` 的 `release gate auditor（发布门禁审计器）`，负责把规则包、回放报告与正式门禁阻断点关联起来。
---

# release-gate-auditor（发布门禁审计器）

## Design Goal

- 稳定输出“发布门禁影响、必需报告、阻断风险”的审计说明，服务 `task 03（任务03）`、`task 13（任务13）`、`task 14（任务14）`。
- 优先保证回放进程、发布进程和门禁阻断点的可追溯性，不扩展为完整发布执行器或运行时指标采集器。

## Boundary / Invariants

- 只负责发布门禁审计与阻断面说明，不接管实际发布流程执行。
- 不允许建议跳过 `corereplay（核心回放进程）` 或 `rulepublish（规则发布进程）`。
- 不允许把 `replayd（旧回放进程）` 当作新核心正式门禁。
- 输出必须显式绑定门禁维度、必需报告和阻断风险。
- 脚本入口和上述阻断红线属于稳定内核，升级时默认不可轻删。

## Overview

输出发布门禁影响与阻断面说明，服务 `task 03（任务03）`、`task 13（任务13）`、`task 14（任务14）`。

## Trigger / Non-Trigger

### Trigger

- 用户要求输出发布门禁影响说明、报告要求或阻断项列表。
- 用户要求把规则包、回放报告与正式门禁阻断点关联起来。
- 用户已经在 `D:\diypc（项目根目录）` 内处理发布门禁审计，并需要稳定治理结果。

### Non-Trigger

- 纯发布执行、纯运行时指标采集或完整回放系统实现请求。
- 不涉及门禁维度、必需报告或阻断风险的通用文档整理请求。
- 没有规则文档或任务 13 基线，却要求直接生成正式发布结论的请求。

## Workflow

1. 先确认任务仍在 `D:\diypc（项目根目录）` 的发布门禁审计范围内。
2. 读取 `references/baseline-links.md`，确认绑定范围、服务任务和项目资产。
3. 检查是否具备 `D:\diypc\docs\RULES.md` 与 `D:\diypc\docs\核心重写任务13_回放评测发布门禁.md`。
4. 若输入足够，调用 `scripts/generate_release_gate_impact.py（生成发布门禁影响脚本）` 生成输出骨架。
5. 校对输出是否显式包含门禁维度、必需报告和阻断风险。

## Resource Routing

- `references/baseline-links.md`：用于确认绑定范围、服务任务和项目资产；触发后默认先读。
- `scripts/generate_release_gate_impact.py`：当需要稳定生成发布门禁影响方案时运行。
- `examples/generated-plan.yaml`：用于校准脚本生成后的目标形态。
- `examples/sample-output.yaml`：用于校准最小输出骨架。
- `evals/trigger/core.yaml`、`evals/task/core.yaml`、`evals/regression/core.yaml`、`evals/upgrade/core.yaml`：用于正式门禁和升级治理。

## Critical Rules

- 不允许建议跳过 `corereplay（核心回放进程）`。
- 不允许建议跳过 `rulepublish（规则发布进程）`。
- 不允许把 `replayd（旧回放进程）` 当作新核心正式门禁。
- 不把发布门禁审计器扩展成完整发布执行器或运行时采集器。

## Validation

- 检查输出是否存在 `release_gate_impact` 主结构。
- 检查是否显式列出 `gate_dimensions`。
- 检查是否显式列出 `required_reports`。
- 检查是否显式列出 `blocking_risks`。
- 检查是否没有违反核心回放与正式发布进程的阻断红线。

## Output Contract

- 主交付物是发布门禁影响说明。
- 输出至少覆盖：
  - 发布门禁影响说明
  - 报告要求
  - 阻断项列表
- 默认不负责执行发布、绕过门禁或替代回放流程。

## Failure Handling / Escalation

- 缺少规则文档或任务 13 基线时，停止并说明缺失项。
- 如果请求已经变成完整发布执行、回放系统实现或运行时采集，退出本 `Skill` 边界。

## Upgrade Policy

- 稳定内核：门禁维度、必需报告、核心回放/正式发布进程阻断红线。
- 可收缩脚手架：解释性补充文本和低频占位说明。
- 升级时必须重跑触发、任务、回归与升级评测，不先删旧规则。
