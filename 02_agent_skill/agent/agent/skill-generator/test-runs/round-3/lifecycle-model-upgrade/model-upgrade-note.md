# multilingual-risk-triage model upgrade note（升模说明）

## Stable Core（稳定内核）
- Audit, rollback, and baseline comparison rules stay mandatory.
- Triage categories remain explicit.

## Model-Sensitive Layer（模型敏感层）
- Long explanations of evidence ordering can be shortened.
- Explicit multi-phase reasoning hints can be reduced.

## Removed Scaffolding（已删除脚手架）
- Legacy step-by-step evidence restatement.
- Older bilingual ordering workaround.

## New Misuse Risks（新增误用风险）
- The stronger model may over-generalize incident classes.
