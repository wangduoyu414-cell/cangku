# Frozen Baseline

- skill: `language-scope-dataset-designer`
- baseline_version: `pre-unified-2026-04-23`
- frozen_on: `2026-04-23`

## Stable Core Before Migration

- 输出允许样本范围、禁止样本范围、与证据模板和原话锚点的绑定要求
- 服务 `task 10（任务10）`
- 红线是不允许设计排序、推送、证据事实、状态真相相关训练样本
- 使用 `scripts/generate_language_scope_plan.py` 生成语言窄口方案

## Expected Migration Invariants

- 结构迁移后仍必须保留允许/禁止范围边界
- 结构迁移后仍必须保持语言输出可追溯到模板或证据包
- 升级后必须通过 trigger、task、regression、upgrade 四类门禁
