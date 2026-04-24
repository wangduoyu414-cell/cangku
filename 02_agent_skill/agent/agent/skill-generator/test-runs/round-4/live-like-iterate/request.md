# federated-incident-governor request（技能请求）

## Mode（模式）
- iterate

## Summary（摘要）
- Upgrade the federated incident-governor skill after long-form failures, stale outputs, and cross-round regression drift.

## Constraints（约束）
- Do not widen trigger scope while fixing long-form failures.
- Keep stale output detection and regression reporting explicit.

## Quality Goals（质量目标）
- Reduce regression drift across rounds.
- Reduce stale output risk in repeated runs.
