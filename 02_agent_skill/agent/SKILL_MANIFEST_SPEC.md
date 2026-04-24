# 正式 `skill.yaml`机器字段规范

## 1. 设计目标

`skill.yaml`不是第二份 `SKILL.md`。  
它的职责是承载机器需要稳定读取、比较、路由、校验、治理的短字段，而不是承载长篇执行说明。

目标：

- 保持字段最小而稳定。
- 支持正式发布与治理。
- 支持能力升级与兼容性管理。
- 避免作者重复维护两套自然语言说明。

## 2. 基本原则

- `manifest` `MUST`短小、结构化、可比较。
- `manifest` `MUST NOT`重复 `description`和正文中的长篇语义。
- 机器字段只表达治理必需信息，不表达大段流程。
- 缺少关键治理字段的 `Skill` `SHOULD NOT`被视为正式成熟能力。

## 3. 推荐字段

正式 `skill.yaml`推荐至少包含：

- `id`
- `version`
- `owner`
- `mode`
- `side_effect`
- `requires_tools`
- `preferred_over`
- `conflicts_with`
- `eval_suite`

若需要升级治理，还 `SHOULD`补充：

- `capability_floor`
- `capability_target`
- `scaffolding_removable_above`
- `upgrade_eval_suite`

## 4. 字段定义

### 4.1 `id`

- `MUST`稳定、唯一。
- `SHOULD`与 `Skill`目录名一致。
- `MUST NOT`包含临时后缀，例如 `final`或日期型草稿标识。

### 4.2 `version`

- `MUST`明确当前规范版本。
- `SHOULD`使用可排序格式。
- `MUST NOT`省略，除非该 `Skill`仍是草稿级。

### 4.3 `owner`

- `MUST`指向稳定责任主体。
- 可为团队、组织、系统域或个人，但必须可追责。

### 4.4 `mode`

允许值建议为：

- `instruction`
- `executable`

该字段用于区分评审重点和发布门槛，不替代正文。

### 4.5 `side_effect`

允许值建议为：

- `read_only`
- `local_write`
- `external_write`
- `destructive`

该字段用于快速识别风险等级。

### 4.6 `requires_tools`

- `SHOULD`列出执行所需关键工具。
- `MUST NOT`把非关键工具全量堆入。
- 应重点列出缺失后会直接影响主路径完成的工具。

### 4.7 `preferred_over`

- 用于声明：在特定场景下，该 `Skill`优先于哪些相邻 `Skill`或能力单元。
- `SHOULD`只写稳定边界，不写临时偏好。

### 4.8 `conflicts_with`

- 用于声明：不应同时启用或不应在同一任务里竞争的能力单元。
- 若为空，可显式写空数组。

### 4.9 `eval_suite`

- `SHOULD`指向默认正式评测集合。
- 用于发布前门禁和持续回归。

### 4.10 `capability_floor`

- 用于描述此 `Skill`正常工作的最低能力要求。
- 可为模型档位、能力标签或平台定义的能力级别。

### 4.11 `capability_target`

- 用于描述此 `Skill`最推荐的能力档。
- 主要用于调度策略和升级治理。

### 4.12 `scaffolding_removable_above`

- 用于标记：高于某能力阈值时，可以考虑移除哪些旧脚手架。
- `MUST NOT`直接替代评测。
- 该字段只能表达候选删减条件，不能表达“自动删掉”。

### 4.13 `upgrade_eval_suite`

- 用于声明模型升级后必须重跑的评测集。
- `SHOULD`包含触发、任务、回归、安全四类核心子集。

## 5. 最小示例

```yaml
id: "webapp-testing"
version: "2026-04-15"
owner: "platform-agent-team"
mode: "executable"
side_effect: "read_only"
requires_tools:
  - "playwright"
  - "shell"
preferred_over:
  - "generic-browser-debug"
conflicts_with:
  - "live-prod-mutator"
eval_suite:
  - "evals/trigger/core"
  - "evals/task/core"
capability_floor: "reasoning-medium"
capability_target: "reasoning-high"
scaffolding_removable_above: "reasoning-high"
upgrade_eval_suite:
  - "evals/trigger/core"
  - "evals/task/core"
  - "evals/regression/core"
  - "evals/safety/core"
```

## 6. 禁止事项

`skill.yaml` `MUST NOT`：

- 重复完整 `description`正文。
- 复制整段流程说明。
- 存放长篇背景知识。
- 用注释代替缺失字段。
- 承担与 `SKILL.md`重复的大段自然语言契约。

## 7. 验收要点

正式 `manifest`验收至少检查：

- 字段是否完整。
- 值是否稳定可比较。
- 是否存在冗余自然语言。
- 是否与 `SKILL.md`的分类、风险、评测声明一致。
- 是否具备升级治理字段。

