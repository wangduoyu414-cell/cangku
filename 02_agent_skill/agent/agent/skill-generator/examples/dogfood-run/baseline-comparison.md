# review-fix-planner baseline comparison（技能基线对比）

## Comparison（对比对象）
- Candidate（候选版本）: `review-fix-planner（评审修复规划器）` 首版技能包
- Baseline（基线版本）: 临时 `prompt（提示）` + 人工整理方案

## Quality Delta（质量差值）
- correctness（正确性）: 更高，因为会显式要求依赖与回归项。
- actionability（可执行性）: 更高，因为输出固定要求优先级、依赖与待澄清问题。
- scope_clarity（边界清晰度）: 明显更高，因为有 `non-scope（非边界）`。
- contract_completeness（契约完整度）: 更高，因为绑定了 `evals（评测）` 与 `scorecard（评分卡）`。

## Cost Delta（成本差值）
- token_estimate（令牌估算）: 略高，因包含固定结构与验证要求。
- wall_clock_estimate（耗时估算）: 接近持平。
- tool_call_estimate（工具调用估算）: 接近持平。

## Notes（说明）
- 该技能首版更偏“稳”，不是“最省字数”；当前增益主要来自边界清晰与回归项完整。
