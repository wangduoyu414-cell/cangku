# multilingual-risk-triage-v2 scorecard（技能评分卡）

## Summary（汇总）

- total_score（总分）: 73/100
- hard_gate_pass（硬门槛通过）: yes
- release_recommendation（发布建议）: beta（测试版）

## Dimensions（维度）

- Scope & Signal（边界与信号）: 4/5, weight（权重） 25, reason（原因）: 迭代后边界保持稳定。
- Knowledge Packaging（知识封装）: 3/5, weight（权重） 15, reason（原因）: 跨文件失败仍需更多样例。
- Instruction-to-Action（指令到行动）: 4/5, weight（权重） 20, reason（原因）: 修复方向清楚。
- Limits & Interfaces（限制与接口）: 4/5, weight（权重） 20, reason（原因）: 接口与约束不乱。
- Learning & Lift（学习闭环与增益）: 3/5, weight（权重） 20, reason（原因）: 真实增益仍需更多证据。

## Hard Checks（硬检查）

- has_non_scope: pass
- has_output_contract: pass
- has_trigger_eval: pass
- has_quality_eval: pass
- has_baseline_plan: pass
- has_simplification_pass: pass
