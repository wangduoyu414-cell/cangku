# federated-incident-governor scorecard（技能评分卡）

## Summary（汇总）

- total_score（总分）: 84/100
- hard_gate_pass（硬门槛通过）: yes
- release_recommendation（发布建议）: beta（测试版）

## Dimensions（维度）

- Scope & Signal（边界与信号）: 4/5, weight（权重） 25, reason（原因）: 复杂输入下边界仍清楚。
- Knowledge Packaging（知识封装）: 4/5, weight（权重） 15, reason（原因）: 长输入被有效压缩。
- Instruction-to-Action（指令到行动）: 4/5, weight（权重） 20, reason（原因）: 产物完整且可执行。
- Limits & Interfaces（限制与接口）: 5/5, weight（权重） 20, reason（原因）: 治理边界表达很强。
- Learning & Lift（学习闭环与增益）: 4/5, weight（权重） 20, reason（原因）: 基线与后续演进清楚。

## Hard Checks（硬检查）

- has_non_scope: pass
- has_output_contract: pass
- has_trigger_eval: pass
- has_quality_eval: pass
- has_baseline_plan: pass
- has_simplification_pass: pass
