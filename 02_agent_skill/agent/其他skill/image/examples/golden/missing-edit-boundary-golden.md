## Missing Fields

- edit_scope.change_only
- edit_scope.preserve
- source image role

## Why They Matter

- `edit_scope.change_only`: local edits drift without a bounded change target.
- `edit_scope.preserve`: preserve-sensitive edits fail when unchanged regions are not explicitly anchored.
- `source image role`: the source image must be named as the fidelity anchor for surgical edits.

## Next Input Template

```yaml
request_type: edit_brief
task_mode: localized-edit
scene_card: campaign-key-visual
platform_surface: general
delivery_goal: 修改活动海报年份
subject: 现有海报上的年份文本
edit_scope:
  change_only:
    - null
  preserve:
    - null
  source_role: source image is the fidelity anchor
  surgical_or_flexible: surgical
open_questions:
  - 只改哪一段文字或区域
  - 哪些元素必须完全不变
```
