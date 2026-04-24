// 平台适配器 — 与设计文档第 16 节对齐

import type { Platform, BrowserAction } from '@creator-os/core';
import type { PublishParams, PublishResult, ScrapeParams, ScrapeResult, InteractionParams } from './types.js';

// Re-export types
export type { PublishParams, PublishResult, ScrapeParams, ScrapeResult, InteractionParams } from './types.js';

// ============ 适配器接口 ============

export interface FullPublishAdapter {
  readonly platform: Platform;
  readonly baseUrl: string;

  buildPublishAction(params: PublishParams): BrowserAction[];
  parsePublishResult(data: unknown): PublishResult;

  buildScrapeAction(params: ScrapeParams): BrowserAction[];
  parseScrapeResult(data: unknown): ScrapeResult;

  buildInteractionAction(params: InteractionParams): BrowserAction[];
  parseInteractionResult(data: unknown): ActionResult;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============ 通用辅助函数 ============

function wait(ms: number): BrowserAction {
  return { type: 'evaluate', params: { expression: `new Promise(r => setTimeout(r, ${ms}))` } };
}

function scrollToBottom(): BrowserAction {
  return { type: 'evaluate', params: { expression: 'window.scrollTo(0, document.body.scrollHeight)' } };
}

function extractPostId(href: string | undefined, pattern: RegExp): string {
  if (!href) return '';
  return href.match(pattern)?.[1] ?? '';
}

function extractText(el: Element | null, selector: string): string {
  if (!el) return '';
  const found = el.querySelector(selector);
  return found?.textContent?.trim() ?? '';
}

function extractHref(el: Element | null, selector: string): string {
  if (!el) return '';
  const found = el.querySelector(selector);
  if (!found) return '';
  const anchor = found as HTMLAnchorElement;
  return anchor?.href ?? '';
}

// ============ 抖音适配器 ============

export class DouyinAdapter implements FullPublishAdapter {
  readonly platform = 'douyin' as Platform;
  readonly baseUrl = 'https://www.douyin.com';

  buildPublishAction(params: PublishParams): BrowserAction[] {
    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: `${this.baseUrl}/upload` } },
      { type: 'waitForSelector', params: { selector: '.upload-editor-container', timeout: 15000 } },
      wait(2000),
    ];

    if (params.mediaPaths && params.mediaPaths.length > 0) {
      sequence.push({
        type: 'evaluate',
        params: {
          expression: `
            const input = document.querySelector('input[type="file"]');
            if (input) {
              const dt = new DataTransfer();
              ${params.mediaPaths.map((p) => `dt.items.add(new File([], "${p.split('/').pop()}"));`).join('\n')}
              input.files = dt.files;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          `,
        },
      });
      sequence.push({ type: 'waitForSelector', params: { selector: '.video-upload-progress', timeout: 30000 } });
      sequence.push(wait(3000));
    }

    sequence.push(
      { type: 'waitForSelector', params: { selector: '.desc-textarea', timeout: 10000 } },
      wait(1500),
    );

    if (params.content) {
      sequence.push({ type: 'click', params: { selector: '.desc-textarea' } });
      sequence.push({ type: 'type', params: { selector: '.desc-textarea', text: params.content } });
      sequence.push(wait(1000));
    }

    if (params.tags && params.tags.length > 0) {
      const tagText = params.tags.map((t) => `#${t}`).join(' ');
      sequence.push({ type: 'type', params: { selector: '.desc-textarea', text: ` ${tagText}` } });
      sequence.push(wait(1000));
    }

    if (params.visibility && params.visibility !== 'public') {
      sequence.push({ type: 'click', params: { selector: '.visibility-selector' } });
      sequence.push(wait(500));
      const visibilityMap: Record<string, string> = {
        private: '仅自己可见',
        friends: '好友可见',
      };
      const visText = visibilityMap[params.visibility];
      if (visText) {
        sequence.push({ type: 'click', params: { selector: `[data-value="${visText}"]` } });
        sequence.push(wait(300));
      }
    }

    sequence.push(wait(2000), { type: 'scroll', params: { direction: 'down', distance: 300 } }, wait(1000));

    return sequence;
  }

  parsePublishResult(data: unknown): PublishResult {
    if (!data) return { id: '', url: '', publishedAt: Date.now() };

    // Unwrap BrowserResult wrapper if present (returned by BrowserEngine.execute)
    let raw: unknown = data;
    if (
      typeof data === 'object' &&
      data !== null &&
      'data' in data
    ) {
      raw = (data as { data: unknown })['data'];
    }

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && 'id' in parsed) {
          return { id: String(parsed['id'] ?? ''), url: String(parsed['url'] ?? this.baseUrl), publishedAt: Date.now() };
        }
      } catch {
        // fall through
      }
      return { id: raw, url: this.baseUrl, publishedAt: Date.now() };
    }

    if (typeof raw === 'object' && raw !== null && 'querySelector' in raw) {
      const root = raw as Element;
      const postIdEl = root.querySelector('[data-e2e="publish-success-post-id"], .video-id, .aweme-id');
      const postId = postIdEl?.textContent?.trim() ?? '';
      const linkEl = root.querySelector('.post-link, [data-e2e="publish-success-link"]') as HTMLAnchorElement | null;
      const url = linkEl?.href ?? `${this.baseUrl}/video/${postId}`;
      return { id: postId || String(Date.now()), url: url || this.baseUrl, publishedAt: Date.now() };
    }

    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      const postId = String(obj['id'] ?? obj['aweme_id'] ?? obj['item_id'] ?? '');
      const url = String(obj['url'] ?? obj['share_url'] ?? `${this.baseUrl}/video/${postId}`);
      return { id: postId || String(Date.now()), url, publishedAt: Date.now() };
    }

    return { id: String(Date.now()), url: this.baseUrl, publishedAt: Date.now() };
  }

  buildScrapeAction(params: ScrapeParams): BrowserAction[] {
    const urlMap: Record<string, string> = {
      profile: `${this.baseUrl}/user/${params.target}`,
      posts: `${this.baseUrl}/user/${params.target}`,
      comments: `${this.baseUrl}/video/${params.target}`,
      search: `${this.baseUrl}/search?q=${encodeURIComponent(params.target)}`,
    };

    const limit = params.limit ?? 20;
    const scrollCount = Math.ceil(limit / 12);
    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: urlMap[params.type] ?? this.baseUrl } },
      { type: 'waitForSelector', params: { selector: 'body', timeout: 10000 } },
      wait(3000),
    ];

    if (params.type === 'posts' || params.type === 'profile') {
      for (let i = 0; i < scrollCount; i++) {
        sequence.push(scrollToBottom());
        sequence.push(wait(2000 + Math.random() * 1500));
      }
    }

    if (params.type === 'comments') {
      sequence.push({ type: 'scroll', params: { direction: 'down', distance: 500 } });
      sequence.push(wait(2000));
    }

    return sequence;
  }

  parseScrapeResult(data: unknown): ScrapeResult {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return { items: parsed, fetchedAt: Date.now() };
        if (parsed.itemList) return { items: parsed.itemList, fetchedAt: Date.now() };
      } catch {
        // fall through
      }
    }

    return { items: [], fetchedAt: Date.now(), nextCursor: undefined };
  }

  buildInteractionAction(params: InteractionParams): BrowserAction[] {
    const targetUrl =
      params.type === 'comment'
        ? `${this.baseUrl}/video/${params.targetId}`
        : `${this.baseUrl}/user/${params.targetId}`;

    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: targetUrl } },
      { type: 'waitForSelector', params: { selector: 'body', timeout: 15000 } },
      wait(3000),
    ];

    switch (params.type) {
      case 'like':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 400 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="like-button"], .like-btn, [class*="like"]' } });
        sequence.push(wait(1000));
        break;

      case 'follow':
        sequence.push({ type: 'click', params: { selector: '[data-e2e="follow-button"], .follow-btn, [class*="follow"]' } });
        sequence.push(wait(1000));
        break;

      case 'comment':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 500 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="comment-icon"], .comment-icon, [class*="comment"]' } });
        sequence.push(wait(1500));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="comment-input"], .comment-input textarea', text: params.content ?? '' } });
        sequence.push(wait(500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="comment-submit"], .comment-submit, [class*="submit"]' } });
        sequence.push(wait(1000));
        break;

      case 'bookmark':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 400 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="collect-button"], .collect-btn, [class*="collect"]' } });
        sequence.push(wait(1000));
        break;

      case 'share':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 400 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="share-button"], .share-btn, [class*="share"]' } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="share-copy"], .share-copy-link' } });
        sequence.push(wait(500));
        break;

      case 'dm':
        sequence.push({ type: 'goto', params: { url: `${this.baseUrl}/im/` } });
        sequence.push({ type: 'waitForSelector', params: { selector: '[data-e2e="dm-list"]', timeout: 10000 } });
        sequence.push(wait(2000));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="new-dm-btn"], .new-message-btn' } });
        sequence.push(wait(1500));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="dm-recipient"], .recipient-input', text: params.targetId } });
        sequence.push(wait(1000));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="dm-content"], .message-input textarea', text: params.content ?? '' } });
        sequence.push(wait(500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="dm-send"], .send-btn' } });
        sequence.push(wait(1000));
        break;
    }

    return sequence;
  }

  parseInteractionResult(data: unknown): ActionResult {
    if (!data || typeof data !== 'object') return { success: false, error: 'No response data' };

    const resp = data as Record<string, unknown>;
    const successCodes: unknown[] = [0, 200, '0', '200', 'success'];

    if (
      successCodes.includes(resp['status_code']) ||
      successCodes.includes(resp['err_no']) ||
      resp['success'] === true
    ) {
      return { success: true, data: { id: resp['aweme_id'] ?? resp['item_id'] ?? resp['id'] ?? '' } };
    }

    return { success: false, error: String(resp['err_msg'] ?? resp['error_msg'] ?? resp['message'] ?? 'Unknown error') };
  }
}

// ============ 小红书适配器 ============

export class XiaohongshuAdapter implements FullPublishAdapter {
  readonly platform = 'xiaohongshu' as Platform;
  readonly baseUrl = 'https://www.xiaohongshu.com';

  buildPublishAction(params: PublishParams): BrowserAction[] {
    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: `${this.baseUrl}/publish/publish` } },
      { type: 'waitForSelector', params: { selector: '.publish-container, .editor-container', timeout: 15000 } },
      wait(2000),
    ];

    if (params.mediaPaths && params.mediaPaths.length > 0) {
      sequence.push({
        type: 'evaluate',
        params: {
          expression: `
            const uploadArea = document.querySelector('.upload-btn, .image-upload-area, input[type="file"]');
            if (uploadArea instanceof HTMLInputElement) {
              const dt = new DataTransfer();
              ${params.mediaPaths.map((p) => `dt.items.add(new File([], "${p.split('/').pop()}"));`).join('\n')}
              uploadArea.files = dt.files;
              uploadArea.dispatchEvent(new Event('change', { bubbles: true }));
            }
          `,
        },
      });
      sequence.push({ type: 'waitForSelector', params: { selector: '.image-list, .upload-preview', timeout: 30000 } });
      sequence.push(wait(4000));
    }

    sequence.push(
      { type: 'waitForSelector', params: { selector: '.content-editor, .note-editor, textarea', timeout: 10000 } },
      wait(1500),
    );

    if (params.content) {
      sequence.push({ type: 'click', params: { selector: '.content-editor, .note-editor, textarea' } });
      sequence.push({ type: 'type', params: { selector: '.content-editor, .note-editor, textarea', text: params.content } });
      sequence.push(wait(1000));
    }

    if (params.tags && params.tags.length > 0) {
      sequence.push({ type: 'click', params: { selector: '.tag-input, .hashtag-input' } });
      sequence.push(wait(500));
      for (const tag of params.tags) {
        sequence.push({ type: 'type', params: { selector: '.tag-input, .hashtag-input', text: `#${tag}` } });
        sequence.push(wait(800));
        sequence.push({ type: 'click', params: { selector: '.tag-suggestion:first-child, .hashtag-suggestion:first-child' } });
        sequence.push(wait(500));
      }
    }

    if (params.visibility && params.visibility !== 'public') {
      sequence.push({ type: 'click', params: { selector: '.visibility-btn, .privacy-btn' } });
      sequence.push(wait(500));
      const visMap: Record<string, string> = { private: '仅自己可见', friends: '好友可见' };
      const visText = visMap[params.visibility];
      if (visText) {
        sequence.push({ type: 'click', params: { selector: `[data-value="${visText}"]` } });
        sequence.push(wait(300));
      }
    }

    sequence.push(wait(2000), { type: 'scroll', params: { direction: 'down', distance: 300 } }, wait(1000));

    return sequence;
  }

  parsePublishResult(data: unknown): PublishResult {
    if (!data) return { id: '', url: '', publishedAt: Date.now() };

    // Unwrap BrowserResult wrapper if present
    let raw: unknown = data;
    if (typeof data === 'object' && data !== null && 'data' in data) {
      raw = (data as { data: unknown })['data'];
    }

    if (typeof raw === 'object' && raw !== null && 'querySelector' in raw) {
      const root = raw as Element;
      const postIdEl = root.querySelector('[data-e2e="note-id"], .note-id');
      const postId = postIdEl?.textContent?.trim() ?? '';
      const linkEl = root.querySelector('.post-link, [data-e2e="publish-success-link"]') as HTMLAnchorElement | null;
      const url = linkEl?.href ?? `${this.baseUrl}/discovery/item/${postId}`;
      return { id: postId || String(Date.now()), url: url || this.baseUrl, publishedAt: Date.now() };
    }

    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      const postId = String(obj['note_id'] ?? obj['id'] ?? '');
      const url = String(obj['url'] ?? obj['share_url'] ?? `${this.baseUrl}/discovery/item/${postId}`);
      return { id: postId || String(Date.now()), url, publishedAt: Date.now() };
    }

    return { id: String(raw ?? Date.now()), url: this.baseUrl, publishedAt: Date.now() };
  }

  buildScrapeAction(params: ScrapeParams): BrowserAction[] {
    const urlMap: Record<string, string> = {
      profile: `${this.baseUrl}/user/profile/${params.target}`,
      posts: `${this.baseUrl}/user/profile/${params.target}`,
      comments: `${this.baseUrl}/discovery/item/${params.target}`,
      search: `${this.baseUrl}/search_result?keyword=${encodeURIComponent(params.target)}&type=51`,
    };

    const limit = params.limit ?? 20;
    const scrollCount = Math.ceil(limit / 10);
    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: urlMap[params.type] ?? this.baseUrl } },
      { type: 'waitForSelector', params: { selector: 'body', timeout: 10000 } },
      wait(3000),
    ];

    if (params.type === 'posts' || params.type === 'profile') {
      for (let i = 0; i < scrollCount; i++) {
        sequence.push(scrollToBottom());
        sequence.push(wait(2000 + Math.random() * 1500));
      }
    }

    if (params.type === 'comments') {
      sequence.push({ type: 'scroll', params: { direction: 'down', distance: 500 } });
      sequence.push(wait(2000));
    }

    return sequence;
  }

  parseScrapeResult(data: unknown): ScrapeResult {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return { items: parsed, fetchedAt: Date.now() };
        if (parsed.noteList) return { items: parsed.noteList, fetchedAt: Date.now() };
      } catch {
        // fall through
      }
    }

    return { items: [], fetchedAt: Date.now(), nextCursor: undefined };
  }

  buildInteractionAction(params: InteractionParams): BrowserAction[] {
    const targetUrl =
      params.type === 'comment'
        ? `${this.baseUrl}/discovery/item/${params.targetId}`
        : `${this.baseUrl}/user/profile/${params.targetId}`;

    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: targetUrl } },
      { type: 'waitForSelector', params: { selector: 'body', timeout: 15000 } },
      wait(3000),
    ];

    switch (params.type) {
      case 'like':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 400 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="like-btn"], .like-btn, [class*="like"]' } });
        sequence.push(wait(1000));
        break;

      case 'follow':
        sequence.push({ type: 'click', params: { selector: '[data-e2e="follow-btn"], .follow-btn, [class*="follow"]' } });
        sequence.push(wait(1000));
        break;

      case 'comment':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 500 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="comment-btn"], .comment-icon' } });
        sequence.push(wait(1500));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="comment-input"], .comment-input textarea', text: params.content ?? '' } });
        sequence.push(wait(500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="comment-submit"], .comment-submit' } });
        sequence.push(wait(1000));
        break;

      case 'bookmark':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 400 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="collect-btn"], .collect-btn, [class*="collect"]' } });
        sequence.push(wait(1000));
        break;

      case 'share':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 400 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="share-btn"], .share-btn' } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="share-copy"], .share-copy' } });
        sequence.push(wait(500));
        break;

      case 'dm':
        sequence.push({ type: 'goto', params: { url: `${this.baseUrl}/im/` } });
        sequence.push({ type: 'waitForSelector', params: { selector: '[data-e2e="chat-list"]', timeout: 10000 } });
        sequence.push(wait(2000));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="new-chat-btn"], .new-chat-btn' } });
        sequence.push(wait(1500));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="user-search"], .user-search-input', text: params.targetId } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '.user-result:first-child, [data-e2e="user-result"]:first-child' } });
        sequence.push(wait(1000));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="message-input"], .message-input textarea', text: params.content ?? '' } });
        sequence.push(wait(500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="send-btn"], .send-btn' } });
        sequence.push(wait(1000));
        break;
    }

    return sequence;
  }

  parseInteractionResult(data: unknown): ActionResult {
    if (!data || typeof data !== 'object') return { success: false, error: 'No response data' };

    const resp = data as Record<string, unknown>;
    if (resp['success'] === true || resp['code'] === 0 || resp['code'] === '0') {
      return { success: true, data: { id: resp['note_id'] ?? resp['id'] ?? '' } };
    }

    return { success: false, error: String(resp['msg'] ?? resp['message'] ?? resp['error'] ?? 'Unknown error') };
  }
}

// ============ 微博适配器 ============

export class WeiboAdapter implements FullPublishAdapter {
  readonly platform = 'weibo' as Platform;
  readonly baseUrl = 'https://weibo.com';

  buildPublishAction(params: PublishParams): BrowserAction[] {
    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: this.baseUrl } },
      { type: 'waitForSelector', params: { selector: '.woo-modal-mountPoint, .editor-container', timeout: 15000 } },
      wait(2000),
    ];

    sequence.push({ type: 'click', params: { selector: '[data-e2e="publish-btn"], .publish-btn, [class*="write"]' } });
    sequence.push({ type: 'waitForSelector', params: { selector: '.editor-textarea, textarea', timeout: 10000 } });
    sequence.push(wait(1500));

    if (params.content) {
      sequence.push({ type: 'type', params: { selector: '.editor-textarea, textarea', text: params.content } });
      sequence.push(wait(1000));
    }

    if (params.tags && params.tags.length > 0) {
      const tagText = params.tags.map((t) => `#${t}`).join(' ');
      sequence.push({ type: 'type', params: { selector: '.editor-textarea, textarea', text: ` ${tagText}` } });
      sequence.push(wait(1000));
    }

    if (params.mediaPaths && params.mediaPaths.length > 0) {
      sequence.push({ type: 'click', params: { selector: '[data-e2e="upload-media"], .upload-media-btn' } });
      sequence.push(wait(1000));
      sequence.push({
        type: 'evaluate',
        params: {
          expression: `
            const input = document.querySelector('input[type="file"]');
            if (input) {
              const dt = new DataTransfer();
              ${params.mediaPaths.map((p) => `dt.items.add(new File([], "${p.split('/').pop()}"));`).join('\n')}
              input.files = dt.files;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          `,
        },
      });
      sequence.push({ type: 'waitForSelector', params: { selector: '.media-preview', timeout: 20000 } });
      sequence.push(wait(3000));
    }

    if (params.visibility && params.visibility !== 'public') {
      sequence.push({ type: 'click', params: { selector: '[data-e2e="visibility-btn"], .visibility-btn' } });
      sequence.push(wait(500));
      const visMap: Record<string, string> = { private: '仅自己可见', friends: '好友可见' };
      const visText = visMap[params.visibility];
      if (visText) {
        sequence.push({ type: 'click', params: { selector: `[data-value="${visText}"]` } });
        sequence.push(wait(300));
      }
    }

    sequence.push(wait(2000), { type: 'scroll', params: { direction: 'down', distance: 200 } }, wait(1000));

    return sequence;
  }

  parsePublishResult(data: unknown): PublishResult {
    if (!data) return { id: '', url: '', publishedAt: Date.now() };

    // Unwrap BrowserResult wrapper if present (aligned with DouyinAdapter/XiaohongshuAdapter)
    let raw: unknown = data;
    if (typeof data === 'object' && data !== null && 'data' in data) {
      raw = (data as { data: unknown })['data'];
    }

    if (typeof raw === 'string') {
      return { id: raw, url: this.baseUrl, publishedAt: Date.now() };
    }

    if (typeof raw !== 'object' || raw === null) {
      return { id: String(raw ?? ''), url: this.baseUrl, publishedAt: Date.now() };
    }

    // Attempt to extract from object (may be a serialized JSON string)
    if ('mid' in raw || 'id' in raw) {
      const obj = raw as Record<string, unknown>;
      const postId = String(obj['mid'] ?? obj['id'] ?? '');
      const url = `${this.baseUrl}/u/${postId}`;
      return { id: postId || String(Date.now()), url, publishedAt: Date.now() };
    }

    return { id: String(Date.now()), url: this.baseUrl, publishedAt: Date.now() };
  }

  buildScrapeAction(params: ScrapeParams): BrowserAction[] {
    const urlMap: Record<string, string> = {
      profile: `${this.baseUrl}/u/${params.target}`,
      posts: `${this.baseUrl}/u/${params.target}`,
      comments: `${this.baseUrl}/${params.target}`,
      search: `${this.baseUrl}/search?q=${encodeURIComponent(params.target)}`,
    };

    const limit = params.limit ?? 20;
    const scrollCount = Math.ceil(limit / 9);
    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: urlMap[params.type] ?? this.baseUrl } },
      { type: 'waitForSelector', params: { selector: 'body', timeout: 10000 } },
      wait(3000),
    ];

    if (params.type === 'posts' || params.type === 'profile') {
      for (let i = 0; i < scrollCount; i++) {
        sequence.push(scrollToBottom());
        sequence.push(wait(2000 + Math.random() * 1500));
      }
    }

    if (params.type === 'comments') {
      sequence.push({ type: 'scroll', params: { direction: 'down', distance: 500 } });
      sequence.push(wait(2000));
    }

    return sequence;
  }

  parseScrapeResult(data: unknown): ScrapeResult {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return { items: parsed, fetchedAt: Date.now() };
        if (parsed.cards) return { items: parsed.cards, fetchedAt: Date.now() };
      } catch {
        // fall through
      }
    }

    return { items: [], fetchedAt: Date.now(), nextCursor: undefined };
  }

  buildInteractionAction(params: InteractionParams): BrowserAction[] {
    const targetUrl =
      params.type === 'comment'
        ? `${this.baseUrl}/${params.targetId}`
        : `${this.baseUrl}/u/${params.targetId}`;

    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: targetUrl } },
      { type: 'waitForSelector', params: { selector: 'body', timeout: 15000 } },
      wait(3000),
    ];

    switch (params.type) {
      case 'like':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 400 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="like-btn"], .woo-like-icon, [class*="like"]' } });
        sequence.push(wait(1000));
        break;

      case 'follow':
        sequence.push({ type: 'click', params: { selector: '[data-e2e="follow-btn"], .follow-btn, [class*="follow"]' } });
        sequence.push(wait(1000));
        break;

      case 'comment':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 500 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="comment-link"], .woo-comment-icon' } });
        sequence.push(wait(1500));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="comment-input"], textarea', text: params.content ?? '' } });
        sequence.push(wait(500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="comment-submit"], .comment-submit' } });
        sequence.push(wait(1000));
        break;

      case 'bookmark':
        sequence.push({ type: 'click', params: { selector: '[data-e2e="collect-btn"], .woo-collect-icon' } });
        sequence.push(wait(1000));
        break;

      case 'share':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 400 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="share-btn"], .share-btn' } });
        sequence.push(wait(1500));
        break;

      case 'dm':
        sequence.push({ type: 'goto', params: { url: `${this.baseUrl}/direct/` } });
        sequence.push({ type: 'waitForSelector', params: { selector: '[data-e2e="dm-panel"]', timeout: 10000 } });
        sequence.push(wait(2000));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="new-dm"], .new-dm-btn' } });
        sequence.push(wait(1500));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="user-input"], .user-search', text: params.targetId } });
        sequence.push(wait(1000));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="dm-content"], .message-area textarea', text: params.content ?? '' } });
        sequence.push(wait(500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="send-dm"], .send-btn' } });
        sequence.push(wait(1000));
        break;
    }

    return sequence;
  }

  parseInteractionResult(data: unknown): ActionResult {
    if (!data || typeof data !== 'object') return { success: false, error: 'No response data' };

    const resp = data as Record<string, unknown>;
    if (resp['success'] === true || resp['ok'] === 1 || resp['code'] === 100000) {
      return { success: true, data: { id: resp['id'] ?? resp['mid'] ?? '' } };
    }

    return { success: false, error: String(resp['msg'] ?? resp['message'] ?? 'Unknown error') };
  }
}

// ============ B站适配器 ============

export class BilibiliAdapter implements FullPublishAdapter {
  readonly platform = 'bilibili' as Platform;
  readonly baseUrl = 'https://www.bilibili.com';

  buildPublishAction(params: PublishParams): BrowserAction[] {
    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: `${this.baseUrl}/video/publish` } },
      { type: 'waitForSelector', params: { selector: '.upload-container, .upload-wrapper', timeout: 15000 } },
      wait(2000),
    ];

    if (params.mediaPaths && params.mediaPaths.length > 0) {
      sequence.push({
        type: 'evaluate',
        params: {
          expression: `
            const input = document.querySelector('.upload-input, input[type="file"]');
            if (input) {
              const dt = new DataTransfer();
              ${params.mediaPaths.map((p) => `dt.items.add(new File([], "${p.split('/').pop()}"));`).join('\n')}
              input.files = dt.files;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          `,
        },
      });
      sequence.push({ type: 'waitForSelector', params: { selector: '.upload-progress, .file-uploading', timeout: 30000 } });
      sequence.push(wait(4000));
    }

    sequence.push(
      { type: 'waitForSelector', params: { selector: '.title-input, .input-title', timeout: 10000 } },
      wait(1500),
    );

    if (params.content) {
      sequence.push({ type: 'click', params: { selector: '.title-input, .input-title' } });
      sequence.push({ type: 'type', params: { selector: '.title-input, .input-title', text: params.content.split('\n')[0]?.slice(0, 80) ?? '' } });
      sequence.push(wait(500));
    }

    sequence.push({ type: 'waitForSelector', params: { selector: '.desc-textarea, .bili-dyn-textarea', timeout: 5000 } });
    sequence.push(wait(1000));

    const desc = params.content ?? '';
    const lines = desc.split('\n');
    const descText = lines.slice(1).join('\n').trim();
    if (descText) {
      sequence.push({ type: 'type', params: { selector: '.desc-textarea, .bili-dyn-textarea', text: descText } });
      sequence.push(wait(1000));
    }

    if (params.tags && params.tags.length > 0) {
      sequence.push({ type: 'click', params: { selector: '.tag-input, .bili-tag-input' } });
      sequence.push(wait(500));
      for (const tag of params.tags) {
        sequence.push({ type: 'type', params: { selector: '.tag-input', text: tag } });
        sequence.push(wait(800));
        sequence.push({ type: 'click', params: { selector: '.tag-suggestion:first-child' } });
        sequence.push(wait(500));
      }
    }

    if (params.visibility && params.visibility !== 'public') {
      sequence.push({ type: 'click', params: { selector: '.privacy-selector, .visibility-btn' } });
      sequence.push(wait(500));
      const visMap: Record<string, string> = { private: '私有', friends: '仅粉丝' };
      const visText = visMap[params.visibility];
      if (visText) {
        sequence.push({ type: 'click', params: { selector: `[data-value="${visText}"]` } });
        sequence.push(wait(300));
      }
    }

    sequence.push(wait(2000), { type: 'scroll', params: { direction: 'down', distance: 300 } }, wait(1000));

    return sequence;
  }

  parsePublishResult(data: unknown): PublishResult {
    if (!data) return { id: '', url: '', publishedAt: Date.now() };

    // Unwrap BrowserResult wrapper if present (aligned with DouyinAdapter/XiaohongshuAdapter)
    let raw: unknown = data;
    if (typeof data === 'object' && data !== null && 'data' in data) {
      raw = (data as { data: unknown })['data'];
    }

    if (typeof raw === 'string') {
      return { id: raw, url: this.baseUrl, publishedAt: Date.now() };
    }

    if (typeof raw !== 'object' || raw === null) {
      return { id: String(raw ?? ''), url: this.baseUrl, publishedAt: Date.now() };
    }

    // Extract from object (bvid, aid, or id fields)
    if ('bvid' in raw || 'aid' in raw || 'id' in raw) {
      const obj = raw as Record<string, unknown>;
      const bvid = String(obj['bvid'] ?? obj['aid'] ?? obj['id'] ?? '');
      const url = `https://www.bilibili.com/video/${bvid}`;
      return { id: bvid || String(Date.now()), url, publishedAt: Date.now() };
    }

    return { id: String(Date.now()), url: this.baseUrl, publishedAt: Date.now() };
  }

  buildScrapeAction(params: ScrapeParams): BrowserAction[] {
    const urlMap: Record<string, string> = {
      profile: `${this.baseUrl}/space/${params.target}`,
      posts: `${this.baseUrl}/space/${params.target}`,
      comments: `${this.baseUrl}/video/${params.target}`,
      search: `${this.baseUrl}/search?keyword=${encodeURIComponent(params.target)}&type=video`,
    };

    const limit = params.limit ?? 20;
    const scrollCount = Math.ceil(limit / 30);
    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: urlMap[params.type] ?? this.baseUrl } },
      { type: 'waitForSelector', params: { selector: 'body', timeout: 10000 } },
      wait(3000),
    ];

    if (params.type === 'posts' || params.type === 'profile') {
      for (let i = 0; i < scrollCount; i++) {
        sequence.push(scrollToBottom());
        sequence.push(wait(2000 + Math.random() * 1500));
      }
    }

    if (params.type === 'comments') {
      sequence.push({ type: 'scroll', params: { direction: 'down', distance: 500 } });
      sequence.push(wait(2000));
    }

    return sequence;
  }

  parseScrapeResult(data: unknown): ScrapeResult {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return { items: parsed, fetchedAt: Date.now() };
        if (parsed.list?.vlist) return { items: parsed.list.vlist, fetchedAt: Date.now() };
      } catch {
        // fall through
      }
    }

    return { items: [], fetchedAt: Date.now(), nextCursor: undefined };
  }

  buildInteractionAction(params: InteractionParams): BrowserAction[] {
    const targetUrl =
      params.type === 'comment'
        ? `${this.baseUrl}/video/${params.targetId}`
        : `${this.baseUrl}/space/${params.targetId}`;

    const sequence: BrowserAction[] = [
      { type: 'goto', params: { url: targetUrl } },
      { type: 'waitForSelector', params: { selector: 'body', timeout: 15000 } },
      wait(3000),
    ];

    switch (params.type) {
      case 'like':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 400 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="like-btn"], .like-btn, .bili-dyn-action-icon--like' } });
        sequence.push(wait(1000));
        break;

      case 'follow':
        sequence.push({ type: 'click', params: { selector: '[data-e2e="follow-btn"], .follow-btn, .be-relation-follow' } });
        sequence.push(wait(1000));
        break;

      case 'comment':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 500 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="comment-btn"], .comment-btn, .bili-dyn-action-icon--comment' } });
        sequence.push(wait(1500));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="comment-input"], .comment-input, .reply-input textarea', text: params.content ?? '' } });
        sequence.push(wait(500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="comment-submit"], .comment-submit, .reply-submit' } });
        sequence.push(wait(1000));
        break;

      case 'bookmark':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 400 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="coin-btn"], .coin-btn, .bili-dyn-action-icon--coin' } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="fav-btn"], .fav-btn' } });
        sequence.push(wait(1000));
        break;

      case 'share':
        sequence.push({ type: 'scroll', params: { direction: 'down', distance: 400 } });
        sequence.push(wait(1500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="share-btn"], .share-btn, .bili-dyn-action-icon--share' } });
        sequence.push(wait(1500));
        break;

      case 'dm':
        sequence.push({ type: 'goto', params: { url: `${this.baseUrl}/im/` } });
        sequence.push({ type: 'waitForSelector', params: { selector: '[data-e2e="dm-list"]', timeout: 10000 } });
        sequence.push(wait(2000));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="new-dm"], .new-dm-btn' } });
        sequence.push(wait(1500));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="user-search"], .user-search-input', text: params.targetId } });
        sequence.push(wait(1000));
        sequence.push({ type: 'type', params: { selector: '[data-e2e="dm-content"], .message-input textarea', text: params.content ?? '' } });
        sequence.push(wait(500));
        sequence.push({ type: 'click', params: { selector: '[data-e2e="send-dm"], .send-btn' } });
        sequence.push(wait(1000));
        break;
    }

    return sequence;
  }

  parseInteractionResult(data: unknown): ActionResult {
    if (!data || typeof data !== 'object') return { success: false, error: 'No response data' };

    const resp = data as Record<string, unknown>;
    if (resp['success'] === true || resp['code'] === 0 || resp['code'] === 62001) {
      return { success: true, data: { id: resp['rpid'] ?? resp['oid'] ?? resp['id'] ?? '' } };
    }

    return { success: false, error: String(resp['message'] ?? resp['msg'] ?? 'Unknown error') };
  }
}

// ============ 工厂函数 ============

const adapters = new Map<Platform, FullPublishAdapter>([
  ['douyin', new DouyinAdapter()],
  ['xiaohongshu', new XiaohongshuAdapter()],
  ['weibo', new WeiboAdapter()],
  ['bilibili', new BilibiliAdapter()],
]);

export function getAdapter(platform: Platform): FullPublishAdapter {
  const adapter = adapters.get(platform);
  if (!adapter) throw new Error(`No adapter for platform: ${platform}`);
  return adapter;
}

export function listAdapters(): Platform[] {
  return Array.from(adapters.keys());
}
