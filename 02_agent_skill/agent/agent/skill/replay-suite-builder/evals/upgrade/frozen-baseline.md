# Frozen Baseline

- skill: `replay-suite-builder`
- baseline_version: `pre-unified-2026-04-23`
- frozen_on: `2026-04-23`

## Stable Core Before Migration

- 输出回放样例扩充建议、差异维度清单、质量阈值绑定
- 服务 `task 13（任务13）`
- 红线是不允许用旧 replayd 样例替代新核心正式回放集
- 使用 `scripts/generate_replay_plan.py` 生成回放方案

## Expected Migration Invariants

- 结构迁移后仍必须显式绑定新核心回放集
- 结构迁移后仍必须保留旧回放不可替代红线
- 升级后必须通过 trigger、task、regression、upgrade 四类门禁
