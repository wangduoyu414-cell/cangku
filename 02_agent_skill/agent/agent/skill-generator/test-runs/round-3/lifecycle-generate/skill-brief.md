# multilingual-risk-triage brief（技能简报）

## Goal（目标）
- Generate a reusable multilingual risk triage skill from repeated incidents, failure clusters, and stricter audit constraints.

## Scope（边界）
- Convert repeated incident triage requests into a reusable bounded skill.
- Record evidence, escalation class, and regression follow-up.

## Non-Scope（非边界）
- Do not resolve incidents directly.
- Do not replace incident commander decisions.

## Inputs（输入）
- incident reports（事件报告）
- failure clusters（失败簇）
- audit constraints（审计约束）

## Outputs（输出）
- risk triage skill draft（风险分诊技能草案）
- baseline and score outputs（基线与评分输出）

## Risks（风险）
- Trigger confusion with ordinary incident summaries.
- Losing rollback nuance in compressed evidence.

## Success Bar（成功门槛）
- Must generate semantically filled planning artifacts.
- Must survive UTF-8（统一编码） metadata generation.
