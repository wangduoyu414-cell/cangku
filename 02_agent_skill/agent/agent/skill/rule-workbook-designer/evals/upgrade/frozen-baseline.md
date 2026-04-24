# Frozen Baseline

- skill: `rule-workbook-designer`
- baseline_version: `pre-unified-2026-04-23`
- frozen_on: `2026-04-23`

## Stable Core Before Migration

- 输出工作表与字段要求、草案导入目标、与已发布规则包的映射说明
- 服务 `task 02（任务02）`
- 红线是不允许让 runtime 直接读取 Excel
- 使用 `scripts/generate_rule_workbook_plan.py` 生成规则工作簿方案

## Expected Migration Invariants

- 结构迁移后仍必须显式绑定工作簿模板和导入目标
- 结构迁移后仍必须保留 Excel 不直接进入 runtime 的边界
- 升级后必须通过 trigger、task、regression、upgrade 四类门禁
