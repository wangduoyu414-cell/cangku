# federated-incident-governor failure attribution（失败归因）

## Failure Cluster（失败簇）
- Stale outputs masked true failures.
- Cross-round reporting was too shallow to support governance review.

## Symptoms（症状）
- Old files made rounds appear healthier than they were.
- Governance reviewers could not see fixed versus new failures.

## Affected SKILL-QI Dimensions（受影响维度）
- Knowledge Packaging（知识封装）
- Learning & Lift（学习闭环与增益）

## Suspected Root Cause（疑似根因）
- Cleanup and regression logic were absent or too weak.

## Repair Direction（修复方向）
- Enforce per-round cleanup and stale detection.
- Generate explicit regression reports between rounds.
