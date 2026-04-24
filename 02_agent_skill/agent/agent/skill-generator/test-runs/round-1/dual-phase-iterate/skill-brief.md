# release-review-orchestrator brief（技能简报）

## Goal（目标）
- Upgrade an existing release review skill from clustered failures, missing dependencies, and manual rework.

## Scope（边界）
- Upgrade dependency awareness for release planning.
- Refresh evals（评测） and backlog（待办） after failure clustering.

## Non-Scope（非边界）
- Do not broaden into deployment automation.
- Do not rewrite unrelated release docs.

## Inputs（输入）
- failure clusters（失败簇）
- manual rollback notes（人工回滚记录）

## Outputs（输出）
- updated planning skill draft（更新后的规划技能草案）
- failure attribution（失败归因）

## Risks（风险）
- Fixing one failure may widen trigger scope too much.

## Success Bar（成功门槛）
- Must explain which SKILL-QI（技能质量指数） dimensions were affected.
- Must map failures to concrete repair directions.
