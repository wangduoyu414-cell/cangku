# compliance-rollback-planner brief（技能简报）

## Goal（目标）
- Generate a reusable skill for compliance-sensitive rollback planning with multilingual evidence and baseline measurement.

## Scope（边界）
- Turn repeated compliance rollback requests into a reusable planning skill.
- Track audit evidence, rollback decisions, and follow-up validation.

## Non-Scope（非边界）
- Do not execute rollback actions.
- Do not replace legal approval.

## Inputs（输入）
- rollback requests（回滚请求）
- policy findings（策略发现）
- multilingual evidence（多语言证据）

## Outputs（输出）
- rollback planning skill draft（回滚规划技能草案）
- score summary（评分摘要）
- baseline comparison（基线对比）

## Risks（风险）
- Lose audit nuance when compressing multilingual inputs.
- Promote policy wording into overbroad guardrails.

## Success Bar（成功门槛）
- Must preserve audit references and rollback boundaries.
- Must emit both markdown scorecard（文档评分卡） and YAML score summary（YAML 评分摘要）.
