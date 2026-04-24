# federated-incident-governor model upgrade note（升模说明）

## Stable Core（稳定内核）
- Governance boundaries, contradictory constraints, and audit requirements remain explicit.
- Trigger, baseline, and regression hooks stay attached.

## Model-Sensitive Layer（模型敏感层）
- Long-form guidance about sorting multilingual evidence can be shortened.
- Overly explicit prompt choreography can be simplified.

## Removed Scaffolding（已删除脚手架）
- Legacy reminder to restate every contradictory policy twice.
- Older phase-by-phase incident-governor checklist prose.

## New Misuse Risks（新增误用风险）
- The stronger model may incorrectly merge contradictory policy branches.
- The stronger model may over-trust shorter prompts and skip governance caveats.
