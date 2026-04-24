// 平台配置模板 — 与设计文档第 11 章完全对齐

import type { Platform } from '../types/index.js';

export interface PlatformConfig {
  platform: Platform;
  priority: 'highest' | 'high' | 'medium' | 'low';
  mode: 'browser' | 'app';
  browser?: {
    engine: 'chromium' | 'firefox' | 'webkit';
    args?: string[];
  };
  fingerprint: {
    device: string;
    timezone: string;
    locale: string;
    connection?: {
      effectiveType: '4g' | '3g' | '2g';
      downlink: number;
      rtt: number;
    };
  };
  proxy: {
    type: 'mobile_4g' | 'residential' | 'datacenter';
    asnMatch?: boolean;
  };
  rateLimit: {
    minInterval: number;
    dailyMax: number;
  };
  publishing?: {
    api: 'official' | null;
    fallback?: 'browser';
    method?: 'api' | 'browser';
    riskLevel?: 'low' | 'medium' | 'high';
    warmupDays?: number;
    requiresApproval?: boolean;
    requiresEnterprise?: boolean;
  };
  creatorAPIs?: Array<{ name: string; url?: string; provider?: string }>;
}

export const platformConfigs: Record<Platform, PlatformConfig> = {
  douyin: {
    platform: 'douyin',
    priority: 'highest',
    mode: 'browser',
    browser: { engine: 'chromium', args: ['--disable-blink-features=AutomationControlled'] },
    fingerprint: {
      device: 'pixel_8',
      timezone: 'Asia/Shanghai',
      locale: 'zh-CN',
      connection: { effectiveType: '4g', downlink: 10, rtt: 50 },
    },
    proxy: { type: 'mobile_4g', asnMatch: true },
    rateLimit: { minInterval: 30_000, dailyMax: 800 },
    publishing: {
      api: 'official',
      fallback: 'browser',
      requiresApproval: true,
    },
    creatorAPIs: [
      { name: 'douyin_creator_center', url: 'https://creator.douyin.com' },
      { name: 'chanmama', provider: 'third_party' },
    ],
  },

  xiaohongshu: {
    platform: 'xiaohongshu',
    priority: 'high',
    mode: 'browser',
    browser: { engine: 'chromium', args: ['--disable-blink-features=AutomationControlled'] },
    fingerprint: {
      device: 'pixel_8',
      timezone: 'Asia/Shanghai',
      locale: 'zh-CN',
      connection: { effectiveType: '4g', downlink: 8, rtt: 60 },
    },
    proxy: { type: 'mobile_4g' },
    rateLimit: { minInterval: 60_000, dailyMax: 300 },
    publishing: {
      api: null,
      method: 'browser',
      riskLevel: 'high',
      warmupDays: 7,
    },
  },

  weibo: {
    platform: 'weibo',
    priority: 'medium',
    mode: 'browser',
    browser: { engine: 'chromium' },
    fingerprint: {
      device: 'pixel_8',
      timezone: 'Asia/Shanghai',
      locale: 'zh-CN',
    },
    proxy: { type: 'residential' },
    rateLimit: { minInterval: 15_000, dailyMax: 2_000 },
    publishing: {
      api: 'official',
      method: 'browser',
    },
  },

  bilibili: {
    platform: 'bilibili',
    priority: 'medium',
    mode: 'browser',
    browser: { engine: 'chromium' },
    fingerprint: {
      device: 'pixel_8',
      timezone: 'Asia/Shanghai',
      locale: 'zh-CN',
    },
    proxy: { type: 'residential' },
    rateLimit: { minInterval: 20_000, dailyMax: 1_000 },
    publishing: {
      api: 'official',
      requiresApproval: true,
    },
  },

  taobao: {
    platform: 'taobao',
    priority: 'medium',
    mode: 'browser',
    browser: { engine: 'chromium' },
    fingerprint: {
      device: 'iphone_15',
      timezone: 'Asia/Shanghai',
      locale: 'zh-CN',
    },
    proxy: { type: 'residential' },
    rateLimit: { minInterval: 20_000, dailyMax: 2_000 },
    publishing: {
      api: 'official',
      method: 'api',
      requiresEnterprise: true,
    },
  },

  jd: {
    platform: 'jd',
    priority: 'medium',
    mode: 'browser',
    browser: { engine: 'chromium' },
    fingerprint: {
      device: 'iphone_15',
      timezone: 'Asia/Shanghai',
      locale: 'zh-CN',
    },
    proxy: { type: 'residential' },
    rateLimit: { minInterval: 20_000, dailyMax: 2_000 },
  },

  pinduoduo: {
    platform: 'pinduoduo',
    priority: 'low',
    mode: 'browser',
    browser: { engine: 'chromium' },
    fingerprint: {
      device: 'pixel_8',
      timezone: 'Asia/Shanghai',
      locale: 'zh-CN',
    },
    proxy: { type: 'residential' },
    rateLimit: { minInterval: 15_000, dailyMax: 3_000 },
  },

  tiktok: {
    platform: 'tiktok',
    priority: 'high',
    mode: 'browser',
    browser: { engine: 'chromium', args: ['--disable-blink-features=AutomationControlled'] },
    fingerprint: {
      device: 'iphone_15',
      timezone: 'Asia/Shanghai',
      locale: 'zh-CN',
      connection: { effectiveType: '4g', downlink: 10, rtt: 50 },
    },
    proxy: { type: 'mobile_4g' },
    rateLimit: { minInterval: 30_000, dailyMax: 500 },
  },
};

export function getPlatformConfig(platform: Platform): PlatformConfig {
  return platformConfigs[platform];
}
