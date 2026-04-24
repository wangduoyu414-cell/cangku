# release-review-orchestrator request（技能请求）

## Mode（模式）
- generate

## Summary（摘要）
- Turn repeated release review findings into a reusable orchestration skill with baseline comparisons and iteration hooks.

## Constraints（约束）
- Preserve clear non-scope（非边界） for direct code edits and deployment execution.
- Bind every generated plan to evals（评测） and baseline comparison（基线对比） expectations.

## Quality Goals（质量目标）
- Stable trigger（触发） across repeated release-review style requests.
- Actionable output（可执行输出） with owners, sequencing, and regression checks.
