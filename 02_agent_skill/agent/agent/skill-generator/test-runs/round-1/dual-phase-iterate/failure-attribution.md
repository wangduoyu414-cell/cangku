# release-review-orchestrator failure attribution（失败归因）

## Failure Cluster（失败簇）
- Repeated dependency omission across rollback planning.
- Inconsistent regression checklist wording.

## Symptoms（症状）
- Tasks ship without post-release validation.
- Humans keep patching missing dependency notes.

## Affected SKILL-QI Dimensions（受影响维度）
- Instruction-to-Action（指令到行动）
- Learning & Lift（学习闭环与增益）

## Suspected Root Cause（疑似根因）
- Failure examples were observed but not promoted into guardrails.

## Repair Direction（修复方向）
- Promote dependency scan into a mandatory planning step.
- Bind regression checklist wording to a reusable template.
