# multilingual-risk-triage brief（技能简报）

## Goal（目标）
- Upgrade the multilingual risk triage skill from cross-file misses, inconsistent baselines, and human rollback fixes.

## Scope（边界）
- Upgrade lifecycle support for failure-heavy triage scenarios.

## Non-Scope（非边界）
- Do not widen into incident remediation.

## Inputs（输入）
- rollback fixes（回滚修补）
- baseline drift reports（基线漂移报告）

## Outputs（输出）
- iterated triage skill artifacts（迭代后的分诊技能产物）
- failure attribution（失败归因）

## Risks（风险）
- Cross-file misses may reappear if failures are not promoted.

## Success Bar（成功门槛）
- Must convert repeated rollback misses into explicit repair directions.
