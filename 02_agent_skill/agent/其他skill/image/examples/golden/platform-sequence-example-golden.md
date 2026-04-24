## Web Prompt

请为 Xiaohongshu 小红书 6 页图文笔记生成一组统一的序列提示词，交付目标是小红书租房书桌改造前后对比图文。第 1 页做封面，要有拦停感和明确主题；第 2 页讲痛点；第 3 页讲步骤 1；第 4 页讲步骤 2；第 5 页展示前后对比证据；第 6 页做结尾并引导收藏。整组都要保持同一个租房书桌空间、同一套 warm neutral palette、同样的 creator-like realism，避免硬广感，封面要考虑标题安全区和移动端阅读。

## Image Input Fields

```yaml
task_mode: sequence-asset-generate
scene_card: xhs-carousel-note-set
platform_surface: xiaohongshu-carousel
delivery_goal: 小红书 6 页图文笔记
subject: 租房书桌改造前后对比
modifiers:
  - swipe-sequence-consistency
  - native-platform-aesthetic
  - ugc-authenticity
  - text-overlay-negative-space
sequence:
  frame_count: 6
  frame_roles:
    - 第 1 页：封面
    - 第 2 页：痛点
    - 第 3 页：步骤 1
    - 第 4 页：步骤 2
    - 第 5 页：前后对比
    - 第 6 页：结尾引导收藏
  cover_goal: feed stop and immediate topic clarity
  ending_role: soft save CTA
  cross_frame_invariants:
    - same rental desk space
    - same warm neutral palette
    - same creator-like realism
    - same mobile-first readability logic
  narrative_progression: problem -> process -> proof -> save
cover_prompt: |
  为第 1 页生成封面，强调 feed stop、主题清晰、title safe zone、native-platform aesthetic 和 creator-like realism。
inner_frame_prompts:
  - frame 2: pain point with the same desk space and mobile-readable hierarchy
  - frame 3: step 1 with believable creator-style realism
  - frame 4: step 2 while preserving the same desk, palette, and layout logic
  - frame 5: before-after proof without hard-ad tone
  - frame 6: save-worthy takeaway and soft save CTA
safe_zone:
  title_safe_zone: stable cover title block
  crop_notes:
    - keep the key desk area away from edge-sensitive crop zones
parameter_suggestions:
  canvas: 6-page mobile-first carousel
  prototype_cover_first: true
  iterations: 2_passes
```
