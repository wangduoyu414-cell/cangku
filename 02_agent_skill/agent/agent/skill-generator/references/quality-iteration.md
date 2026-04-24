# quality-iteration（质量迭代）

首版 `skill（技能）` 不追求“写得很全”，而追求“能持续变好”。

## 最小闭环

每一轮都要同时跑三类 `eval（评测）`：

1. `trigger eval（触发评测）`  
   测 `description（描述）` 是否在该触发时触发、不该触发时保持沉默。

2. `quality eval（质量评测）`  
   测产物是否满足边界、步骤、格式、验证和可用性要求。

3. `baseline comparison（基线对比）`  
   同一任务至少比较：
   - `with_skill（带技能）`
   - `without_skill（不带技能）` 或 `previous_skill（旧版本技能）`

## 推荐循环

1. 定义 `acceptance bar（验收门槛）`
2. 准备 `trigger set（触发集）` 与 `task set（任务集）`
3. 生成或升级当前 `skill（技能）`
4. 跑 `with_skill（带技能）` 与 `baseline（基线）`
5. 记录 `pass rate（通过率）`、`tokens（令牌）`、`duration（时长）`
6. 收集 `failure cluster（失败簇）`、`human feedback（人工反馈）`、`execution trace（执行轨迹）`
7. 只做最小必要修订
8. 在新的 `iteration-N（第 N 轮迭代）` 目录复跑

## 失败归因

把失败先映射到 `SKILL-QI（技能质量指数）` 维度，再决定改哪里：

- `trigger miss（触发失准）`、`false trigger（误触发）`：优先改 `description（描述）`
- `scope bleed（边界外溢）`、`output drift（输出漂移）`：优先改正文与 `output contract（输出契约）`
- 重复发明同样逻辑：沉淀到 `scripts（脚本）` 或 `template（模板）`
- 细节过多、成本偏高：删减核心正文，把细节下沉到 `references（参考资料）`
- 新模型已能自然完成旧步骤：把旧提示降级为 `model-sensitive layer（模型敏感层）` 或删除

## 触发评测建议

- 至少 `8-10（八到十）` 条 `should-trigger（应触发）`
- 至少 `8-10（八到十）` 条 `should-not-trigger（不应触发）`
- 每条至少跑 `3（三）` 次
- 保留 `train/validation split（训练/验证拆分）`，避免把描述优化成只会记住样例

## 质量评测建议

- 至少覆盖 `happy path（正常路径）`
- 至少覆盖 `edge case（边界场景）`
- 至少覆盖 `failure replay（失败回放）`
- 对可机械检查的要求写成 `assertion（断言）`
- 每个 `assertion（断言）` 必须带 `evidence（证据）`

## 停止信号

当出现以下任一情况，可以暂停继续加规则：

- 多轮迭代后 `delta（增益）` 已趋近于零
- 新增规则只提升个别样例，却恶化泛化
- 成本增长明显大于质量增益
- 问题本质来自模型能力、工具缺口或错误测试，而不是 `skill（技能）` 设计
