# new-skill-from-recurring-requests（从重复请求生成新技能）

## 输入信号

- 最近 `10（十）` 次任务里，有 `6（六）` 次都在做“把代码评审意见整理成可执行修复清单”
- 常见失败集中在边界不清、输出格式漂移、缺少回归任务
- 团队希望这类任务以后能被稳定触发，而不是每次临时写提示

## 生成器应该产出

- 一个边界明确的 `review-fix-planner（评审修复规划器）`
- 一份 `SKILL-QI（技能质量指数）` 目标，至少明确五维目标分数
- 一套最小 `evals（评测）`：
  - `trigger eval（触发评测）`
  - `happy path（正常路径）`
  - `edge case（边界场景）`
  - `failure replay（失败回放）`
- 一份 `iteration backlog（迭代待办）`，指出下轮优先修什么

## 重点观察

- 是否先写 `non-scope（非边界）`
- 是否把高频失败升级为 `guardrail（护栏）`
- 是否证明这个 `skill（技能）` 比无技能方案更稳
