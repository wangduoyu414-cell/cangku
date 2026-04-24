# Runtime Contract Spec

版本：统一版  
状态：共享运行时契约  
目标读者：平台工程师、编排器设计者、治理系统设计者、评测系统设计者  
适用范围：Agent 与 Skill 的最小公共 contract

---

## 1. 文档目标

本文档不是新的母规范，而是一份最小共享运行时契约。

它只定义四类 schema：

- `task_envelope`
- `skill_manifest`
- `memory_item`
- `trace_event`

设计目标：

- 支持 Agent 间结构化交接
- 支持 Skill 注册与正式发布
- 支持状态治理与记忆治理
- 支持回放、归因、审计与最小观测
- 避免 schema 过宽导致作者和平台负担失控

---

## 2. 设计原则

### 2.1 够用优先于完美

字段只保留落地最常用的最小集合。

### 2.2 人类 prose 与机器 contract 分层

自然语言设计规范仍保留在 Agent/Skill 主文档中；本文件只定义机器消费的最小结构。

### 2.3 不强迫作者双写

能从主文档推导的内容，不要求在这里重复写一套长 prose。

### 2.4 不预设特定编排器或存储后端

本规范不绑定具体数据库、消息系统、任务引擎或模型路由框架。

---

## 3. Task Envelope

`task_envelope` 用于：

- Agent 间交接
- 子任务派发
- 失败恢复
- 任务接力
- 最小回放与审计

### 3.1 Schema

```yaml
task_envelope:
  task_id: ""
  goal: ""
  constraints: []
  done_criteria: []
  risk_level: "L0|L1|L2|L3|L4"
  budget:
    token_budget: 0
    tool_call_budget: 0
    wall_clock_ms: 0
  current_state: {}
  completed_steps: []
  unresolved_issues: []
  artifact_refs: []
  stop_conditions: []
```

### 3.2 字段说明

- `task_id`：任务唯一标识
- `goal`：当前任务目标，必须明确、可操作
- `constraints`：输入约束、权限边界、格式要求、范围限制
- `done_criteria`：什么算完成，必须可检查
- `risk_level`：当前任务整体风险等级
- `budget`：预算控制字段
- `current_state`：最小可恢复运行态
- `completed_steps`：已经完成的关键步骤
- `unresolved_issues`：仍未解决的问题或阻塞项
- `artifact_refs`：已产生或依赖的产物引用
- `stop_conditions`：何时必须停止或升级

### 3.3 使用规则

- 不得省略 `goal`
- 不得用模糊自然语言代替 `done_criteria`
- `current_state` 应足以支持恢复或接力
- `artifact_refs` 应引用真实产物，而不是“我已经做完了”这类文本声称

---

## 4. Skill Manifest

`skill_manifest` 用于：

- 正式 Skill 注册
- 运行时能力过滤
- 平台治理与发布
- 最小冲突治理

### 4.1 Schema

```yaml
skill_manifest:
  id: ""
  version: ""
  owner: ""
  mode: "instruction|executable"
  side_effect: "read_only|local_write|external_write|destructive"
  requires_tools: []
  preferred_over: []
  conflicts_with: []
  eval_suite: []
```

### 4.2 字段说明

- `id`：Skill 稳定唯一身份
- `version`：Skill 版本
- `owner`：维护责任人或团队
- `mode`：执行模式，区分纯说明型和带脚本型
- `side_effect`：副作用等级
- `requires_tools`：运行所需工具能力
- `preferred_over`：同类能力冲突时优先关系
- `conflicts_with`：不应同时启用或不应互相争抢的 Skill
- `eval_suite`：关联评测资产

### 4.3 使用规则

- 触发语义主文本仍在 `description`
- `skill_manifest` 不应用来替代 `SKILL.md`
- 正式 Skill 必须有 `id`、`version`、`owner`、`mode`、`side_effect`
- `preferred_over` 与 `conflicts_with` 可以为空，但应在库规模扩大时逐步补齐

---

## 5. Memory Item

`memory_item` 用于表示一条可长期管理的记忆对象。

### 5.1 Schema

```yaml
memory_item:
  subject: ""
  claim: ""
  source: ""
  timestamp: ""
  confidence: 0.0
  scope: ""
  ttl: ""
  verification_status: "unverified|verified|superseded"
```

### 5.2 字段说明

- `subject`：记忆主体，例如用户、项目、规则、工具、系统行为
- `claim`：被保存的内容
- `source`：来源或溯源引用
- `timestamp`：写入或确认时间
- `confidence`：可信度分数
- `scope`：适用边界
- `ttl`：过期时间或失效策略
- `verification_status`：是否已验证、是否已被替代

### 5.3 使用规则

- 未验证结论不应直接标记为 `verified`
- `scope` 不能为空语义，必须能解释适用范围
- 缺来源的记忆不应作为高置信度事实长期保存
- `ttl` 可为空，但高漂移信息应优先设置过期策略

---

## 6. Trace Event

`trace_event` 用于支持最小可观测性、回放和归因。

### 6.1 Schema

```yaml
trace_event:
  event_type: "goal_interpreted|plan_created|skill_selected|tool_called|validation_passed|validation_failed|memory_read|memory_written|stopped"
  actor: ""
  timestamp: ""
  input_ref: ""
  output_ref: ""
  status: "ok|failed|blocked"
```

### 6.2 字段说明

- `event_type`：事件类型
- `actor`：产生该事件的 Agent、Skill、Tool 或系统组件
- `timestamp`：事件发生时间
- `input_ref`：输入对象引用
- `output_ref`：输出对象引用
- `status`：事件结果状态

### 6.3 设计原则

- 词表保持短小稳定，先覆盖最常见事件
- 事件引用真实输入输出对象，而不是只写自然语言摘要
- 失败、阻断、停止必须显式记录

---

## 7. 预算与副作用的统一语义

虽然预算与副作用分散出现在 Agent 和 Skill 文档中，运行时应统一理解。

### 7.1 预算字段

当前只保留三类预算：

- `token_budget`
- `tool_call_budget`
- `wall_clock_ms`

这是为了避免 schema 过早膨胀。更细预算可以在需要时再扩展。

### 7.2 副作用字段

统一使用四级：

- `read_only`
- `local_write`
- `external_write`
- `destructive`

该字段可用于：

- 运行时权限过滤
- 治理策略触发
- 发布门禁
- 风险审计

---

## 8. 最小实现建议

### 8.1 对作者

作者只需要显式维护：

- `SKILL.md`
- `skill.yaml`
- 必要的评测资产

### 8.2 对平台

平台负责：

- 解析 `skill_manifest`
- 在调度时传递 `task_envelope`
- 在状态层维护 `memory_item`
- 在观测层记录 `trace_event`

### 8.3 对治理与编排器

- 基于 `risk_level` 和 `side_effect` 做最小策略控制
- 基于 `task_envelope` 支持恢复和接力
- 基于 `trace_event` 支持回放和归因

---

## 9. 当前不解决的问题

为避免过度设计，以下内容暂不纳入当前 schema：

- 完整 policy DSL
- 完整 routing arbitration 算法
- 完整在线指标体系
- 大而全的 registry 标签系统
- 多后端兼容层细节
- 编译后的 runtime brief

这些能力可以按需扩展，但不应阻塞当前落地。

---

## 10. 最终结论

本规范的目标不是把平台规范做重，而是为 Agent 与 Skill 提供一套真正可运行、可接力、可发布、可追踪的最小公共接口。

如果只记住一句话，可以记住下面这句：

**主文档讲设计，契约文档讲运行；作者只多写最少字段，平台承担其余复杂性。**
