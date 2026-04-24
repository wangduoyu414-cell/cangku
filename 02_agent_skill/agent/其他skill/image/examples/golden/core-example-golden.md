## Web Prompt

请为电商活动页头图生成一张高级、克制的咖啡豆促销海报，交付目标是电商活动页头图。主体是新品咖啡豆促销海报，画面要有清晰留白和稳定标题区，不要做成喧闹零售促销风。画面上只能出现两段文字，主标题必须是“晨烘限定”，副标题必须是“单一产地 / 浅烘 / 柑橘调”，不得出现任何别的文字、水印或额外符号。

## Image Input Fields

```yaml
task_mode: text-language-edit
scene_card: campaign-key-visual
platform_surface: ecommerce-hero
delivery_goal: 电商活动页头图海报
subject: 咖啡豆促销海报
main_prompt: |
  为电商活动页头图生成一张高级、克制的咖啡豆促销海报。主体明确，版面干净，保留清晰标题区与电商头图留白。画面只允许出现给定文案，不允许额外文字、水印或多余符号。
exact_text:
  - 晨烘限定
  - 单一产地 / 浅烘 / 柑橘调
must_keep:
  - 只允许上述两段文字
must_avoid:
  - 额外文字
  - 水印
soft_preferences:
  - 高级
  - 克制
parameter_suggestions:
  aspect_ratio: wide ecommerce hero
  quality: medium_to_high
  iterations: 1_to_2_passes_for_text_handling
```
