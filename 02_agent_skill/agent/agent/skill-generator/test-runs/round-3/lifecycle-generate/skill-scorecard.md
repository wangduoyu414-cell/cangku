# multilingual-risk-triage scorecard（技能评分卡）

## Summary（汇总）

- total_score（总分）: 85/100
- hard_gate_pass（硬门槛通过）: yes
- release_recommendation（发布建议）: production-ready（可正式使用）

## Dimensions（维度）

- Scope & Signal（边界与信号）: 5/5, weight（权重） 25, reason（原因）: 多语言触发边界强。
- Knowledge Packaging（知识封装）: 4/5, weight（权重） 15, reason（原因）: 知识封装较紧凑。
- Instruction-to-Action（指令到行动）: 4/5, weight（权重） 20, reason（原因）: 默认路径清晰。
- Limits & Interfaces（限制与接口）: 4/5, weight（权重） 20, reason（原因）: 边界与风险明确。
- Learning & Lift（学习闭环与增益）: 4/5, weight（权重） 20, reason（原因）: 基线与迭代说明已存在。

## Hard Checks（硬检查）

- has_non_scope: pass
- has_output_contract: pass
- has_trigger_eval: pass
- has_quality_eval: pass
- has_baseline_plan: pass
- has_simplification_pass: pass
