# simplify-after-model-upgrade（模型升级后的技能瘦身）

## 输入信号

- 新模型在长上下文、跨工具编排和格式遵守上明显更强
- 旧版 `skill（技能）` 有大量“逐步想、逐步确认、逐步输出”的微观提示
- 旧版 `evals（评测）` 通过率已经高，但平均成本偏高

## 生成器应该产出

- 一次 `simplification pass（简化复核）`
- 一个重新分层后的 `stable core（稳定内核）` / `model-sensitive layer（模型敏感层）`
- 一个新的 `baseline comparison（基线对比）`，证明删减后质量不降、成本更低
- 一份明确说明“哪些旧规则已经可以退休”的 `model upgrade note（升模说明）`

## 重点观察

- 是否优先删除冗余分步提示，而不是盲目继续加规则
- 是否保留验证、边界和风险升级点
