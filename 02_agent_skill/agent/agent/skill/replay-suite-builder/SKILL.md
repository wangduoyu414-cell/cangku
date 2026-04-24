---
name: replay-suite-builder
description: 服务 `D:\diypc（项目根目录）` 的 `replay suite builder（回放集构建器）`，负责把新核心回放样例、差异维度与质量阈值绑定到 `task 13（任务13）`。
---

# replay-suite-builder（回放集构建器）

## Design Goal

- 稳定输出“回放样例扩充建议、差异维度清单、质量阈值绑定”的回放集方案，服务 `task 13（任务13）`。
- 优先保证新核心回放集、差异维度和质量阈值的可追溯性，不扩展为旧回放兼容器或完整回放执行器。

## Boundary / Invariants

- 只负责回放集构建方案，不接管实际回放执行。
- 不允许用旧 `replayd（旧回放进程）` 样例替代新核心正式回放集。
- 输出必须显式绑定新核心回放集、差异维度和质量阈值。
- 脚本入口、新核心回放集引用与差异维度列表属于稳定内核，升级时默认不可轻删。
- 若缺少回放集资产或任务 13 基线，应停在缺失信息提示，不伪造正式回放方案。

## Overview

面向 `task 13（任务13）` 输出回放样例与差异分析方案。

## Trigger / Non-Trigger

### Trigger

- 用户要求输出回放样例扩充建议、差异维度或质量阈值绑定。
- 用户要求把新核心回放样例、差异维度与质量阈值绑定到 `task 13（任务13）`。
- 用户已经在 `D:\diypc（项目根目录）` 内处理回放集方案，并需要稳定结果。

### Non-Trigger

- 纯回放执行、纯指标采集或旧回放兼容性复用请求。
- 不涉及回放集目标、差异维度或质量阈值的通用文档整理请求。
- 没有回放集资产，却要求直接给出正式回放结论的请求。

## Workflow

1. 先确认任务仍在 `D:\diypc（项目根目录）` 的回放集构建范围内。
2. 读取 `references/baseline-links.md`，确认绑定范围、服务任务和项目资产。
3. 检查是否具备 `D:\diypc\docs\核心重写任务13_回放评测发布门禁.md` 与 `D:\diypc\assets\replay_suite_default`。
4. 若输入足够，调用 `scripts/generate_replay_plan.py（生成回放方案脚本）` 生成输出骨架。
5. 校对输出是否显式包含回放集目标、差异维度和质量阈值。

## Resource Routing

- `references/baseline-links.md`：用于确认绑定范围、服务任务和项目资产；触发后默认先读。
- `scripts/generate_replay_plan.py`：当需要稳定生成回放方案时运行。
- `examples/generated-plan.yaml`：用于校准脚本生成后的目标形态。
- `examples/sample-output.yaml`：用于校准最小输出骨架。
- `evals/trigger/core.yaml`、`evals/task/core.yaml`、`evals/regression/core.yaml`、`evals/upgrade/core.yaml`：用于正式门禁和升级治理。

## Critical Rules

- 不允许用旧 `replayd（旧回放进程）` 样例替代新核心正式回放集。
- 输出必须显式绑定新核心回放集、差异维度和质量阈值。
- 不把回放集构建器扩展成回放执行器或旧回放兼容器。

## Validation

- 检查输出是否存在 `replay_eval_plan` 主结构。
- 检查是否显式列出 `suite_targets`。
- 检查是否显式列出 `diff_dimensions`。
- 检查是否显式列出 `quality_thresholds`。
- 检查是否没有把旧 `replayd（旧回放进程）` 样例作为新核心正式回放集。

## Output Contract

- 主交付物是回放方案。
- 输出至少覆盖：
  - 回放样例扩充建议
  - 差异维度清单
  - 质量阈值绑定
- 默认不负责执行回放、采集运行时指标或替代正式回放门禁。

## Failure Handling / Escalation

- 缺少回放集资产或任务 13 基线时，停止并说明缺失项。
- 如果请求已经变成完整回放执行、旧回放兼容或运行时指标采集，退出本 `Skill` 边界。

## Upgrade Policy

- 稳定内核：新核心回放集引用、差异维度、质量阈值、旧回放样例不可替代红线。
- 可收缩脚手架：解释性补充文本和低频占位说明。
- 升级时必须重跑触发、任务、回归与升级评测，不先删旧规则。
