# skill-quality-index（技能质量指数）

把“优秀 `skill（技能）`”收敛为一个统一指标：`SKILL-QI（技能质量指数）`。

`SKILL-QI（技能质量指数）` 不是写作文评分表，而是一个会直接决定生成器如何取舍、如何评测、如何迭代的五维索引。

## 五维定义

### S = Scope & Signal（边界与信号）`25`

看它会不会在正确时机出现，并且不会越界。

- 有明确 `scope（边界）` 与 `non-scope（非边界）`
- `description（描述）` 既能覆盖真实表达，也能排除近邻误触发
- 至少有一组 `should-trigger（应触发）` 与 `should-not-trigger（不应触发）`
- 误触发主要靠边界澄清解决，而不是靠正文补救

### K = Knowledge Packaging（知识封装）`15`

看它是否只把真正高价值的信息放进核心上下文。

- `SKILL.md` 保持精简，优先小于 `500（五百）` 行、`5000（五千）` 令牌
- 大块知识拆到 `references（参考资料）`
- 重复且稳定的逻辑沉淀为 `scripts（脚本）` 或 `template（模板）`
- 只写模型本来不知道的项目事实、领域规则与坑点

### I = Instruction-to-Action（指令到行动）`20`

看模型能否从说明直接进入高质量执行。

- 第一动作明确
- 默认路径明确
- 工具与资源路由明确
- 有 `validation loop（验证闭环）`
- `output contract（输出契约）` 可检查
- 关键格式用 `template（模板）`，关键流程用 `checklist（清单）`

### L = Limits & Interfaces（限制与接口）`20`

看它是否是一个可治理、可组合的能力单元。

- `input slots（输入槽位）` 与 `output slots（输出槽位）` 清晰
- 工具、权限、副作用、升级点清晰
- 有 `stop conditions（停止条件）`
- 对高风险任务有 `apply（应用）`、`verify（验证）`、`rollback（回滚）` 语义
- 与相邻 `skill（技能）` 的边界清楚，不争抢职责

### L = Learning & Lift（学习闭环与增益）`20`

看它是否能证明价值，并随着模型变强而变瘦。

- 至少有一个 `baseline comparison（基线对比）`
- 能记录 `with_skill（带技能）` 与 `baseline（基线）` 的质量差值、成本差值
- 有失败归因、人工反馈与执行轨迹回流
- 规则区分 `stable core（稳定内核）` 与 `model-sensitive layer（模型敏感层）`
- 模型升级后会先删冗余提示，再考虑加新规则

## 硬门槛

以下任一项缺失，直接判定为未达标：

- 没有 `non-scope（非边界）`
- 没有 `output contract（输出契约）`
- 没有 `trigger eval（触发评测）`
- 没有 `quality eval（质量评测）`
- 没有 `baseline comparison（基线对比）`
- 存在模型变化信号，却没有 `simplification pass（简化复核）`

## 建议量化门槛

- `trigger precision（触发精确率）` 建议不低于 `0.90`
- `trigger recall（触发召回率）` 建议不低于 `0.85`
- 每条触发样本至少运行 `3（三）` 次
- `delta（增益）` 不要求首版就很大，但必须可解释

## 产物映射

- `SKILL.md`：主承载 `Scope & Signal（边界与信号）`、`Instruction-to-Action（指令到行动）`、`Limits & Interfaces（限制与接口）`
- `references（参考资料）`：主承载 `Knowledge Packaging（知识封装）` 与 `model-sensitive layer（模型敏感层）`
- `examples（示例）`：提供边界样例、格式样例、失败回放
- `evals（评测）`：证明 `Learning & Lift（学习闭环与增益）`

## 生成器使用方式

在生成或升级 `skill（技能）` 时，先为每一维写下：

- 目标分数
- 当前证据
- 最大风险
- 下一轮提分动作

这样输出的不是“一个长文档”，而是一套有质量索引、有证据闭环的能力包。
