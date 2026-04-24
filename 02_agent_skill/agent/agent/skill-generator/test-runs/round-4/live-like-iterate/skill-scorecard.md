# federated-incident-governor-v2 scorecard（技能评分卡）

## Summary（汇总）

- total_score（总分）: 84/100
- hard_gate_pass（硬门槛通过）: yes
- release_recommendation（发布建议）: beta（测试版）

## Dimensions（维度）

- Scope & Signal（边界与信号）: 4/5, weight（权重） 25, reason（原因）: 失败修复后仍保持边界。
- Knowledge Packaging（知识封装）: 4/5, weight（权重） 15, reason（原因）: 回归与陈旧产物信息被结构化。
- Instruction-to-Action（指令到行动）: 4/5, weight（权重） 20, reason（原因）: 修复方向与待办清晰。
- Limits & Interfaces（限制与接口）: 5/5, weight（权重） 20, reason（原因）: 治理与回归接口都很清晰。
- Learning & Lift（学习闭环与增益）: 4/5, weight（权重） 20, reason（原因）: 回归报告支持持续改进。

## Hard Checks（硬检查）

- has_non_scope: pass
- has_output_contract: pass
- has_trigger_eval: pass
- has_quality_eval: pass
- has_baseline_plan: pass
- has_simplification_pass: pass
