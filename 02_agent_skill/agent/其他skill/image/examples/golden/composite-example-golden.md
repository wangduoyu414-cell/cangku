## Web Prompt

请做一张品牌广告图，交付目标是品牌广告图。把图 1 的产品主体自然放进图 2 的厨房场景里，图 3 只作为暖色光线和色调参考，不能混用角色。产品包装必须保持不变，整体要像真实拍摄在该场景中，而不是贴上去。需要同时匹配光线方向、尺度和透视，不要新增品牌元素。

## Image Input Fields

```yaml
task_mode: multi-image-composite
scene_card: campaign-key-visual
platform_surface: general
delivery_goal: 品牌广告图
subject: 将图1产品放入图2厨房场景，并参考图3的暖色氛围
main_prompt: |
  生成一张品牌广告图，将图 1 的产品自然放入图 2 的厨房台面场景中，并仅参考图 3 的暖色光线与色调氛围。保持产品包装不变，确保光线、尺度、透视和接触阴影真实可信。
references:
  - role: product_subject
    description: image 1: product_subject
  - role: background_scene
    description: image 2: background_scene
  - role: style_reference
    description: image 3: style_reference
must_keep:
  - 产品包装不变
must_avoid:
  - 新增品牌元素
soft_preferences:
  - warm sunset atmosphere
  - believable kitchen realism
  - polished brand-ad finish
parameter_suggestions:
  quality: medium_to_high
  iterations: 2_passes_for_integration_realism
```
