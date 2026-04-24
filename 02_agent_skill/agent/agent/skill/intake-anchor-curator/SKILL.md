---
name: intake-anchor-curator
description: 服务 `D:\diypc（项目根目录）` 的 `intake anchor curator（输入锚点整理器）`，负责把高频表达、软偏好、冲突候选与原话锚点方案绑定到 `task 04（任务04）`。
---

# intake-anchor-curator（输入锚点整理器）

## Design Goal

- 稳定输出“高频表达模式、软偏好规则、冲突候选规则、锚点绑定规则”的输入归纳方案，服务 `task 04（任务04）`。
- 优先保证高频标准表达的结构化处理和原话锚点绑定，不扩展为完整对话决策器或状态推理器。

## Boundary / Invariants

- 只负责输入归纳与原话锚点服务方案，不接管完整任务执行。
- 不允许高频标准表达默认走 `LLM（大语言模型）`。
- 补解析每轮最多一次，且只返回结构化增量与锚点，不改写状态真相。
- 输出必须显式包含高频表达、软偏好、冲突候选和锚点绑定四类对象。
- 脚本入口和高频标准表达零 `LLM（大语言模型）` 调用规则属于稳定内核，升级时默认不可轻删。

## Overview

面向 `task 04（任务04）` 输出输入归纳与原话锚点服务方案。

## Trigger / Non-Trigger

### Trigger

- 用户要求输出高频表达模式、软偏好规则、冲突候选规则或锚点绑定规则。
- 用户要求把输入归纳与原话锚点方案绑定到 `task 04（任务04）`。
- 用户已经在 `D:\diypc（项目根目录）` 内处理输入归纳与锚点方案，并需要稳定产物。

### Non-Trigger

- 纯运行时状态决策、对话策略或完整任务执行请求。
- 不涉及高频表达、软偏好、冲突候选或锚点绑定的通用文档整理请求。
- 没有输入基线，却要求直接生成完整输入真相或最终状态的请求。

## Workflow

1. 先确认任务仍在 `D:\diypc（项目根目录）` 的输入归纳与原话锚点范围内。
2. 读取 `references/baseline-links.md`，确认绑定范围、服务任务和项目资产。
3. 检查是否具备 `D:\diypc\docs\核心重写任务04_输入归纳与原话锚点基线.md`。
4. 若输入足够，调用 `scripts/generate_intake_anchor_plan.py（生成输入锚点方案脚本）` 生成输出骨架。
5. 校对输出是否显式包含高频表达、软偏好、冲突候选、锚点绑定和补解析规则。

## Resource Routing

- `references/baseline-links.md`：用于确认绑定范围、服务任务和项目资产；触发后默认先读。
- `scripts/generate_intake_anchor_plan.py`：当需要稳定生成输入锚点方案时运行。
- `examples/generated-plan.yaml`：用于校准脚本生成后的目标形态。
- `examples/sample-output.yaml`：用于校准最小输出骨架。
- `evals/trigger/core.yaml`、`evals/task/core.yaml`、`evals/regression/core.yaml`、`evals/upgrade/core.yaml`：用于正式门禁和升级治理。

## Critical Rules

- 不允许高频标准表达默认走 `LLM（大语言模型）`。
- 同轮冲突表达必须输出 `conflict_candidates（冲突候选）`。
- `field_key（字段键）` 必须绑定到具体偏好项。
- 不把输入锚点整理器扩展成完整状态推理器或对话决策器。

## Validation

- 检查输出是否存在 `intake_anchor_plan` 主结构。
- 检查是否显式列出 `high_frequency_patterns`。
- 检查是否显式列出 `soft_preference_rules`、`conflict_candidate_rules` 与 `anchor_binding_rules`。
- 检查是否保留“高频标准表达默认零 `LLM（大语言模型）` 调用”的规则。

## Output Contract

- 主交付物是输入锚点方案。
- 输出至少覆盖：
  - 高频表达模式清单
  - 软偏好规则
  - 冲突候选规则
  - 锚点绑定规则
- 默认不负责生成最终状态、完整策略或运行时代码。

## Failure Handling / Escalation

- 缺少输入基线时，停止并说明缺失项。
- 如果请求已经变成运行时状态推理、完整对话策略或任务执行，退出本 `Skill` 边界。

## Upgrade Policy

- 稳定内核：高频表达模式、软偏好、冲突候选、锚点绑定、补解析规则、高频标准表达零 `LLM（大语言模型）` 调用约束。
- 可收缩脚手架：解释性补充文本和低频占位说明。
- 升级时必须重跑触发、任务、回归与升级评测，不先删旧规则。
