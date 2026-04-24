// 爬取序列构建器 — 构建完整的数据爬取流程

import type { Platform, BrowserAction } from '@creator-os/core';
import type { ScrapeParams } from './index.js';
import { platformSelectors } from './selectors.js';

// ============ 爬取阶段类型 ============

export interface ScrapePhase {
  name: string;
  actions: BrowserAction[];
  expectedState?: string;
  timeoutMs?: number;
}

export interface ScrapeSequence {
  platform: Platform;
  params: ScrapeParams;
  phases: ScrapePhase[];
  totalEstimatedMs: number;
  paginationType: 'infinite_scroll' | 'load_more' | 'cursor' | 'page_number' | 'none';
}

export interface ExtractedItem {
  id: string;
  title?: string;
  author?: string;
  authorId?: string;
  content?: string;
  description?: string;
  stats?: Record<string, number>;
  mediaUrls?: string[];
  tags?: string[];
  timestamp?: number;
  link?: string;
  likes?: number;
  scrapedAt?: number;
  [key: string]: unknown;
}

// ============ 等待辅助函数 ============

function wait(ms: number): BrowserAction {
  return { type: 'evaluate', params: { expression: `new Promise(r => setTimeout(r, ${ms}))` } };
}

function humanDelay(min: number, max: number): BrowserAction {
  return { type: 'evaluate', params: { expression: `new Promise(r => setTimeout(r, ${min} + Math.random() * ${max - min}))` } };
}

function scrollToBottom(): BrowserAction {
  return { type: 'evaluate', params: { expression: 'window.scrollTo(0, document.body.scrollHeight)' } };
}

function evaluate(script: string): BrowserAction {
  return { type: 'evaluate', params: { expression: script } };
}

// ============ 通用阶段构建 ============

function buildNavigationPhase(url: string): ScrapePhase {
  return {
    name: 'navigation',
    actions: [
      { type: 'goto', params: { url } },
      { type: 'waitForSelector', params: { selector: 'body', timeout: 15000 } },
      humanDelay(3000, 5000),
    ],
    expectedState: 'page_loaded',
    timeoutMs: 20000,
  };
}

function buildScrollPhase(count: number, intervalMs: number): ScrapePhase {
  const actions: BrowserAction[] = [];
  for (let i = 0; i < count; i++) {
    actions.push(scrollToBottom());
    actions.push(humanDelay(intervalMs, intervalMs + 1500));
    actions.push(evaluate(`
      const loading = document.querySelector('.loading, [data-e2e="loading"]');
      if (loading) window.__SCROLL_LOADING__ = true;
      else window.__SCROLL_LOADING__ = false;
    `));
    actions.push(wait(500));
  }
  return {
    name: 'scroll_load',
    actions,
    expectedState: 'content_loaded',
  };
}

// ============ 数据提取阶段 ============

function buildExtractPhase(platform: Platform, type: ScrapeParams['type']): ScrapePhase {
  const selectors = platformSelectors[platform];

  return {
    name: 'extract',
    actions: [
      evaluate('window.scrollTo(0, 0)'),
      humanDelay(500, 1000),
      evaluate('window.__EXTRACTED_ITEMS__ = []'),
      evaluate(`
        (function() {
          const items = window.__EXTRACTED_ITEMS__;
          const selectors = ${JSON.stringify(selectors)};
          let nodeList = document.querySelectorAll(selectors?.feed?.itemContainer || '[data-e2e], .item');
          if (!nodeList.length) nodeList = document.querySelectorAll('[data-e2e], .item, [class*="item"]');

          nodeList.forEach(function(node) {
            try {
              var linkEl = node.querySelector('a[href*="/video/"], a[href*="/discovery/item/"], a[href*="/item/"]');
              var anchorEl = linkEl instanceof HTMLAnchorElement ? linkEl : null;
              var href = anchorEl ? anchorEl.href : '';
              var idMatch = href.match(/\\/video\\/(\\d+)/) || href.match(/\\/discovery\\/item\\/([^/?]+)/) || href.match(/\\/item\\/([^/?]+)/) || href.match(/\\/(\\w+)(\\/|$)/);
              var item = { id: idMatch ? idMatch[1] : '', scrapedAt: Date.now() };

              var titleEl = node.querySelector('[data-e2e*="title"], .title, [class*="title"]');
              if (titleEl) item.title = titleEl.textContent.trim();

              var authorEl = node.querySelector('[data-e2e*="author"], .author, [class*="author"]');
              if (authorEl) item.author = authorEl.textContent.trim();

              var statsEls = node.querySelectorAll('[data-e2e*="count"], .stats span, [class*="stat"]');
              if (statsEls.length) {
                item.stats = {};
                var labels = ['view', 'like', 'comment', 'share', 'collect', 'danmaku'];
                statsEls.forEach(function(s, i) {
                  var num = parseInt((s.textContent || '0').replace(/\\D/g, ''), 10);
                  item.stats[labels[i] || 'stat' + i] = num;
                });
              }

              if (href) item.link = href;
              if (item.id) items.push(item);
            } catch(e) {}
          });
        })();
      `),
      wait(1000),
    ],
    expectedState: 'data_extracted',
    timeoutMs: 30000,
  };
}

// ============ 分页检测阶段 ============

function buildPaginationDetectPhase(platform: Platform): ScrapePhase[] {
  const selectors = platformSelectors[platform];
  const phases: ScrapePhase[] = [];

  phases.push({
    name: 'check_infinite_scroll',
    actions: [
      evaluate(`
        const trigger = document.querySelector('.infinite-scroll-trigger, .scroll-trigger, [data-e2e="infinite-trigger"]');
        const sentinel = document.querySelector('[data-e2e="sentinel"], .sentinel');
        window.__HAS_NEXT_PAGE__ = Boolean(trigger || sentinel);
        window.__NEXT_CURSOR__ = trigger ? (trigger.getAttribute('data-cursor') || '') : '';
      `),
      wait(500),
    ],
    expectedState: 'pagination_detected',
    timeoutMs: 5000,
  });

  phases.push({
    name: 'check_load_more',
    actions: [
      evaluate(`
        var sel = '${selectors?.feed?.loadMoreButton || '.load-more'}';
        var btn = document.querySelector(sel);
        window.__HAS_NEXT_PAGE__ = Boolean(btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true');
        window.__LOAD_MORE_SELECTOR__ = sel;
      `),
      wait(500),
    ],
    expectedState: 'pagination_detected',
    timeoutMs: 5000,
  });

  phases.push({
    name: 'detect_cursor',
    actions: [
      evaluate(`
        var nextLink = document.querySelector('a[rel="next"], a[href*="cursor"], a[href*="page_token"]');
        var data = document.querySelector('[data-cursor], [data-next-cursor]');
        window.__NEXT_CURSOR__ =
          (nextLink && nextLink.href && nextLink.href.match(/[?&]cursor=([^&]+)/) ? nextLink.href.match(/[?&]cursor=([^&]+)/)[1] : '') ||
          (data ? data.getAttribute('data-cursor') || data.getAttribute('data-next-cursor') || '' : '');
        window.__HAS_NEXT_PAGE__ = Boolean(window.__NEXT_CURSOR__);
      `),
      wait(500),
    ],
    expectedState: 'cursor_detected',
    timeoutMs: 5000,
  });

  return phases;
}

// ============ 爬取序列构建 ============

function buildDouyinScrape(params: ScrapeParams): ScrapeSequence {
  const limit = params.limit ?? 20;
  const scrollCount = Math.min(Math.ceil(limit / 12), 20);

  const urlMap: Record<string, string> = {
    profile: `https://www.douyin.com/user/${params.target}`,
    posts: `https://www.douyin.com/user/${params.target}`,
    comments: `https://www.douyin.com/video/${params.target}`,
    search: `https://www.douyin.com/search?q=${encodeURIComponent(params.target)}`,
  };

  const url = urlMap[params.type] ?? 'https://www.douyin.com';

  const phases: ScrapePhase[] = [
    buildNavigationPhase(url),
    buildScrollPhase(scrollCount, 2500),
    ...buildPaginationDetectPhase('douyin'),
    buildExtractPhase('douyin', params.type),
  ];

  return {
    platform: 'douyin',
    params,
    phases,
    totalEstimatedMs: 60000 + scrollCount * 4000,
    paginationType: 'infinite_scroll',
  };
}

function buildXiaohongshuScrape(params: ScrapeParams): ScrapeSequence {
  const limit = params.limit ?? 20;
  const scrollCount = Math.min(Math.ceil(limit / 10), 20);

  const urlMap: Record<string, string> = {
    profile: `https://www.xiaohongshu.com/user/profile/${params.target}`,
    posts: `https://www.xiaohongshu.com/user/profile/${params.target}`,
    comments: `https://www.xiaohongshu.com/discovery/item/${params.target}`,
    search: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(params.target)}&type=51`,
  };

  const url = urlMap[params.type] ?? 'https://www.xiaohongshu.com';

  const phases: ScrapePhase[] = [
    buildNavigationPhase(url),
    buildScrollPhase(scrollCount, 3000),
    ...buildPaginationDetectPhase('xiaohongshu'),
    buildExtractPhase('xiaohongshu', params.type),
  ];

  return {
    platform: 'xiaohongshu',
    params,
    phases,
    totalEstimatedMs: 60000 + scrollCount * 4500,
    paginationType: 'infinite_scroll',
  };
}

function buildWeiboScrape(params: ScrapeParams): ScrapeSequence {
  const limit = params.limit ?? 20;
  const scrollCount = Math.min(Math.ceil(limit / 9), 20);

  const urlMap: Record<string, string> = {
    profile: `https://weibo.com/u/${params.target}`,
    posts: `https://weibo.com/u/${params.target}`,
    comments: `https://weibo.com/${params.target}`,
    search: `https://s.weibo.com/weibo?q=${encodeURIComponent(params.target)}`,
  };

  const url = urlMap[params.type] ?? 'https://weibo.com';

  const phases: ScrapePhase[] = [
    buildNavigationPhase(url),
    buildScrollPhase(scrollCount, 2500),
    ...buildPaginationDetectPhase('weibo'),
    buildExtractPhase('weibo', params.type),
  ];

  return {
    platform: 'weibo',
    params,
    phases,
    totalEstimatedMs: 60000 + scrollCount * 4000,
    paginationType: 'infinite_scroll',
  };
}

function buildBilibiliScrape(params: ScrapeParams): ScrapeSequence {
  const limit = params.limit ?? 20;
  const scrollCount = Math.min(Math.ceil(limit / 30), 10);

  const urlMap: Record<string, string> = {
    profile: `https://www.bilibili.com/space/${params.target}`,
    posts: `https://www.bilibili.com/space/${params.target}`,
    comments: `https://www.bilibili.com/video/${params.target}`,
    search: `https://search.bilibili.com/all?keyword=${encodeURIComponent(params.target)}`,
  };

  const url = urlMap[params.type] ?? 'https://www.bilibili.com';

  const phases: ScrapePhase[] = [
    buildNavigationPhase(url),
    buildScrollPhase(scrollCount, 3000),
    ...buildPaginationDetectPhase('bilibili'),
    buildExtractPhase('bilibili', params.type),
  ];

  return {
    platform: 'bilibili',
    params,
    phases,
    totalEstimatedMs: 60000 + scrollCount * 4500,
    paginationType: 'infinite_scroll',
  };
}

// ============ 主构建函数 ============

export function buildScrapeSequence(platform: Platform, params: ScrapeParams): ScrapeSequence {
  switch (platform) {
    case 'douyin': return buildDouyinScrape(params);
    case 'xiaohongshu': return buildXiaohongshuScrape(params);
    case 'weibo': return buildWeiboScrape(params);
    case 'bilibili': return buildBilibiliScrape(params);
    default:
      return {
        platform,
        params,
        phases: [
          buildNavigationPhase(`https://www.${platform}.com`),
          buildExtractPhase(platform, params.type),
        ],
        totalEstimatedMs: 30000,
        paginationType: 'none',
      };
  }
}

// ============ 动作展平 ============

export function flattenScrapeSequence(sequence: ScrapeSequence): BrowserAction[] {
  const actions: BrowserAction[] = [];
  for (const phase of sequence.phases) {
    actions.push(...phase.actions);
  }
  return actions;
}

// ============ 数据提取 ============

export function extractItems(
  pageData: unknown,
  _platform: Platform,
  _type: ScrapeParams['type'],
): ExtractedItem[] {
  if (typeof pageData === 'string') {
    try {
      const parsed = JSON.parse(pageData);
      if (Array.isArray(parsed)) return parsed as ExtractedItem[];
    } catch {
      // fall through
    }
  }

  if (typeof pageData === 'object' && pageData !== null) {
    const obj = pageData as Record<string, unknown>;
    if (obj['items']) return obj['items'] as ExtractedItem[];
    if (obj['data']) {
      const d = obj['data'] as Record<string, unknown>;
      if (d['list']) return d['list'] as ExtractedItem[];
      if (d['items']) return d['items'] as ExtractedItem[];
      if (d['notes']) return d['notes'] as ExtractedItem[];
      if (d['aweme_list']) return d['aweme_list'] as ExtractedItem[];
      if (d['vlist']) return d['vlist'] as ExtractedItem[];
      if (d['cards']) return d['cards'] as ExtractedItem[];
      return Object.values(obj) as ExtractedItem[];
    }
  }

  return [];
}

// ============ 分页处理 ============

export interface PaginationState {
  hasMore: boolean;
  cursor?: string;
  page?: number;
  extracted: number;
}

export function detectPaginationState(pageData: unknown): PaginationState {
  if (typeof pageData === 'string') {
    try {
      const parsed = JSON.parse(pageData);
      if (parsed['has_more'] !== undefined) {
        return {
          hasMore: Boolean(parsed['has_more']),
          cursor: String(parsed['cursor'] ?? parsed['max_cursor'] ?? ''),
          extracted: Array.isArray(parsed['items'] ?? parsed['list'])
            ? (parsed['items'] ?? parsed['list']).length
            : 0,
        };
      }
    } catch {
      // fall through
    }
  }

  if (typeof pageData === 'object' && pageData !== null) {
    const obj = pageData as Record<string, unknown>;
    return {
      hasMore: Boolean(obj['has_more'] ?? obj['hasMore']),
      cursor: String(obj['cursor'] ?? obj['nextCursor'] ?? obj['maxCursor'] ?? ''),
      extracted: Array.isArray(obj['items'] ?? obj['list'])
        ? (obj['items'] ?? obj['list'] as unknown[]).length
        : 0,
    };
  }

  return { hasMore: false, extracted: 0 };
}

export function buildNextPageAction(
  paginationType: ScrapeSequence['paginationType'],
  cursor?: string,
  page?: number,
): BrowserAction[] {
  switch (paginationType) {
    case 'infinite_scroll':
      return [scrollToBottom(), humanDelay(2000, 4000)];

    case 'load_more':
      return [
        evaluate(`
          var btn = document.querySelector('.load-more, .next, [data-e2e="load-more"]');
          if (btn && !btn.disabled) btn.scrollIntoView({ behavior: 'instant', block: 'center' });
        `),
        humanDelay(500, 1500),
        { type: 'click', params: { selector: '.load-more, .next, [data-e2e="load-more"]' } },
        humanDelay(2000, 4000),
      ];

    case 'cursor':
      return [
        evaluate(`
          var cur = '${cursor ?? ''}';
          var nextLink = document.querySelector('a[rel="next"], a[href*="cursor=' + cur + '"]');
          if (nextLink) window.__NEXT_URL__ = nextLink.href;
        `),
        wait(500),
        evaluate(`
          if (window.__NEXT_URL__) window.location.href = window.__NEXT_URL__;
        `),
        humanDelay(3000, 5000),
      ];

    case 'page_number': {
      const nextPage = (page ?? 1) + 1;
      return [
        evaluate(`var pageBtn = document.querySelector('[data-page="${nextPage}"], .page-${nextPage}'); if (pageBtn) pageBtn.click();`),
        humanDelay(2000, 4000),
      ];
    }

    case 'none':
    default:
      return [];
  }
}

// ============ 批量爬取 ============

export interface BatchScrapeParams {
  platform: Platform;
  targets: ScrapeParams[];
  concurrentLimit?: number;
  delayBetweenBatches?: number;
}

export function buildBatchScrapeSequences(params: BatchScrapeParams): ScrapeSequence[] {
  return params.targets.map((targetParams) => buildScrapeSequence(params.platform, targetParams));
}
