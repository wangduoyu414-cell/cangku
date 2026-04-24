## Web Prompt

请在现有活动海报上做手术式局部修改，交付目标是修改海报年份且不重做版式。只把日期区域里的 2025 改成 2026，其他内容一律保持不变。新年份要匹配原有字重、字距和样式，构图、配色、产品图、品牌标志、其余文字和背景都不能漂移。

## Image Input Fields

```yaml
task_mode: localized-edit
scene_card: campaign-key-visual
platform_surface: general
delivery_goal: 修改活动海报年份
subject: 现有海报上的年份文本
main_prompt: |
  在现有活动海报上只修改日期区域，将 2025 改成 2026。保持原有版式、构图、配色、产品图、品牌标志、其余文字与背景完全不变，新年份需要匹配原始字重、字距与视觉权重。
edit_scope:
  change_only:
    - 将 2025 改为 2026
  preserve:
    - 构图
    - 配色
    - 产品图
    - 品牌标志
    - 其余文字
  source_role: source image is the fidelity anchor
  surgical_or_flexible: surgical
references:
  - role: source_image
    description: source image: fidelity anchor
must_avoid:
  - 重新设计版式
  - 改变背景
parameter_suggestions:
  quality: medium_to_high
  iterations: 1_to_2_passes
```
