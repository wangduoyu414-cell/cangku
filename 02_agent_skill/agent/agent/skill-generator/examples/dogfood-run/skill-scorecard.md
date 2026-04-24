# review-fix-planner scorecard（技能评分卡）

## Summary（汇总）

- total_score（总分）: 80/100
- hard_gate_pass（硬门槛通过）: yes
- release_recommendation（发布建议）: beta（测试版）

## Dimensions（维度）

- Scope & Signal（边界与信号）: 4/5, weight（权重） 25, reason（原因）: 边界、非边界与触发集都已明确。
- Knowledge Packaging（知识封装）: 4/5, weight（权重） 15, reason（原因）: 核心正文精简，长内容下沉到 references（参考资料） 与 templates（模板）。
- Instruction-to-Action（指令到行动）: 4/5, weight（权重） 20, reason（原因）: 默认路径、评测、评分和模板输出都已就位。
- Limits & Interfaces（限制与接口）: 4/5, weight（权重） 20, reason（原因）: 输入输出、停止条件、基线对比和升级点都已定义。
- Learning & Lift（学习闭环与增益）: 4/5, weight（权重） 20, reason（原因）: 有失败归因、基线计划和升模瘦身路径，但真实样本还不够多。

## Hard Checks（硬检查）

- has_non_scope: pass
- has_output_contract: pass
- has_trigger_eval: pass
- has_quality_eval: pass
- has_baseline_plan: pass
- has_simplification_pass: pass
