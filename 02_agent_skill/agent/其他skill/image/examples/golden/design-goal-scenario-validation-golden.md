## Recommended Route

product-hero-baseline

## Why This Route

- Ranked Order: product-hero-baseline > reel-cover-extension > localized-edit-anchor
- Decision Evidence: product-hero-baseline preserves bottle silhouette, 瓶身轮廓, label text, 标签文字, and no packaging drift with the lowest execution risk
- reel-cover-extension adds safe zone and thumbnail pressure, so it remains a stress route rather than the default
- localized-edit-anchor proves Change Only, 只改年份, and source image preserve behavior, but it is not the best route for creating a reusable baseline from scratch

## Web Prompt

请为同一款护肤精华先生成电商商品主图基线，交付目标是后续可延展到社媒封面和局部编辑的上游路线。主体是护肤精华玻璃瓶，必须保持瓶身轮廓、标签文字和包装形态稳定。画面要干净、高级、执行风险低，为之后适配 safe zone、thumbnail 和局部年份修改保留足够一致性。

## Image Input Fields

```yaml
chosen_route: product-hero-baseline
scenario_ranking:
  - product-hero-baseline
  - reel-cover-extension
  - localized-edit-anchor
task_mode: new-generate
scene_card: product-hero
platform_surface: ecommerce-hero
delivery_goal: 电商商品主图
subject: 护肤精华玻璃瓶
main_prompt: |
  为同一款护肤精华建立稳定的电商商品主图基线，保持瓶身轮廓、标签文字与包装形态稳定，画面干净高级，执行风险低，便于后续延展到社媒封面与局部编辑。
must_keep:
  - 瓶身轮廓
  - 标签文字
must_avoid:
  - 包装改形
decision_evidence:
  - lowest execution risk
  - 瓶身轮廓
  - 标签文字
downstream_checks:
  - safe zone
  - thumbnail
  - Change Only
  - source image
parameter_suggestions:
  quality: medium_to_high
  iterations: baseline_first_then_stress_routes
```
