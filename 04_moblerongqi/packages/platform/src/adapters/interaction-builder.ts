// 交互序列构建器 — 构建完整的浏览器交互流程

import type { Platform, BrowserAction } from '@creator-os/core';
import type { InteractionParams } from './index.js';
import { getAdapter } from './index.js';

// ============ 交互阶段类型 ============

export interface InteractionPhase {
  name: string;
  actions: BrowserAction[];
  expectedState?: string;
  timeoutMs?: number;
}

export interface InteractionSequence {
  platform: Platform;
  type: InteractionParams['type'];
  targetId: string;
  phases: InteractionPhase[];
  totalEstimatedMs: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// ============ 等待辅助函数 ============

function wait(ms: number): BrowserAction {
  return { type: 'evaluate', params: { expression: `new Promise(r => setTimeout(r, ${ms}))` } };
}

function humanDelay(min: number, max: number): BrowserAction {
  return { type: 'evaluate', params: { expression: `new Promise(r => setTimeout(r, ${min} + Math.random() * ${max - min}))` } };
}

function scrollDown(distance: number): BrowserAction {
  return { type: 'scroll', params: { direction: 'down', distance } };
}

function scrollUp(distance: number): BrowserAction {
  return { type: 'scroll', params: { direction: 'up', distance } };
}

function evaluate(script: string): BrowserAction {
  return { type: 'evaluate', params: { expression: script } };
}

// ============ 通用交互阶段构建 ============

function buildNavigationPhase(targetUrl: string, platform: Platform): InteractionPhase {
  return {
    name: 'navigation',
    actions: [
      { type: 'goto', params: { url: targetUrl } },
      { type: 'waitForSelector', params: { selector: 'body', timeout: 15000 } },
      humanDelay(2000, 4000),
    ],
    expectedState: 'page_loaded',
    timeoutMs: 20000,
  };
}

function buildScrollPhase(depth: number, interval: number): InteractionPhase {
  const actions: BrowserAction[] = [];
  for (let i = 0; i < depth; i++) {
    actions.push(scrollDown(300));
    actions.push(wait(interval + Math.random() * 1000));
  }
  return {
    name: 'scroll',
    actions,
    expectedState: 'content_visible',
  };
}

function buildConfirmationPhase(selector: string): InteractionPhase {
  return {
    name: 'confirmation',
    actions: [
      { type: 'waitForSelector', params: { selector, timeout: 10000 } },
      humanDelay(500, 1500),
    ],
    expectedState: 'action_confirmed',
    timeoutMs: 15000,
  };
}

// ============ 点赞交互 ============

function buildDouyinLike(targetId: string): InteractionSequence {
  const phases: InteractionPhase[] = [
    buildNavigationPhase(`https://www.douyin.com/video/${targetId}`, 'douyin'),
    buildScrollPhase(2, 1500),
    {
      name: 'like',
      actions: [
        evaluate(`
          const likeBtn = document.querySelector('[data-e2e="like-button"], .like-btn, [class*="like"]');
          if (likeBtn) {
            likeBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
          }
        `),
        humanDelay(500, 1000),
        { type: 'click', params: { selector: '[data-e2e="like-button"], .like-btn, [class*="like"]' } },
        humanDelay(800, 1500),
        evaluate(`
          const btn = document.querySelector('[data-e2e="like-button"], .like-btn, [class*="like"]');
          if (btn && (btn.classList.contains('liked') || btn.getAttribute('aria-pressed') === 'true')) {
            window.__LAST_ACTION_RESULT__ = { success: true, type: 'like' };
          } else {
            window.__LAST_ACTION_RESULT__ = { success: false, error: 'Like not registered' };
          }
        `),
      ],
      expectedState: 'like_confirmed',
      timeoutMs: 10000,
    },
  ];

  return {
    platform: 'douyin',
    type: 'like',
    targetId,
    phases,
    totalEstimatedMs: 35000,
    riskLevel: 'low',
  };
}

function buildXiaohongshuLike(targetId: string): InteractionSequence {
  const phases: InteractionPhase[] = [
    buildNavigationPhase(`https://www.xiaohongshu.com/discovery/item/${targetId}`, 'xiaohongshu'),
    buildScrollPhase(2, 1500),
    {
      name: 'like',
      actions: [
        evaluate(`
          const likeBtn = document.querySelector('[data-e2e="like-btn"], .like-btn');
          if (likeBtn) likeBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(500, 1000),
        { type: 'click', params: { selector: '[data-e2e="like-btn"], .like-btn' } },
        humanDelay(800, 1500),
        evaluate(`
          const btn = document.querySelector('[data-e2e="like-btn"], .like-btn');
          window.__LAST_ACTION_RESULT__ = btn ? { success: true, type: 'like' } : { success: false, error: 'Button not found' };
        `),
      ],
      expectedState: 'like_confirmed',
      timeoutMs: 10000,
    },
  ];

  return {
    platform: 'xiaohongshu',
    type: 'like',
    targetId,
    phases,
    totalEstimatedMs: 35000,
    riskLevel: 'medium',
  };
}

function buildWeiboLike(targetId: string): InteractionSequence {
  const phases: InteractionPhase[] = [
    buildNavigationPhase(`https://weibo.com/${targetId}`, 'weibo'),
    buildScrollPhase(2, 1500),
    {
      name: 'like',
      actions: [
        evaluate(`
          const likeBtn = document.querySelector('[data-e2e="like-btn"], .woo-like-icon');
          if (likeBtn) likeBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(500, 1000),
        { type: 'click', params: { selector: '[data-e2e="like-btn"], .woo-like-icon' } },
        humanDelay(800, 1500),
      ],
      expectedState: 'like_confirmed',
      timeoutMs: 10000,
    },
  ];

  return {
    platform: 'weibo',
    type: 'like',
    targetId,
    phases,
    totalEstimatedMs: 30000,
    riskLevel: 'low',
  };
}

function buildBilibiliLike(targetId: string): InteractionSequence {
  const phases: InteractionPhase[] = [
    buildNavigationPhase(`https://www.bilibili.com/video/${targetId}`, 'bilibili'),
    buildScrollPhase(2, 1500),
    {
      name: 'like',
      actions: [
        evaluate(`
          const likeBtn = document.querySelector('.like-btn, .bili-dyn-action-icon--like');
          if (likeBtn) likeBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(500, 1000),
        { type: 'click', params: { selector: '.like-btn, .bili-dyn-action-icon--like' } },
        humanDelay(800, 1500),
      ],
      expectedState: 'like_confirmed',
      timeoutMs: 10000,
    },
  ];

  return {
    platform: 'bilibili',
    type: 'like',
    targetId,
    phases,
    totalEstimatedMs: 30000,
    riskLevel: 'low',
  };
}

// ============ 关注交互 ============

function buildDouyinFollow(targetId: string): InteractionSequence {
  const phases: InteractionPhase[] = [
    buildNavigationPhase(`https://www.douyin.com/user/${targetId}`, 'douyin'),
    {
      name: 'follow',
      actions: [
        evaluate(`
          const followBtn = document.querySelector('[data-e2e="follow-button"], .follow-btn');
          if (followBtn) followBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(500, 1500),
        { type: 'click', params: { selector: '[data-e2e="follow-button"], .follow-btn' } },
        humanDelay(1000, 2000),
        evaluate(`
          const btn = document.querySelector('[data-e2e="follow-button"], .follow-btn');
          const isFollowing = btn?.textContent?.includes('已关注') || btn?.classList.contains('following');
          window.__LAST_ACTION_RESULT__ = { success: isFollowing, type: 'follow' };
        `),
      ],
      expectedState: 'follow_confirmed',
      timeoutMs: 15000,
    },
  ];

  return {
    platform: 'douyin',
    type: 'follow',
    targetId,
    phases,
    totalEstimatedMs: 25000,
    riskLevel: 'medium',
  };
}

function buildXiaohongshuFollow(targetId: string): InteractionSequence {
  const phases: InteractionPhase[] = [
    buildNavigationPhase(`https://www.xiaohongshu.com/user/profile/${targetId}`, 'xiaohongshu'),
    {
      name: 'follow',
      actions: [
        evaluate(`
          const followBtn = document.querySelector('[data-e2e="follow-btn"], .follow-btn');
          if (followBtn) followBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(500, 1500),
        { type: 'click', params: { selector: '[data-e2e="follow-btn"], .follow-btn' } },
        humanDelay(1000, 2000),
        evaluate(`
          const btn = document.querySelector('[data-e2e="follow-btn"], .follow-btn');
          window.__LAST_ACTION_RESULT__ = btn ? { success: true, type: 'follow' } : { success: false, error: 'Button not found' };
        `),
      ],
      expectedState: 'follow_confirmed',
      timeoutMs: 15000,
    },
  ];

  return {
    platform: 'xiaohongshu',
    type: 'follow',
    targetId,
    phases,
    totalEstimatedMs: 25000,
    riskLevel: 'high',
  };
}

// ============ 评论交互 ============

function buildDouyinComment(targetId: string, content: string): InteractionSequence {
  const phases: InteractionPhase[] = [
    buildNavigationPhase(`https://www.douyin.com/video/${targetId}`, 'douyin'),
    buildScrollPhase(3, 1500),
    {
      name: 'open_comment',
      actions: [
        evaluate(`
          const commentBtn = document.querySelector('[data-e2e="comment-icon"], .comment-icon');
          if (commentBtn) commentBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(500, 1000),
        { type: 'click', params: { selector: '[data-e2e="comment-icon"], .comment-icon' } },
        humanDelay(1500, 3000),
      ],
      expectedState: 'comment_input_visible',
      timeoutMs: 10000,
    },
    {
      name: 'type_comment',
      actions: [
        evaluate(`
          const input = document.querySelector('[data-e2e="comment-input"], .comment-input textarea');
          if (input) input.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(300, 800),
        { type: 'click', params: { selector: '[data-e2e="comment-input"], .comment-input textarea' } },
        humanDelay(200, 500),
        { type: 'type', params: { selector: '[data-e2e="comment-input"], .comment-input textarea', text: content } },
        humanDelay(500, 1500),
      ],
      expectedState: 'comment_typed',
      timeoutMs: 15000,
    },
    {
      name: 'submit_comment',
      actions: [
        { type: 'click', params: { selector: '[data-e2e="comment-submit"], .comment-submit' } },
        humanDelay(1500, 3000),
        evaluate(`
          const error = document.querySelector('.error-tip, [data-e2e="error"]');
          window.__LAST_ACTION_RESULT__ = error
            ? { success: false, error: error.textContent }
            : { success: true, type: 'comment' };
        `),
      ],
      expectedState: 'comment_submitted',
      timeoutMs: 15000,
    },
  ];

  return {
    platform: 'douyin',
    type: 'comment',
    targetId,
    phases,
    totalEstimatedMs: 60000,
    riskLevel: 'high',
  };
}

function buildXiaohongshuComment(targetId: string, content: string): InteractionSequence {
  const phases: InteractionPhase[] = [
    buildNavigationPhase(`https://www.xiaohongshu.com/discovery/item/${targetId}`, 'xiaohongshu'),
    buildScrollPhase(3, 1500),
    {
      name: 'open_comment',
      actions: [
        evaluate(`
          const commentBtn = document.querySelector('[data-e2e="comment-btn"]');
          if (commentBtn) commentBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(500, 1000),
        { type: 'click', params: { selector: '[data-e2e="comment-btn"]' } },
        humanDelay(2000, 4000),
      ],
      expectedState: 'comment_input_visible',
      timeoutMs: 10000,
    },
    {
      name: 'type_comment',
      actions: [
        evaluate(`
          const input = document.querySelector('.comment-input textarea');
          if (input) input.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(300, 800),
        { type: 'click', params: { selector: '.comment-input textarea' } },
        humanDelay(200, 500),
        { type: 'type', params: { selector: '.comment-input textarea', text: content } },
        humanDelay(500, 1500),
      ],
      expectedState: 'comment_typed',
      timeoutMs: 15000,
    },
    {
      name: 'submit_comment',
      actions: [
        { type: 'click', params: { selector: '[data-e2e="comment-submit"], .comment-submit' } },
        humanDelay(2000, 4000),
        evaluate(`
          const error = document.querySelector('.error, [data-e2e="error"]');
          window.__LAST_ACTION_RESULT__ = error
            ? { success: false, error: error.textContent }
            : { success: true, type: 'comment' };
        `),
      ],
      expectedState: 'comment_submitted',
      timeoutMs: 20000,
    },
  ];

  return {
    platform: 'xiaohongshu',
    type: 'comment',
    targetId,
    phases,
    totalEstimatedMs: 90000,
    riskLevel: 'high',
  };
}

// ============ 收藏交互 ============

function buildDouyinBookmark(targetId: string): InteractionSequence {
  const phases: InteractionPhase[] = [
    buildNavigationPhase(`https://www.douyin.com/video/${targetId}`, 'douyin'),
    buildScrollPhase(2, 1500),
    {
      name: 'bookmark',
      actions: [
        evaluate(`
          const btn = document.querySelector('[data-e2e="collect-button"], .collect-btn');
          if (btn) btn.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(500, 1000),
        { type: 'click', params: { selector: '[data-e2e="collect-button"], .collect-btn' } },
        humanDelay(1000, 2000),
      ],
      expectedState: 'bookmark_confirmed',
      timeoutMs: 10000,
    },
  ];

  return {
    platform: 'douyin',
    type: 'bookmark',
    targetId,
    phases,
    totalEstimatedMs: 35000,
    riskLevel: 'low',
  };
}

// ============ 分享交互 ============

function buildDouyinShare(targetId: string): InteractionSequence {
  const phases: InteractionPhase[] = [
    buildNavigationPhase(`https://www.douyin.com/video/${targetId}`, 'douyin'),
    buildScrollPhase(2, 1500),
    {
      name: 'open_share',
      actions: [
        evaluate(`
          const btn = document.querySelector('[data-e2e="share-button"], .share-btn');
          if (btn) btn.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(500, 1000),
        { type: 'click', params: { selector: '[data-e2e="share-button"], .share-btn' } },
        humanDelay(1500, 3000),
      ],
      expectedState: 'share_menu_open',
      timeoutMs: 10000,
    },
    {
      name: 'copy_link',
      actions: [
        { type: 'click', params: { selector: '[data-e2e="share-copy"], .share-copy-link' } },
        humanDelay(800, 1500),
        evaluate(`
          const copied = document.querySelector('.copied, [data-e2e="copied"]');
          window.__LAST_ACTION_RESULT__ = { success: Boolean(copied), type: 'share', link: window.location.href };
        `),
      ],
      expectedState: 'link_copied',
      timeoutMs: 10000,
    },
  ];

  return {
    platform: 'douyin',
    type: 'share',
    targetId,
    phases,
    totalEstimatedMs: 45000,
    riskLevel: 'low',
  };
}

// ============ 私信交互 ============

function buildDouyinDM(targetId: string, content: string): InteractionSequence {
  const phases: InteractionPhase[] = [
    buildNavigationPhase('https://www.douyin.com/im/', 'douyin'),
    {
      name: 'open_new_dm',
      actions: [
        evaluate(`
          const btn = document.querySelector('[data-e2e="new-dm-btn"], .new-message-btn');
          if (btn) btn.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(500, 1000),
        { type: 'click', params: { selector: '[data-e2e="new-dm-btn"], .new-message-btn' } },
        humanDelay(1500, 3000),
      ],
      expectedState: 'dm_composer_visible',
      timeoutMs: 10000,
    },
    {
      name: 'search_recipient',
      actions: [
        evaluate(`
          const input = document.querySelector('[data-e2e="dm-recipient"], .recipient-input');
          if (input) input.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(300, 800),
        { type: 'type', params: { selector: '[data-e2e="dm-recipient"], .recipient-input', text: targetId } },
        humanDelay(1000, 2000),
        { type: 'click', params: { selector: '.user-result:first-child, [data-e2e="user-result"]:first-child' } },
        humanDelay(500, 1000),
      ],
      expectedState: 'recipient_selected',
      timeoutMs: 15000,
    },
    {
      name: 'compose_dm',
      actions: [
        evaluate(`
          const input = document.querySelector('[data-e2e="dm-content"], .message-input textarea');
          if (input) input.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(300, 800),
        { type: 'click', params: { selector: '[data-e2e="dm-content"], .message-input textarea' } },
        humanDelay(200, 500),
        { type: 'type', params: { selector: '[data-e2e="dm-content"], .message-input textarea', text: content } },
        humanDelay(500, 1500),
      ],
      expectedState: 'dm_composed',
      timeoutMs: 15000,
    },
    {
      name: 'send_dm',
      actions: [
        { type: 'click', params: { selector: '[data-e2e="dm-send"], .send-btn' } },
        humanDelay(1000, 2000),
        evaluate(`
          const sent = document.querySelector('.sent, .message-sent');
          window.__LAST_ACTION_RESULT__ = { success: Boolean(sent), type: 'dm' };
        `),
      ],
      expectedState: 'dm_sent',
      timeoutMs: 10000,
    },
  ];

  return {
    platform: 'douyin',
    type: 'dm',
    targetId,
    phases,
    totalEstimatedMs: 80000,
    riskLevel: 'high',
  };
}

// ============ 主构建函数 ============

export function buildInteractionSequence(
  platform: Platform,
  type: InteractionParams['type'],
  targetId: string,
  content?: string,
): InteractionSequence {
  switch (platform) {
    case 'douyin':
      switch (type) {
        case 'like':
          return buildDouyinLike(targetId);
        case 'follow':
          return buildDouyinFollow(targetId);
        case 'comment':
          return buildDouyinComment(targetId, content ?? '');
        case 'bookmark':
          return buildDouyinBookmark(targetId);
        case 'share':
          return buildDouyinShare(targetId);
        case 'dm':
          return buildDouyinDM(targetId, content ?? '');
      }
      break;

    case 'xiaohongshu':
      switch (type) {
        case 'like':
          return buildXiaohongshuLike(targetId);
        case 'follow':
          return buildXiaohongshuFollow(targetId);
        case 'comment':
          return buildXiaohongshuComment(targetId, content ?? '');
        default:
          return getAdapter(platform).buildInteractionAction({ type, targetId, content })
            .reduce<InteractionSequence>(
              (seq) => ({
                ...seq,
                phases: [{ name: type, actions: getAdapter(platform).buildInteractionAction({ type, targetId, content }), expectedState: `${type}_done`, timeoutMs: 30000 }],
                totalEstimatedMs: 30000,
                riskLevel: 'medium',
              }),
              { platform, type, targetId, phases: [], totalEstimatedMs: 0, riskLevel: 'medium' },
            );
      }

    case 'weibo':
      switch (type) {
        case 'like':
          return buildWeiboLike(targetId);
        default:
          return {
            platform,
            type,
            targetId,
            phases: [
              buildNavigationPhase(
                type === 'comment' ? `https://weibo.com/${targetId}` : `https://weibo.com/u/${targetId}`,
                platform,
              ),
              {
                name: type,
                actions: getAdapter(platform).buildInteractionAction({ type, targetId, content }),
                expectedState: `${type}_done`,
                timeoutMs: 30000,
              },
            ],
            totalEstimatedMs: 30000,
            riskLevel: 'medium',
          };
      }

    case 'bilibili':
      switch (type) {
        case 'like':
          return buildBilibiliLike(targetId);
        default:
          return {
            platform,
            type,
            targetId,
            phases: [
              buildNavigationPhase(
                type === 'comment' ? `https://www.bilibili.com/video/${targetId}` : `https://www.bilibili.com/space/${targetId}`,
                platform,
              ),
              {
                name: type,
                actions: getAdapter(platform).buildInteractionAction({ type, targetId, content }),
                expectedState: `${type}_done`,
                timeoutMs: 30000,
              },
            ],
            totalEstimatedMs: 30000,
            riskLevel: 'medium',
          };
      }

    default:
      return {
        platform,
        type,
        targetId,
        phases: [],
        totalEstimatedMs: 0,
        riskLevel: 'medium',
      };
  }
}

// ============ 序列执行辅助 ============

export function flattenSequence(sequence: InteractionSequence): BrowserAction[] {
  const actions: BrowserAction[] = [];
  for (const phase of sequence.phases) {
    actions.push(...phase.actions);
  }
  return actions;
}

export function getSequenceRiskLevel(sequence: InteractionSequence): 'low' | 'medium' | 'high' {
  return sequence.riskLevel;
}

export function estimateSequenceDuration(sequence: InteractionSequence): number {
  return sequence.totalEstimatedMs;
}

// ============ 批量交互 ============

export interface BatchInteractionParams {
  platform: Platform;
  type: InteractionParams['type'];
  targets: Array<{ id: string; content?: string }>;
  delayBetween?: number;
}

export function buildBatchInteractionSequence(params: BatchInteractionParams): InteractionSequence[] {
  const { platform, type, targets, delayBetween = 5000 } = params;

  return targets.map((target, index) => ({
    ...buildInteractionSequence(platform, type, target.id, target.content),
    totalEstimatedMs:
      buildInteractionSequence(platform, type, target.id, target.content).totalEstimatedMs +
      (index > 0 ? delayBetween : 0),
  }));
}
