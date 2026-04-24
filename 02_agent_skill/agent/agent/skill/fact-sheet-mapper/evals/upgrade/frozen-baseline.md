# Frozen Baseline

- skill: `fact-sheet-mapper`
- baseline_version: `pre-unified-2026-04-23`
- frozen_on: `2026-04-23`

## Stable Core Before Migration

- 输出事实字段映射清单、事实来源与版本绑定清单、风险与缺口清单
- 服务 `task 02（任务02）` 与 `task 03（任务03）`
- 红线是不允许把 Excel 直接作为 runtime 真值，也不允许发明未登记字段
- 使用 `scripts/generate_fact_asset_plan.py` 生成事实资产方案

## Expected Migration Invariants

- 结构迁移后仍必须显式绑定工作簿来源和事实版本
- 结构迁移后仍不扩展成运行时决策逻辑
- 升级后必须通过 trigger、task、regression、upgrade 四类门禁
