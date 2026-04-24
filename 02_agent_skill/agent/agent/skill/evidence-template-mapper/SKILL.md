---
name: evidence-template-mapper
description: 服务 `D:\diypc（项目根目录）` 的 `evidence template mapper（证据模板映射器）`，负责把证据来源、证据模板、反事实绑定与任务 `09（任务09）`、`10（任务10）` 对齐。
---

# evidence-template-mapper（证据模板映射器）

## Design Goal

- 稳定输出“证据来源、证据模板映射、反事实绑定”的结构化方案，服务 `task 09（任务09）` 与 `task 10（任务10）`。
- 优先保证证据来源与模板映射的可追溯性，而不是扩展到更大的规则设计、渲染实现或任务编排。

## Boundary / Invariants

- 只负责证据模板与反事实绑定方案，不接管完整任务实现。
- 输出必须显式绑定证据来源，不允许无证据解释。
- 仍以 `D:\diypc\docs\核心规则表格化改造方案.md` 与项目资产为主输入，不改写这些源资产。
- 脚本入口和输出骨架属于稳定资产；升级时默认不可轻删。
- 若缺少证据相关项目资产引用，应停在缺失信息提示，不伪造完整绑定方案。

## Overview

输出证据模板与反事实绑定方案，服务 `task 09（任务09）` 与 `task 10（任务10）`。

## Trigger / Non-Trigger

### Trigger

- 用户要求输出证据来源清单、证据模板映射或反事实绑定说明。
- 用户要求把证据相关项目资产与 `task 09（任务09）`、`task 10（任务10）` 对齐。
- 用户已经在 `D:\diypc（项目根目录）` 内处理证据模板方案，并需要稳定映射结果。

### Non-Trigger

- 纯规则设计、纯渲染实现或完整任务执行请求。
- 不涉及证据来源、模板映射或反事实绑定的通用文档整理请求。
- 没有证据相关资产或输入上下文，却要求直接生成完整解释的请求。

## Workflow

1. 先确认任务仍在 `D:\diypc（项目根目录）` 的证据模板映射范围内。
2. 读取 `references/baseline-links.md`，确认绑定范围、服务任务和项目资产。
3. 检查是否具备 `D:\diypc\docs\核心规则表格化改造方案.md` 与证据相关项目资产引用。
4. 若输入足够，调用 `scripts/generate_evidence_alignment_plan.py（生成证据对齐方案脚本）` 生成输出骨架。
5. 校对输出是否显式包含证据来源、反事实绑定与模板映射关系。

## Resource Routing

- `references/baseline-links.md`：用于确认绑定范围、服务任务和项目资产；触发后默认先读。
- `scripts/generate_evidence_alignment_plan.py`：当需要稳定生成证据对齐方案时运行。
- `examples/generated-plan.yaml`：用于校准脚本生成后的目标形态。
- `examples/sample-output.yaml`：用于校准最小输出骨架。
- `evals/trigger/core.yaml`、`evals/task/core.yaml`、`evals/regression/core.yaml`、`evals/upgrade/core.yaml`：用于正式门禁和升级治理。

## Critical Rules

- 不允许没有证据来源就生成解释。
- 输出必须显式包含证据来源、反事实绑定和模板映射三个核心对象。
- 不把模板映射器扩展成规则设计器、渲染器或总任务编排器。

## Validation

- 检查输出是否存在 `evidence_alignment_plan` 主结构。
- 检查是否显式列出 `evidence_sources`。
- 检查是否显式列出 `counterfactual_bindings`。
- 检查是否没有脱离证据来源单独生成解释。

## Output Contract

- 主交付物是证据模板与反事实绑定方案。
- 输出至少覆盖：
  - 证据来源清单
  - 证据模板映射
  - 反事实绑定说明
- 默认不负责生成完整实现代码或更大范围的任务计划。

## Failure Handling / Escalation

- 缺少证据相关输入或项目资产引用时，停止并说明缺失项。
- 如果请求已经变成完整任务实现、规则设计或渲染逻辑开发，退出本 `Skill` 边界。

## Upgrade Policy

- 稳定内核：证据来源显式绑定、反事实绑定、脚本入口、服务 `task 09/10` 的边界。
- 可收缩脚手架：解释性补充文本和低频占位式说明。
- 升级时必须重跑触发、任务、回归与升级评测，不先删旧规则。
