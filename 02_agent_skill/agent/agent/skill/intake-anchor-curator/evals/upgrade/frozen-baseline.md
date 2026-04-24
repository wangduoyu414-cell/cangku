# Frozen Baseline

- skill: `intake-anchor-curator`
- baseline_version: `pre-unified-2026-04-23`
- frozen_on: `2026-04-23`

## Stable Core Before Migration

- 输出高频表达模式、软偏好规则、冲突候选规则、锚点绑定规则
- 服务 `task 04（任务04）`
- 红线是不允许高频标准表达默认走 LLM
- 使用 `scripts/generate_intake_anchor_plan.py` 生成输入锚点方案

## Expected Migration Invariants

- 结构迁移后仍必须保留高频标准表达默认零 LLM 调用
- 结构迁移后仍必须保留补解析边界与锚点绑定要求
- 升级后必须通过 trigger、task、regression、upgrade 四类门禁
