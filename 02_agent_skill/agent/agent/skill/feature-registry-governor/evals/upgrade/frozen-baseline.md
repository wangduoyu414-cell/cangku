# Frozen Baseline

- skill: `feature-registry-governor`
- baseline_version: `pre-unified-2026-04-23`
- frozen_on: `2026-04-23`

## Stable Core Before Migration

- 输出特征注册表引用清单、版本兼容约束、规则包发布影响
- 服务 `task 03（任务03）`
- 红线是不允许未登记特征进入正式规则包
- 使用 `scripts/generate_feature_registry_plan.py` 生成注册表治理方案

## Expected Migration Invariants

- 结构迁移后仍必须显式绑定注册表版本约束
- 结构迁移后仍必须阻断未登记特征进入正式规则包
- 升级后必须通过 trigger、task、regression、upgrade 四类门禁
