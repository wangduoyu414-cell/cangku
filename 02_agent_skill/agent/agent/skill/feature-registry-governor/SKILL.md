---
name: feature-registry-governor
description: 服务 `D:\diypc（项目根目录）` 的 `feature registry governor（特征注册表治理器）`，负责把规则工作簿引用、特征注册表版本约束与已发布规则包兼容性绑定起来。
---

# feature-registry-governor（特征注册表治理器）

## Design Goal

- 稳定输出“特征注册表引用、版本兼容约束、规则包发布影响”的治理方案，服务 `task 03（任务03）`。
- 优先保证注册表版本约束和未登记特征阻断规则的可追溯性，不扩展为运行时特征计算或规则执行实现。

## Boundary / Invariants

- 只负责特征注册表治理与兼容性绑定，不接管运行时特征决策逻辑。
- 不允许未登记特征进入正式规则包。
- 输出必须显式绑定注册表版本与规则包兼容关系。
- 脚本入口、注册表引用和兼容性约束属于稳定内核，升级时默认不可轻删。
- 若缺少注册表资产或规则包上下文，应停在缺失信息提示，不伪造完整治理说明。

## Overview

面向 `task 03（任务03）` 输出特征注册表绑定与兼容性治理说明。

## Trigger / Non-Trigger

### Trigger

- 用户要求输出特征注册表引用清单、版本兼容约束或规则包发布影响。
- 用户要求把规则工作簿引用、特征注册表版本约束与已发布规则包绑定起来。
- 用户已经在 `D:\diypc（项目根目录）` 内处理特征注册表治理，并需要稳定治理结果。

### Non-Trigger

- 纯运行时特征计算、规则执行或推理逻辑请求。
- 不涉及注册表版本、兼容性或未登记特征阻断的通用文档整理请求。
- 没有注册表资产却要求直接给出正式规则兼容性结论的请求。

## Workflow

1. 先确认任务仍在 `D:\diypc（项目根目录）` 的特征注册表治理范围内。
2. 读取 `references/baseline-links.md`，确认绑定范围、服务任务和项目资产。
3. 检查是否具备 `D:\diypc\docs\核心规则表格化改造方案.md` 与 `D:\diypc\assets\templates\core_feature_registry_v1.json`。
4. 若输入足够，调用 `scripts/generate_feature_registry_plan.py（生成特征注册表方案脚本）` 生成输出骨架。
5. 校对输出是否显式包含注册表引用、版本约束、已登记特征与治理说明。

## Resource Routing

- `references/baseline-links.md`：用于确认绑定范围、服务任务和项目资产；触发后默认先读。
- `scripts/generate_feature_registry_plan.py`：当需要稳定生成特征注册表治理方案时运行。
- `examples/generated-plan.yaml`：用于校准脚本生成后的目标形态。
- `examples/sample-output.yaml`：用于校准最小输出骨架。
- `evals/trigger/core.yaml`、`evals/task/core.yaml`、`evals/regression/core.yaml`、`evals/upgrade/core.yaml`：用于正式门禁和升级治理。

## Critical Rules

- 不允许未登记特征进入正式规则包。
- 输出必须显式绑定注册表版本与规则包兼容约束。
- 不把注册表治理器扩展成运行时特征计算器或规则执行器。

## Validation

- 检查输出是否存在 `feature_registry_plan` 主结构。
- 检查是否显式列出 `registry_refs`。
- 检查是否显式列出 `version_constraints`。
- 检查是否显式列出 `registered_features` 或治理说明。
- 检查是否没有让未登记特征直接进入正式规则包。

## Output Contract

- 主交付物是特征注册表治理方案。
- 输出至少覆盖：
  - 注册表引用清单
  - 版本兼容约束
  - 规则包发布影响或治理说明
- 默认不负责生成运行时代码或规则执行逻辑。

## Failure Handling / Escalation

- 缺少注册表资产或规则包上下文时，停止并说明缺失项。
- 如果请求已经变成运行时特征逻辑、规则执行或完整实现开发，退出本 `Skill` 边界。

## Upgrade Policy

- 稳定内核：注册表引用、版本兼容约束、未登记特征阻断、脚本入口。
- 可收缩脚手架：解释性补充文本和低频占位说明。
- 升级时必须重跑触发、任务、回归与升级评测，不先删旧规则。
