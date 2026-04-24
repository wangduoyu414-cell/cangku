# Frozen Baseline

- skill: `release-gate-auditor`
- baseline_version: `pre-unified-2026-04-23`
- frozen_on: `2026-04-23`

## Stable Core Before Migration

- 输出发布门禁影响说明、报告要求、阻断项列表
- 服务 `task 03（任务03）`、`task 13（任务13）`、`task 14（任务14）`
- 红线是不允许建议跳过 corereplay 或 rulepublish
- 使用 `scripts/generate_release_gate_impact.py` 生成门禁影响方案

## Expected Migration Invariants

- 结构迁移后仍必须保留必需报告要求
- 结构迁移后仍必须保留核心回放与发布进程阻断红线
- 升级后必须通过 trigger、task、regression、upgrade 四类门禁
