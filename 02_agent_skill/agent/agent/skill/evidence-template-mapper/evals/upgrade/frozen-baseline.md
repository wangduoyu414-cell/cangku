# Frozen Baseline

- skill: `evidence-template-mapper`
- baseline_version: `pre-unified-2026-04-23`
- frozen_on: `2026-04-23`

## Stable Core Before Migration

- 输出证据来源清单、证据模板映射、反事实绑定说明
- 服务 `task 09（任务09）` 与 `task 10（任务10）`
- 红线是不允许没有证据来源就生成解释
- 使用 `scripts/generate_evidence_alignment_plan.py` 生成对齐方案

## Expected Migration Invariants

- 结构迁移后仍必须显式绑定证据来源
- 结构迁移后仍只负责模板映射，不负责完整任务实现
- 升级后必须通过 trigger、task、regression、upgrade 四类门禁
