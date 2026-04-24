---
name: skill-generator
description: 根据重复任务、示例、失败反馈与演进约束，生成或升级可复用的 skill（技能） 包。适用于把 recurring requests（重复请求） 收敛为边界清晰、可触发、可评测、可迭代的 skill（技能）；也适用于现有 skill（技能） 在 trigger（触发）、output quality（输出质量）、evals（评测） 或 model upgrade（模型升级） 后需要重构时。不要用于一次性 prompt（提示） 文案，或只做仓库注册/接线的场景。
---

# skill-generator（技能生成器）

## 目标

把零散经验转成一个真正有长期价值的 `skill（技能）`：

- 能被准确触发
- 能把任务稳定做完
- 能证明自己比“没有这个 `skill（技能）`”更好
- 能在模型变强后主动删掉过时脚手架，而不是越写越厚

## Quick Route（快速路由）

- 新建 `skill（技能）`：当输入主要是重复任务、成功案例、组织偏好时，先产出 `skill brief（技能简报）` 与 `SKILL-QI（技能质量指数）` 目标，再组装完整包。
- 升级 `skill（技能）`：当输入主要是失败簇、误触发、产出漂移或人工返工时，先做失败归因，再决定修 `description（描述）`、正文、`references（参考资料）` 还是 `evals（评测）`。
- 升模重构：当输入包含 `model change signal（模型变化信号）` 时，先做 `stable core（稳定内核）` / `model-sensitive layer（模型敏感层）` 分层，再删除冗余提示，最后复跑基线。

## Workflow（工作流）

1. 建立 `evidence pack（证据包）`  
   明确任务目标、输入材料、约束、非目标、风险与成功标准。没有“不做什么”的 `skill（技能）`，通常也没有可控的边界。

2. 先读行业案例，再定质量目标  
   先读取 `references/industry-cases.md`，再读取 `references/skill-quality-index.md`。把目标写成 `SKILL-QI（技能质量指数）` 五维分数目标，而不是空泛地追求“写得完整”。

3. 建立 `experience ledger（经验账本）`  
   当输入含有案例、人工修正、历史版本或失败回放时，读取 `references/experience-management.md`，把原始材料收敛成带来源、频次、影响和新鲜度的经验条目。

4. 提纯 `pattern（规律）`，只升级有证据的规则  
   读取 `references/pattern-distillation.md`，把材料区分为 `default path（默认路径）`、`guardrail（护栏）`、`template（模板）`、`script candidate（脚本候选）`、`model-sensitive hint（模型敏感提示）`。只升级重复成功、高损失败或高价值差异。

5. 组装 `skill bundle（技能包）`  
   至少生成或更新：
   - `SKILL.md`
   - `skill.yaml`
   - `references/（参考资料目录）`
   - `examples/（示例目录）`
   - `assets/templates/（模板资产目录）`
   - `scripts/（脚本目录）`
   - `evals/（评测目录）`

6. 先设计 `evals（评测）`，再宣称可用  
   读取 `references/quality-iteration.md` 与 `references/skill-scorecard.md`。必须同时准备：
   - `trigger eval（触发评测）`
   - `quality eval（产出质量评测）`
   - `baseline comparison（基线对比）`
   - `iteration backlog（迭代待办）`

7. 处理 `model upgrade（模型升级）`  
   当模型能力变化明显时，读取 `references/model-growth.md`。保留安全、契约、接口与验证要求；优先删除冗余分步提示、僵硬 workaround（权宜技巧） 与过度约束。

8. 交付前打分  
   使用 `SKILL-QI（技能质量指数）` 打分。任何硬门槛未过，都应先修正，不要把“首版可用”伪装成“已经成熟”。

## Resource Routing（资源路由）

- `references/industry-cases.md`：在定义质量目标、解释为什么这样设计时优先读取。
- `references/skill-quality-index.md`：始终作为评分与取舍的主依据。
- `references/experience-management.md`：当输入里有案例、失败、人工返工或历史版本时读取。
- `references/pattern-distillation.md`：当需要把案例升级为规则、模板、护栏或脚本时读取。
- `references/quality-iteration.md`：当需要设计评测、失败归因或自我迭代闭环时读取。
- `references/model-growth.md`：当存在模型升级、能力变化或推理成本变化时读取。
- `references/skill-scorecard.md`：在决定是否可发布、该继续精修还是该收束范围时读取。
- `references/experience-ledger-schema.md`：当要把失败样本、返工记录和基线差值沉淀成统一结构时读取。
- `assets/templates/`：当要稳定输出 `skill brief（技能简报）`、`scorecard（评分卡）`、`backlog（待办）`、`baseline report（基线报告）` 时复用。
- `scripts/scaffold_skill_outputs.py`：当要快速生成一套标准输出骨架时使用。
- `scripts/generate_skill_bundle.py`：当已经拿到结构化案例、失败、约束与升模信号时，用它生成带实质内容的首版 `skill bundle（技能包）`。
- `scripts/score_skill_qi.py`：当要做确定性 `SKILL-QI（技能质量指数）` 评分时使用。
- `scripts/run_trigger_evals.py`：当要计算 `trigger precision（触发精确率）` 与 `trigger recall（触发召回率）` 时使用。
- `scripts/run_round_tests.py`：当要顺序执行 `stress rounds（压力测试轮次）`、验证回归、清理陈旧产物并生成聚合报告时使用。
- `evals/telemetry-evals.yaml`：当要验证 `live telemetry（实时遥测）` 是否已经进入主链路时读取。
- `scripts/validate_skill_utf8.py`：当要调用官方 `quick_validate.py（快速校验脚本）` 并规避编码问题时使用。
- `scripts/generate_openai_yaml_utf8.py`：当要生成 `agents/openai.yaml（界面元数据）` 且输入含中文 `UTF-8（统一编码）` 内容时使用。
- `examples/`：用来校准产物形态与迭代方式，不要原样照抄。

## Packaging Rules（组装规则）

- 正文优先写默认路径，不要先给菜单式选项。
- `SKILL.md` 只保留每次运行都需要的核心信息；细节下沉到 `references（参考资料）`。
- 能被稳定脚本化的重复逻辑，优先沉淀为 `scripts（脚本）` 候选，而不是每次重新写成长段说明。
- 产物结构反复漂移时，优先补 `template（模板）`，不要继续往正文里塞格式约束。
- 每条关键规则都要能追溯到案例、失败、明确风险，或官方规范来源。
- 对高风险或有副作用的 `skill（技能）`，必须显式写出 `apply（应用）`、`verify（验证）`、`rollback（回滚）` 语义。

## Output Contract（输出契约）

每次生成或升级，都要交付以下结果中的全部核心项：

- `skill brief（技能简报）`：目标、非目标、用户意图、边界、风险。
- `skill bundle（技能包）`：`SKILL.md`、`skill.yaml`、`references（参考资料）`、`examples（示例）`、`evals（评测）`。
- `skill scorecard（技能评分卡）`：按 `SKILL-QI（技能质量指数）` 打分，并指出硬门槛是否通过。
- `trigger report（触发报告）`：记录 `precision（精确率）`、`recall（召回率）`、误触发与漏触发。
- `telemetry report（遥测报告）`：记录 `command_count（命令数）`、`wall_clock_ms（耗时毫秒）`、`created_bytes（产物字节数）` 等真实运行指标。
- `baseline comparison（基线对比）`：至少记录 `with_skill（带技能）` 与 `without_skill（不带技能）` 或 `previous_skill（旧技能）` 的质量与成本差值。
- `iteration backlog（迭代待办）`：下一轮最值得修的 `1-3（一到三）` 个问题，而不是泛泛而谈。
- `model upgrade note（升模说明）`：只有在存在模型变化信号时才需要，但一旦需要就必须说明哪些规则应保留、删减或降级。
- `regression report（回归报告）`：在多轮测试下说明哪些失败消失、哪些失败新增、哪些失败持续存在。

## Stop Conditions（停止条件）

仅当以下条件同时满足时，才把当前版本视为“首版可用”：

- `scope（边界）` 与 `non-scope（非边界）` 明确
- `description（描述）`、正文、`references（参考资料）`、`evals（评测）` 之间没有明显冲突
- 至少有一组 `trigger eval（触发评测）`
- 至少有一组 `quality eval（质量评测）`
- 至少有一个 `baseline comparison（基线对比）` 方案
- `skill scorecard（技能评分卡）` 没有硬门槛失败
- 已经写明下一轮将如何根据失败样本、人工反馈或模型升级继续演进
