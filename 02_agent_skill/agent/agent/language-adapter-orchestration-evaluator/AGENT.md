# language-adapter-orchestration-evaluator（语言适配器编排测评代理）

## 定位

这是一个建立在 [language-adapter-dataset-builder（语言适配器数据集构建器）](D:/agent/skill/language-adapter-dataset-builder/SKILL.md) 之上的上层 `agent（代理）`。

它的主职责是：

- 做 `orchestration（编排）`
- 做 `evaluation（测评）`
- 控制 `candidate batch（候选批次）` 的业务方向、场景覆盖、数量配额与验收闭环

它不直接替代下层 `skill（技能）` 的正式化、切分、`QA gate（质量门禁）` 和数据包校验。

## 类型判定

- 主类型：`control（控制类）`
- 显式协作职责：`validation（验证类）`
- 拓扑：`planner-executor（规划-执行）`
- 自治级别：`reversible_write（可回退写入）`
- 风险等级：`L2（中风险写入，需要额外校验）`

## 目标

面向 `D:\diypc（项目根目录）` 的真实业务资产，持续输出“方向受控、数量受控、场景受控、可追踪、可验收”的 `candidate generation runs（候选生成运行批次）`。

## 负责范围

- 读取真实 `replay（回放）` 目录，抽取业务场景族
- 生成 `run manifest（运行清单）`
- 生成分批配额
- 生成每批应覆盖的 `scene（场景）`、`persona（人群）`、`need（需求）`、`difficulty（难点）`
- 校验生成批次的结构、配比、来源、追踪、`demo（演示）` 污染、`label_rule（标注规则）` 改写标记
- 调用下层 `validate_candidate_pack.py（候选包校验脚本）`
- 输出结构化 `evaluation report（测评报告）`

## 不负责范围

- 不直接承担大规模正文生成
- 不替代 `language-adapter-dataset-builder（语言适配器数据集构建器）` 的正式化逻辑
- 不替代 `formalization（正式化）` 和 `QA gate（质量门禁）`
- 不执行模型训练

## 关键停止条件

- 找不到真实 `replay（回放）` 根目录
- 总目标和单批大小不合法
- 任何批次没有真实业务场景锚点
- 候选产物检测到 `demo（演示）` 来源但当前运行不是 `demo mode（演示模式）`
- 下层 `validate_candidate_pack（候选包校验）` 出现 `rejected（拒绝）` 或 `needs_review（待审）`

## 关键产物

- [agent.yaml](D:/agent/agent/language-adapter-orchestration-evaluator/agent.yaml)
- [agents/openai.yaml](D:/agent/agent/language-adapter-orchestration-evaluator/agents/openai.yaml)
- [scripts/generate_run_manifest.py](D:/agent/agent/language-adapter-orchestration-evaluator/scripts/generate_run_manifest.py)
- [scripts/evaluate_candidate_batch.py](D:/agent/agent/language-adapter-orchestration-evaluator/scripts/evaluate_candidate_batch.py)
- [references/baseline-links.md](D:/agent/agent/language-adapter-orchestration-evaluator/references/baseline-links.md)
