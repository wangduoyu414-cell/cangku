# release-review-orchestrator scorecard（技能评分卡）

## Summary（汇总）

- total_score（总分）: 73/100
- hard_gate_pass（硬门槛通过）: yes
- release_recommendation（发布建议）: beta（测试版）

## Dimensions（维度）

- Scope & Signal（边界与信号）: 4/5, weight（权重） 25, reason（原因）: 触发与非触发边界已明确。
- Knowledge Packaging（知识封装）: 3/5, weight（权重） 15, reason（原因）: 知识封装有效，但样例还不够多。
- Instruction-to-Action（指令到行动）: 4/5, weight（权重） 20, reason（原因）: 默认路径与基线说明清晰。
- Limits & Interfaces（限制与接口）: 4/5, weight（权重） 20, reason（原因）: 输入输出和风险边界较清楚。
- Learning & Lift（学习闭环与增益）: 3/5, weight（权重） 20, reason（原因）: 迭代闭环存在，但真实数据仍少。

## Hard Checks（硬检查）

- has_non_scope: pass
- has_output_contract: pass
- has_trigger_eval: pass
- has_quality_eval: pass
- has_baseline_plan: pass
- has_simplification_pass: pass
