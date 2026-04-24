## Web Prompt

请生成一张 Instagram reel 封面，交付目标是收纳改造前后对比视频封面。主体必须在缩略图里一眼看出改造前后差异，标题区要安全，关键主体要待在 vertical-safe-zone 中心区域，手机端阅读要清楚。整体要像创作者原生内容，不要做成投流广告模板，也不要让标题区被裁切。

## Image Input Fields

```yaml
task_mode: new-generate
scene_card: instagram-reel-cover
platform_surface: instagram-reel-cover
delivery_goal: Instagram reel 封面
subject: 收纳改造前后对比
main_prompt: |
  生成一张 Instagram reel 封面，让改造前后差异在 thumbnail 中立即可识别。保留清晰 title safe zone，主体放在 vertical-safe-zone 中央区域，强调 mobile readability 与 creator-like realism。
must_keep:
  - 改造前后差异一眼可见
must_avoid:
  - 投流广告感
  - 标题区被裁切
safe_zone:
  title_safe_zone: reserve a clean cover-title-safe-zone
  vertical_safe_zone: keep the key subject inside the vertical-safe-zone
soft_preferences:
  - creator-like realism
parameter_suggestions:
  aspect_ratio: 9:16
  quality: medium_to_high
  iterations: 2_passes_for_thumbnail_readability
```
