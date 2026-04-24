# review-fix-planner brief（技能简报）

## Goal（目标）
- Turn repeated PR review comments into a reusable fix-planning skill.

## Scope（边界）
- 把 `PR review comments（代码评审意见）` 整理为可执行修复清单。
- 标出优先级、依赖关系、风险与回归建议。
- 在输入不完整时先补齐关键信息，再产出计划。

## Non-Scope（非边界）
- 不直接修改代码。
- 不替代代码评审本身。
- 不负责上线、部署或合并决策。

## Inputs（输入）
- `review findings（评审发现）`
- `repository context（仓库上下文）`
- `failure feedback（失败反馈）`
- `quality bar（质量门槛）`

## Outputs（输出）
- `fix plan（修复计划）`
- `risk notes（风险说明）`
- `regression checklist（回归清单）`
- `open questions（待澄清问题）`

## Risks（风险）
- 把一次性评论误提升为通用规则。
- 忽略跨文件依赖，导致计划不完整。
- 输出格式稳定但行动性不足。

## Success Bar（成功门槛）
- 能稳定区分“整理计划”和“直接修代码”两类请求。
- 生成结果包含边界、优先级、依赖、回归建议。
- 至少一组 `trigger eval（触发评测）` 与一组 `quality eval（质量评测）` 已绑定。
