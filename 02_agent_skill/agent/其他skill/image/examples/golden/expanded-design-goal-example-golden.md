## Design Goal

建立一个稳定护肤精华视觉基线，用于电商主图与社媒封面；主要派生假设是先验证最可迁移的上游产品路线。

## Scenario Matrix

- Scenario 1: product-hero-baseline | route type: new-generate | scene card: product-hero | platform surface: ecommerce-hero | changed risk surface: reusable anchor route | Scenario Source: derived from design_goal_brief
- Scenario 2: reel-cover-extension | route type: new-generate | scene card: instagram-reel-cover | platform surface: instagram-reel-cover | changed risk surface: platform preview pressure | Scenario Source: derived from design_goal_brief
- Scenario 3: localized-edit-anchor | route type: localized-edit | scene card: campaign-key-visual | platform surface: general | changed risk surface: preserve rigidity | Scenario Source: derived from design_goal_brief

## Scenario Samples

- Scenario 1
  - route choice: new-generate
  - expected output shape: Expanded Single-Image Prompt Package
  - scenario-critical evidence: bottle silhouette, label text, no packaging drift
  - stress case: tests the most reusable upstream route
- Scenario 2
  - route choice: new-generate
  - expected output shape: Expanded Single-Image Prompt Package
  - scenario-critical evidence: safe zone, thumbnail recognizability, mobile readability
  - stress case: tests whether the baseline survives social cover constraints
- Scenario 3
  - route choice: localized-edit
  - expected output shape: Expanded Single-Image Prompt Package
  - scenario-critical evidence: Change Only the date area, preserve all other content, source image as fidelity anchor
  - stress case: tests preserve-sensitive adaptation risk

## Cross-Check Findings

- Cross-Scenario Invariants:
  - the same serum bottle identity
  - label text should remain stable where visible
  - packaging shape must not drift
- Ranked Order:
  - product-hero-baseline
  - reel-cover-extension
  - localized-edit-anchor
- Decision Evidence:
  - product-hero-baseline best preserves bottle silhouette and label text while staying low risk
  - reel-cover-extension is necessary to pressure-test safe zone and thumbnail behavior but is less reusable as the first route
  - localized-edit-anchor confirms preserve behavior but depends on an existing source image
- agreements that held across scenarios:
  - baseline quality depends on evidence fidelity more than visual variety
- disagreements that materially change the recommendation:
  - whether platform preview pressure should outrank upstream product fidelity
- which disagreement was resolved by source evidence:
  - the shared requirement for stable bottle silhouette and label text made the ecommerce product route the safer baseline
- whether each scenario kept its critical evidence visible through the comparison:
  - yes

## Recommended Baseline

Use `product-hero-baseline` as the default starting point because it best balances transferability, execution risk, and evidence fidelity for the shared serum subject.

## Failure Risks

- the reel-cover adaptation may still fail thumbnail clarity if the baseline is adapted too literally
- the localized-edit route may hide drift outside the edited area if preserve instructions weaken
- the product baseline may drift into packaging redesign if silhouette fidelity is not repeated

## Next Patches

- Derive the reel-cover prompt from the product baseline, but add stricter thumbnail and safe-zone checks.
- Keep the same product baseline, but repeat label-text fidelity in every downstream route.
- Use the localized-edit route as a preserve test after the baseline is established.

## Acceptance Checklist

- derived scenarios are fully specified
- ranked order is explicit
- baseline reasoning cites shared evidence
- platform and preserve stress routes remain visible
- the recommendation matches the original design goal
