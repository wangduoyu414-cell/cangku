## Missing Fields

- exact_text
- text hierarchy
- rewrite allowance

## Why They Matter

- `exact_text`: text-heavy poster generation is unstable without literal on-image copy.
- `text hierarchy`: title and subtitle roles affect layout control and spacing.
- `rewrite allowance`: without rewrite rules, the model may invent or alter copy.

## Next Input Template

```yaml
request_type: single_image_brief
task_mode: text-language-edit
scene_card: campaign-key-visual
platform_surface: ecommerce-hero
delivery_goal: 电商活动页头图海报
subject: 新品咖啡豆促销海报
exact_text:
  - null
  - null
success_criteria:
  - 文字必须准确
must_avoid:
  - 额外文字
open_questions:
  - 主标题最终文案是什么
  - 副标题最终文案是什么
  - 文案是否允许改写
```
