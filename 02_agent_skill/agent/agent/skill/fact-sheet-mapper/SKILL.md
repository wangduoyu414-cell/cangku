---
name: fact-sheet-mapper
description: 服务 `D:\diypc（项目根目录）` 的 `fact sheet mapper（事实表映射器）`，负责把配件事实表、字段字典、事实版本绑定要求映射到正式 `fact assets（事实资产）` 方案中，不定义运行时决策逻辑。
---

# fact-sheet-mapper（事实表映射器）

## Design Goal

- 稳定输出“字段字典映射、事实来源与版本绑定、风险与缺口”的事实资产方案，服务 `task 02（任务02）` 与 `task 03（任务03）`。
- 优先保证事实来源与版本绑定的可追溯性，不扩展为运行时决策逻辑或事实消费实现。

## Boundary / Invariants

- 只负责事实资产映射方案，不负责运行时决策逻辑。
- 不允许把 `Excel（电子表格）` 直接作为 `runtime（运行时）` 真值。
- 不允许发明未登记字段。
- 输出必须显式回指字段字典与事实版本绑定。
- 脚本入口、字段字典映射和版本绑定约束属于稳定内核，升级时默认不可轻删。

## Overview

服务 `D:\diypc（项目根目录）` 的事实资产整理，重点覆盖：

- `field dictionary（字段字典）`
- `fact workbook（事实工作簿）`
- `fact version binding（事实版本绑定）`

## Trigger / Non-Trigger

### Trigger

- 用户要求把配件事实表、字段字典、事实版本绑定要求映射成正式 `fact assets（事实资产）` 方案。
- 用户要求输出事实字段映射清单、事实来源与版本绑定清单。
- 用户已经在 `D:\diypc（项目根目录）` 内处理事实资产整理，并需要稳定映射结果。

### Non-Trigger

- 纯运行时决策逻辑设计或实现请求。
- 不涉及字段字典、事实版本绑定或事实资产映射的通用文档整理请求。
- 没有事实资产输入却要求直接生成正式事实真值的请求。

## Workflow

1. 先确认任务仍在 `D:\diypc（项目根目录）` 的事实资产映射范围内。
2. 读取 `references/baseline-links.md`，确认绑定范围、服务任务和项目资产。
3. 检查是否具备 `D:\diypc\电脑配件参数采集规划.xlsx`、`D:\diypc\assets\compiled\schemas\field_dictionary.json` 和项目服务请求中的 `artifact_inputs（输入资产）`。
4. 若输入足够，调用 `scripts/generate_fact_asset_plan.py（生成事实资产方案脚本）` 生成输出骨架。
5. 校对输出是否显式包含事实版本绑定、字段字典摘要与映射说明。

## Resource Routing

- `references/baseline-links.md`：用于确认绑定范围、服务任务和项目资产；触发后默认先读。
- `scripts/generate_fact_asset_plan.py`：当需要稳定生成事实资产方案时运行。
- `examples/generated-plan.yaml`：用于校准脚本生成后的目标形态。
- `examples/sample-output.yaml`：用于校准最小输出骨架。
- `evals/trigger/core.yaml`、`evals/task/core.yaml`、`evals/regression/core.yaml`、`evals/upgrade/core.yaml`：用于正式门禁和升级治理。

## Critical Rules

- 不允许把 `Excel（电子表格）` 直接作为 `runtime（运行时）` 真值。
- 不允许发明未登记字段。
- 输出必须显式绑定字段字典、事实版本绑定和来源工作簿。
- 不把事实表映射器扩展成运行时决策器或事实消费实现器。

## Validation

- 检查输出是否存在 `fact_asset_plan` 主结构。
- 检查是否显式列出 `source_workbooks`。
- 检查是否显式列出 `fact_version_binding`。
- 检查是否显式列出字段字典摘要或映射说明。
- 检查是否没有把工作簿直接声明为运行时真值。

## Output Contract

- 主交付物是事实资产方案。
- 输出至少覆盖：
  - 事实字段映射清单
  - 事实来源与版本绑定清单
  - 风险与缺口清单或映射说明
- 默认不负责生成运行时代码或完整事实消费链路。

## Failure Handling / Escalation

- 缺少工作簿、字段字典或项目输入资产时，停止并说明缺失项。
- 如果请求已经变成运行时决策设计、事实真值管理或完整实现开发，退出本 `Skill` 边界。

## Upgrade Policy

- 稳定内核：字段字典映射、事实版本绑定、工作簿来源、脚本入口、非运行时真值红线。
- 可收缩脚手架：解释性补充文本和低频占位说明。
- 升级时必须重跑触发、任务、回归与升级评测，不先删旧规则。
