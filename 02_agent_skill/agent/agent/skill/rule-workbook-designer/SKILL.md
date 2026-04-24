---
name: rule-workbook-designer
description: 服务 `D:\diypc（项目根目录）` 的 `rule workbook designer（规则工作簿设计器）`，负责把规则维护模板、工作表结构、草案导入入口与任务 `02（任务02）` 对齐。
---

# rule-workbook-designer（规则工作簿设计器）

## Design Goal

- 稳定输出“工作表与字段要求、草案导入目标、与已发布规则包的映射说明”的规则工作簿方案，服务 `task 02（任务02）`。
- 优先保证工作簿模板、导入入口和已发布规则包映射的可追溯性，不扩展为运行时规则读取器或正式规则执行器。

## Boundary / Invariants

- 只负责规则工作簿设计与草案导入要求，不接管运行时规则执行。
- 不允许让 `runtime（运行时）` 直接读取 `Excel（电子表格）`。
- 输出必须显式绑定工作簿模板、工作表结构、导入目标和已发布规则包映射。
- 脚本入口、工作簿模板引用和导入目标属于稳定内核，升级时默认不可轻删。
- 若缺少工作簿模板或规则改造方案上下文，应停在缺失信息提示，不伪造正式工作簿方案。

## Overview

面向 `task 02（任务02）` 设计或修正规则工作簿与草案导入要求。

## Trigger / Non-Trigger

### Trigger

- 用户要求设计或修正规则工作簿、工作表结构、草案导入目标。
- 用户要求把规则维护模板、工作表结构与已发布规则包映射起来。
- 用户已经在 `D:\diypc（项目根目录）` 内处理规则维护模板，并需要稳定工作簿方案。

### Non-Trigger

- 纯运行时规则执行、规则读取或正式规则包发布请求。
- 不涉及工作簿模板、导入入口或已发布规则包映射的通用文档整理请求。
- 没有工作簿模板或规则改造上下文，却要求直接生成正式规则运行方案的请求。

## Workflow

1. 先确认任务仍在 `D:\diypc（项目根目录）` 的规则工作簿设计范围内。
2. 读取 `references/baseline-links.md`，确认绑定范围、服务任务和项目资产。
3. 检查是否具备 `D:\diypc\docs\核心规则维护模板填写说明.md`、`D:\diypc\docs\核心规则表格化改造方案.md` 和 `D:\diypc\assets\templates\核心规则维护模板.xlsx`。
4. 若输入足够，调用 `scripts/generate_rule_workbook_plan.py（生成规则工作簿方案脚本）` 生成输出骨架。
5. 校对输出是否显式包含工作表结构、导入目标、已发布规则包映射和运行时边界。

## Resource Routing

- `references/baseline-links.md`：用于确认绑定范围、服务任务和项目资产；触发后默认先读。
- `scripts/generate_rule_workbook_plan.py`：当需要稳定生成规则工作簿方案时运行。
- `examples/generated-plan.yaml`：用于校准脚本生成后的目标形态。
- `examples/sample-output.yaml`：用于校准最小输出骨架。
- `evals/trigger/core.yaml`、`evals/task/core.yaml`、`evals/regression/core.yaml`、`evals/upgrade/core.yaml`：用于正式门禁和升级治理。

## Critical Rules

- 不允许让 `runtime（运行时）` 直接读取 `Excel（电子表格）`。
- 输出必须显式绑定工作簿模板、导入目标和已发布规则包映射。
- 不把规则工作簿设计器扩展成运行时规则读取器或正式规则执行器。

## Validation

- 检查输出是否存在 `rule_asset_plan` 主结构。
- 检查是否显式列出 `workbook_tabs`。
- 检查是否显式列出 `draft_import_targets`。
- 检查是否显式列出 `published_pack_targets`。
- 检查是否没有把 Excel 直接声明为运行时读取来源。

## Output Contract

- 主交付物是规则工作簿方案。
- 输出至少覆盖：
  - 工作表与字段要求
  - 草案导入目标
  - 与已发布规则包的映射说明
- 默认不负责生成运行时读取器或正式规则执行逻辑。

## Failure Handling / Escalation

- 缺少模板、规则改造方案或工作簿模式上下文时，停止并说明缺失项。
- 如果请求已经变成运行时读取、正式规则执行或发布流程实现，退出本 `Skill` 边界。

## Upgrade Policy

- 稳定内核：工作簿模板引用、工作表结构、导入目标、已发布规则包映射、Excel 不直接进入运行时红线。
- 可收缩脚手架：解释性补充文本和低频占位说明。
- 升级时必须重跑触发、任务、回归与升级评测，不先删旧规则。
