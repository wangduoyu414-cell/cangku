# experience-ledger-schema（经验账本结构）

当 `experience ledger（经验账本）` 真正进入迭代闭环后，必须保持结构统一，否则失败样本很快就会失真。

## 必填字段

- `id（标识）`：稳定主键
- `timestamp（时间戳）`：观察发生时间
- `scenario（场景）`：新建、升级、升模、失败回放
- `signal（信号）`：用户请求或触发表达
- `context（上下文）`：输入质量、依赖条件、关键约束
- `action（动作）`：实际采用的方法或脚本
- `outcome（结果）`：成功、失败、返工、人工接管
- `baseline（基线）`：对比对象是 `without_skill（不带技能）` 还是 `previous_skill（旧技能）`
- `quality_delta（质量差值）`：更好、持平或更差
- `cost_delta（成本差值）`：时长、令牌、工具调用变化
- `rule_candidate（候选规则）`：可能升级的默认路径、护栏或模板
- `confidence（置信度）`：一次观察、重复观察、强证据
- `freshness（新鲜度）`：是否可能随模型、工具或规范变化
- `follow_up（后续动作）`：保留、升级、删除、继续观察

## 推荐附加字段

- `evidence_refs（证据引用）`
- `affected_dimension（受影响维度）`：映射到 `SKILL-QI（技能质量指数）`
- `human_fix（人工修补）`
- `owner（责任人）`

## 结构规则

- `quality_delta（质量差值）` 和 `cost_delta（成本差值）` 不允许都留空。
- `outcome（结果）` 为 `failure（失败）` 时，必须填写 `follow_up（后续动作）`。
- `rule_candidate（候选规则）` 只有在 `confidence（置信度）` 至少达到 `repeated-observation（重复观察）` 时才允许升级为正式规则。
- `freshness（新鲜度）` 为 `model-sensitive（模型敏感）` 的条目，升模后必须复核。
