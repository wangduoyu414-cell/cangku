# release-review-orchestrator brief（技能简报）

## Goal（目标）
- Turn repeated release review findings into a reusable orchestration skill with baseline comparisons and iteration hooks.

## Scope（边界）
- Normalize repeated release-review findings into a reusable planning workflow.
- Separate blockers, optional fixes, and follow-up regression work.
- Retain evidence and baseline notes for future iteration.

## Non-Scope（非边界）
- Do not change source code directly.
- Do not approve production rollout.
- Do not replace security or governance review.

## Inputs（输入）
- release findings（发布发现）
- repository constraints（仓库约束）
- historical failure feedback（历史失败反馈）

## Outputs（输出）
- fix planning skill bundle（修复规划技能包）
- baseline comparison（基线对比）
- iteration backlog（迭代待办）

## Risks（风险）
- Overfit a single release incident（对单次发布事故过拟合）
- Lose dependency ordering（丢失依赖顺序）

## Success Bar（成功门槛）
- Must express scope（边界） and non-scope（非边界） clearly.
- Must include baseline comparison（基线对比） and next-fix backlog（下一轮待办）.
