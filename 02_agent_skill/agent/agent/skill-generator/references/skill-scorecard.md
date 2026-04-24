# skill-scorecard（技能评分卡）

按 `SKILL-QI（技能质量指数）` 的五维做 `1-5（五分制）` 评分，再按权重换算成 `100（百分制）`：

- `Scope & Signal（边界与信号）`：25
- `Knowledge Packaging（知识封装）`：15
- `Instruction-to-Action（指令到行动）`：20
- `Limits & Interfaces（限制与接口）`：20
- `Learning & Lift（学习闭环与增益）`：20

## 硬门槛

以下任一项不满足，都视为未通过首版门槛：

- `Scope & Signal（边界与信号）` < `4`
- `Instruction-to-Action（指令到行动）` < `4`
- 缺少 `non-scope（非边界）`、`output contract（输出契约）` 或 `stop conditions（停止条件）`
- 缺少 `trigger eval（触发评测）` 或 `quality eval（质量评测）`
- 没有 `baseline comparison（基线对比）` 方案
- 已知存在 `model change signal（模型变化信号）`，却没有 `simplification pass（简化复核）`

## 发布建议

- `85-100` 且无硬门槛失败：可视为 `production-ready（可正式使用）`
- `70-84`：可视为 `beta（测试版）`
- `< 70`：仍是 `draft（草稿版）`

## 评分问句

- `Scope & Signal（边界与信号）`：它会在该触发时触发，在不该触发时不触发吗？
- `Knowledge Packaging（知识封装）`：核心上下文里是否只保留模型真正缺少的信息？
- `Instruction-to-Action（指令到行动）`：模型能否在 `30（三十）` 秒内知道第一步、默认路径与验证动作？
- `Limits & Interfaces（限制与接口）`：输入、输出、工具、权限、风险与升级点是否清晰？
- `Learning & Lift（学习闭环与增益）`：是否能证明它比无技能或旧技能更好，并能随模型升级而瘦身？

## 优先级公式

`priority（优先级） = business value（业务价值） × frequency（使用频次） × leverage（结果杠杆） ÷ governance cost（治理成本）`
