# Frozen Baseline

- skill: `copy-check-skill`
- baseline_version: `pre-formal-2026-04-22`
- frozen_on: `2026-04-23`

## Stable Core Before Formalization

- 已有清晰的触发与不触发边界
- 已有输入完整度分流
- 已有七层校验顺序
- 已有首轮输出与复检输出两套契约
- 已有伪复检切回规则

## Expected Upgrade Invariants

- 正式化补齐 `skill.yaml`、`examples/`、`evals/` 后，不得破坏上述稳定内核
- 模板脚本和解释性补丁仍视为可收缩脚手架
- 升级后必须继续通过 `evals/trigger`、`evals/task`、`evals/regression`、`evals/upgrade`
