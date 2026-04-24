---
name: language-scope-dataset-designer
description: 服务 `D:\diypc（项目根目录）` 的 `language scope dataset designer（语言窄口样本设计器）`，负责只为低置信补解析、复杂解释润色、安全拒答设计受限样本与边界，不触碰决策能力。
---

# language-scope-dataset-designer（语言窄口样本设计器）

## Design Goal

- 稳定输出“允许样本范围、禁止样本范围、与证据模板和原话锚点的绑定要求”的语言窄口方案，服务 `task 10（任务10）`。
- 优先保证语言样本边界受控，不扩展为排序、推送、证据事实或状态真相相关能力设计。

## Boundary / Invariants

- 只负责语言窄口样本设计，不接管决策能力。
- 不允许设计排序、推送、证据事实、状态真相相关训练样本。
- 任何自然语言输出都必须可追溯到模板或证据包。
- 标准推荐结果优先模板，不走 `LLM（大语言模型）`。
- 脚本入口和上述禁止范围属于稳定内核，升级时默认不可轻删。

## Overview

面向 `task 10（任务10）` 输出语言窄口可用样本与禁止范围说明。

## Trigger / Non-Trigger

### Trigger

- 用户要求输出语言窄口允许范围、禁止范围或证据绑定要求。
- 用户要求为低置信补解析、复杂解释润色或安全拒答设计受限样本。
- 用户已经在 `D:\diypc（项目根目录）` 内处理语言窄口方案，并需要稳定样本边界说明。

### Non-Trigger

- 纯排序、推送、证据事实生成、规则裁决或状态真相维护请求。
- 不涉及允许/禁止范围的通用文档整理请求。
- 没有语言窄口上下文，却要求直接设计完整决策样本的请求。

## Workflow

1. 先确认任务仍在 `D:\diypc（项目根目录）` 的语言窄口样本设计范围内。
2. 读取 `references/baseline-links.md`，确认绑定范围、服务任务和项目资产。
3. 检查是否具备 `D:\diypc\核心模块重写总任务书.md` 与语言窄口相关项目资产引用。
4. 若输入足够，调用 `scripts/generate_language_scope_plan.py（生成语言窄口方案脚本）` 生成输出骨架。
5. 校对输出是否显式包含允许范围、禁止范围和证据绑定规则。

## Resource Routing

- `references/baseline-links.md`：用于确认绑定范围、服务任务和项目资产；触发后默认先读。
- `scripts/generate_language_scope_plan.py`：当需要稳定生成语言窄口方案时运行。
- `examples/generated-plan.yaml`：用于校准脚本生成后的目标形态。
- `examples/sample-output.yaml`：用于校准最小输出骨架。
- `evals/trigger/core.yaml`、`evals/task/core.yaml`、`evals/regression/core.yaml`、`evals/upgrade/core.yaml`：用于正式门禁和升级治理。

## Critical Rules

- 不允许设计排序、推送、证据事实、状态真相相关训练样本。
- 任何自然语言输出都必须可追溯到模板或证据包。
- 标准推荐结果优先模板，不走 `LLM（大语言模型）`。
- 不把语言窄口样本设计器扩展成完整决策器或推送器。

## Validation

- 检查输出是否存在 `language_scope_plan` 主结构。
- 检查是否显式列出 `allowed_scope`。
- 检查是否显式列出 `forbidden_scope`。
- 检查是否显式列出 `grounding_rules`。
- 检查是否没有越界到排序、推送、证据事实或状态真相样本设计。

## Output Contract

- 主交付物是语言窄口样本方案。
- 输出至少覆盖：
  - 允许样本范围
  - 禁止样本范围
  - 与证据模板、原话锚点的绑定要求
- 默认不负责生成完整决策逻辑或训练策略实现。

## Failure Handling / Escalation

- 缺少总任务书或语言窄口上下文时，停止并说明缺失项。
- 如果请求已经变成排序、推送、证据事实生成、状态真相维护或完整决策设计，退出本 `Skill` 边界。

## Upgrade Policy

- 稳定内核：允许范围、禁止范围、证据绑定规则、标准推荐优先模板、不走 `LLM（大语言模型）` 的约束。
- 可收缩脚手架：解释性补充文本和低频占位说明。
- 升级时必须重跑触发、任务、回归与升级评测，不先删旧规则。
