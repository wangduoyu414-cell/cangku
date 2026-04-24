// 平台适配器内部类型 — 对应 adapters/index.ts 中导出的 PublishAdapter 接口

import type { Platform, BrowserAction } from '@creator-os/core';

// ============ 发布参数 ============

export interface PublishParams {
  content: string;
  mediaPaths?: string[];
  tags?: string[];
  visibility?: 'public' | 'private' | 'friends';
}

// ============ 发布结果 ============

export interface PublishResult {
  id: string;
  url: string;
  publishedAt: number;
}

// ============ 爬取参数 ============

export interface ScrapeParams {
  type: 'profile' | 'posts' | 'comments' | 'search';
  target: string;
  limit?: number;
}

// ============ 爬取结果 ============

export interface ScrapeResult {
  items: Record<string, unknown>[];
  nextCursor?: string;
  fetchedAt: number;
}

// ============ 交互参数 ============

export interface InteractionParams {
  type: 'like' | 'follow' | 'comment' | 'bookmark' | 'share' | 'dm';
  targetId: string;
  content?: string;
}
