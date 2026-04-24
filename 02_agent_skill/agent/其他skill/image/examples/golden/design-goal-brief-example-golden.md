## Recommended Route

product-hero-baseline

## Why This Route

- Ranked Order: product-hero-baseline > reel-cover-extension > localized-edit-anchor
- Decision Evidence: product-hero-baseline keeps bottle silhouette, 瓶身轮廓, label text, 标签文字, and no packaging drift with the lowest execution risk
- reel-cover-extension is still necessary to pressure-test safe zone and thumbnail recognizability, but it is a downstream stress route instead of the default baseline
- localized-edit-anchor verifies Change Only behavior, but it depends on a source image and is not the best starting generator

## Web Prompt

请先为同一款护肤精华建立稳定视觉基线，交付目标是电商商品主图。主体是玻璃瓶护肤精华，重点保持瓶身轮廓稳定、标签文字清晰、包装不改形。画面要干净、高级、适合电商主图，为后续延展到 reel 封面和局部编辑保留足够稳定的上游基线。

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
  先建立同一款护肤精华的稳定电商主图基线，重点保持瓶身轮廓、标签文字与包装形态稳定。画面干净、高级、适合作为后续社媒封面与局部编辑的上游基线。
must_keep:
  - 瓶身轮廓
  - 标签文字
must_avoid:
  - 包装改形
  - 硬广感
soft_preferences:
  - clean premium polish
decision_evidence:
  - transferability
  - execution risk
  - 瓶身轮廓
  - 标签文字
parameter_suggestions:
  quality: medium_to_high
  iterations: baseline_first_then_downstream_adaptations
```
