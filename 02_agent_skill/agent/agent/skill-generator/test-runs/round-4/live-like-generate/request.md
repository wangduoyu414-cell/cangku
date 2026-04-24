# federated-incident-governor request（技能请求）

## Mode（模式）
- generate

## Summary（摘要）
- Generate a reusable federated incident-governor skill from long, messy, multilingual, policy-heavy inputs with contradictory constraints.

## Constraints（约束）
- Must keep UTF-8（统一编码） safe content across Chinese（中文）, English（英文）, and mixed glossary evidence.
- Must preserve contradictory constraints instead of flattening them.
- Must keep governance boundaries explicit.

## Quality Goals（质量目标）
- Higher semantic completeness under messy real-like inputs.
- Higher trigger precision against policy-summary near misses.
- Generate a complete bundle without empty placeholders.
