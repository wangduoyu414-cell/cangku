# Skill 迁移上下文

更新时间：`2026-04-23`

## 1. 当前目标

本轮工作的目标不是改业务逻辑，而是把仓库中的旧 `Skill` 迁到统一标准下，使其满足：

- 统一设计目标、边界与不变量
- `quick_validate.py --strict`
- 单技能 `run_skill_evals.py`
- 单技能 `run_skill_release_gate.py`
- 仓库级 `run_repo_skill_evals.py`

迁移策略固定为“保守迁移”：

- 先加法，不先删旧资产
- 先补结构与治理资产
- 不改原脚本主逻辑
- 不扩大原有职责边界
- 先冻结基线，再谈升级删减

## 2. 已完成的主线工作

- 新增统一标准入口：`SKILL_STANDARD_UNIFIED.md`
- 更新根入口说明：`README.md`
- 强化 `skill-creator`：
  - `scripts/init_skill.py`
  - `scripts/quick_validate.py`
  - `scripts/run_skill_evals.py`
  - `scripts/run_skill_release_gate.py`
  - `scripts/run_repo_skill_evals.py`
- `skill-creator` 自身已经补齐：
  - `skill.yaml`
  - `examples/`
  - `evals/trigger`
  - `evals/task`
  - `evals/regression`
  - `evals/upgrade`
- `skill-creator` 自身已通过严格校验与单技能门禁
- `copy-check-skill` 已作为首个试点样板补到 `upgrade-ready`

## 3. 已完成迁移的 Skill

以下 `Skill` 已完成保守迁移，并可视为 `upgrade-ready`：

- `copy-check-skill`
- `evidence-template-mapper`
- `fact-sheet-mapper`
- `feature-registry-governor`
- `intake-anchor-curator`
- `language-scope-dataset-designer`
- `release-gate-auditor`
- `replay-suite-builder`
- `rule-workbook-designer`

这些包都已补齐：

- 新标准 `SKILL.md` 章节
- 新标准 `skill.yaml` 必填字段
- `examples/` 新格式
- `evals/trigger`
- `evals/task`
- `evals/regression`
- `evals/upgrade`
- `evals/upgrade/frozen-baseline.md`

并且均满足：

- `quick_validate.py --strict` 通过
- `run_skill_evals.py --ci` 通过

## 4. 当前仓库级快照

最新仓库级快照基于：

- 命令：`python .../skill-creator/scripts/run_repo_skill_evals.py <repo-root> --json`
- 时间：`2026-04-23T14:25:43.747652+00:00`

当前结果：

- `skill_count`: `13`
- `passed_skills`: `9`
- `failed_skills`: `4`
- `lifecycle_counts`:
  - `upgrade-ready`: `9`
  - `draft`: `4`

当前通过的仓库内 `Skill`：

- `evidence-template-mapper`
- `fact-sheet-mapper`
- `feature-registry-governor`
- `intake-anchor-curator`
- `language-scope-dataset-designer`
- `release-gate-auditor`
- `replay-suite-builder`
- `rule-workbook-designer`
- `copy-check-skill`

## 5. 当前未完成项

当前仓库级失败的 `Skill` 只剩 4 个：

- `skill-generator`
- `codegen-governance`
- `current-file-dependency-analysis`
- `plan-code-file-layout`

当前失败原因分两类：

### A. 基本元数据未补齐

- `codegen-governance`
  - `skill.yaml` 缺 `requires_tools`
- `current-file-dependency-analysis`
  - `skill.yaml` 缺 `conflicts_with`
  - `skill.yaml` 缺 `eval_suite`
  - `skill.yaml` 缺 `preferred_over`
  - `skill.yaml` 缺 `requires_tools`
- `plan-code-file-layout`
  - `skill.yaml` 缺 `requires_tools`

这三项目前连基础门禁都没过，还没进入严格正文与评测阶段。

### B. 评测资产结构与统一运行器不兼容

- `skill-generator`
  - 已能过基本结构，但其 `eval_suite` 引用的文件仍沿用旧结构
  - 典型问题：
    - 缺 `suite_id`
    - 缺统一的 `cases` 根结构
    - 多个样例缺 `goal`
  - 这不是单纯补字段，需要决定：
    - 是把 `skill-generator` 的 `evals` 迁成新统一格式
    - 还是给 `run_skill_evals.py` 增加兼容层

## 6. 工具链当前状态

当前工具链已经闭环：

- 单技能结构校验：`quick_validate.py`
- 单技能严格校验：`quick_validate.py --strict`
- 单技能门禁：`run_skill_evals.py`
- 单技能发布门禁：`run_skill_release_gate.py`
- 仓库级聚合门禁：`run_repo_skill_evals.py`

当前默认策略：

- 单技能正式门禁使用严格校验
- 仓库级聚合使用“生命周期感知”模式
- `draft` 不强行套正式严检
- `formal / upgrade-ready` 走严格门禁

## 7. 后续建议顺序

建议继续按以下顺序推进：

1. 先补三个“元数据型失败包”
- `codegen-governance`
- `current-file-dependency-analysis`
- `plan-code-file-layout`

原因：

- 这三项当前主要卡在 `skill.yaml`
- 修复成本低
- 可快速把仓库失败数从 `4` 降到 `1`

2. 最后单独处理 `skill-generator`

原因：

- 它不是简单旧模板问题
- 关键矛盾在 `evals` 结构与统一运行器不兼容
- 处理方式需要单独决策

## 8. 不要做的事

后续迁移过程中，不要做以下操作：

- 不要先删旧 `references/`
- 不要先删旧 `scripts/`
- 不要先改原脚本主逻辑
- 不要先重写 `description`
- 不要先改业务语义来换取门禁通过
- 不要在没有冻结基线前删“旧规则”

## 9. 推荐下一步

如果继续，下一步最优先是：

- 先迁 `codegen-governance`
- 再迁 `current-file-dependency-analysis`
- 再迁 `plan-code-file-layout`
- 最后单开一个分支处理 `skill-generator`

理由：

- 这样可以先清掉仓库中最容易修的剩余失败项
- 最后把复杂项单独处理，避免打断主线节奏
