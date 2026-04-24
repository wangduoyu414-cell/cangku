# multilingual-risk-triage failure attribution（失败归因）

## Failure Cluster（失败簇）
- Cross-file dependency miss after rollback planning.
- Inconsistent baseline language between team variants.

## Symptoms（症状）
- Humans keep appending missing follow-up tasks.
- Regression steps differ for the same incident class.

## Affected SKILL-QI Dimensions（受影响维度）
- Limits & Interfaces（限制与接口）
- Learning & Lift（学习闭环与增益）

## Suspected Root Cause（疑似根因）
- Case data was rich enough, but default path and baseline wording were too loose.

## Repair Direction（修复方向）
- Add stricter dependency guardrails.
- Normalize baseline wording into a reusable structure.
