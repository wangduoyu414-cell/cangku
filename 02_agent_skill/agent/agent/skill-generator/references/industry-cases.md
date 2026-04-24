# industry-cases（行业案例）

## OpenAI（开放人工智能） / Codex（代码智能体）

- OpenAI（开放人工智能） 在《Introducing the Codex app》中把 `skills（技能）` 定义成对 `instructions（指令）`、`resources（资源）`、`scripts（脚本）` 的打包，用来让 Codex（代码智能体） 稳定连接工具、运行 `workflow（工作流）`、按团队偏好完成任务。
- `openai/skills` 仓库把 `skill（技能）` 明确组织成目录资产，而不是一段孤立提示词。
- `figma-implement-design` 这类公开案例的优秀点很稳定：边界切分明确、前置条件明确、步骤顺序固定、验证清单具体、与相邻 `skill（技能）` 的切换规则清晰。

## Anthropic（人择智能） / Claude Code（代码助手）

- Claude Code（代码助手） 官方把 `SKILL.md` 定义为 `YAML frontmatter（元数据头）` + `markdown body（正文）`；其中 `description（描述）` 决定自动加载时机。
- 官方允许用 `disable-model-invocation（禁止模型自动触发）`、`allowed-tools（允许工具）`、`context: fork（隔离上下文）` 来控制触发方、工具边界与上下文隔离。
- 官方建议把 `SKILL.md` 保持在 `500（五百）` 行以内，并把长资料拆到 `supporting files（支撑文件）`，说明优秀 `skill（技能）` 必须重视上下文预算。

## GitHub（代码托管平台） / Copilot（副驾驶）

- GitHub（代码托管平台） 把 `skills（技能）` 定义成 `instructions（指令）`、`scripts（脚本）`、`resources（资源）` 的目录；只有在任务与 `description（描述）` 匹配时才注入上下文。
- 官方明确区分 `skills（技能）` 与 `custom instructions（通用指令）`：常驻、几乎每次都需要的规则放 `custom instructions（通用指令）`，任务专用知识放 `skills（技能）`。
- 示例 `github-actions-failure-debugging` 展示了优秀 `skill（技能）` 的另一个特征：工具顺序、回退路径与验证动作都能直接执行。

## Agent Skills（代理技能开放标准）

- `description（描述）` 是触发主入口；如果触发不准，正文再强也很难发挥价值。
- 官方建议用 `should-trigger（应触发）` / `should-not-trigger（不应触发）` 数据集、重复运行、`train/validation split（训练/验证拆分）` 来优化触发。
- 对输出质量，官方建议做 `with_skill（带技能）` vs `without_skill（不带技能）` 或 `previous_skill（旧技能）` 的 `baseline comparison（基线对比）`，并记录 `assertions（断言）`、`grading（评分）`、`timing（时延）`、`benchmark（基准汇总）`。

## 提纯结论

行业优秀案例最后都收敛到五件事：

1. 先解决触发，再解决正文。
2. 先定义边界和接口，再堆能力。
3. 先给默认路径与验证闭环，再给补充知识。
4. 只把模型不知道、且高价值的信息放进核心上下文。
5. 每次迭代都要能回答“比没有这个 `skill（技能）` 好在哪里”。

## Sources（来源）

- OpenAI（开放人工智能）: https://openai.com/index/introducing-the-codex-app/
- OpenAI（开放人工智能） Skills（技能） 仓库: https://github.com/openai/skills
- OpenAI（开放人工智能） 示例 `figma-implement-design`: https://raw.githubusercontent.com/openai/skills/main/skills/.curated/figma-implement-design/SKILL.md
- Anthropic（人择智能）: https://code.claude.com/docs/en/skills
- GitHub（代码托管平台）: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-skills
- Agent Skills（代理技能开放标准） 最佳实践: https://agentskills.io/skill-creation/best-practices
- Agent Skills（代理技能开放标准） 触发优化: https://agentskills.io/skill-creation/optimizing-descriptions
- Agent Skills（代理技能开放标准） 质量评测: https://agentskills.io/skill-creation/evaluating-skills
