# compliance-rollback-planner brief（技能简报）

## Goal（目标）
- Simplify a compliance rollback skill after a stronger model upgrade while preserving audit rules and baseline guarantees.

## Scope（边界）
- Simplify the model-sensitive layer while preserving audit core.

## Non-Scope（非边界）
- Do not remove rollback approval requirements.

## Inputs（输入）
- model upgrade signal（模型升级信号）
- previous failure patterns（旧失败模式）

## Outputs（输出）
- model upgrade note（升模说明）
- refreshed baseline comparison（刷新后的基线对比）

## Risks（风险）
- Over-prune guidance and lose audit nuance.

## Success Bar（成功门槛）
- Must distinguish stable core（稳定内核） from model-sensitive layer（模型敏感层）.
