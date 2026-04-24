// 常量声明

export const APP_VERSION = '0.1.0';

export const KEYCODE: Record<string, number> = {
  home: 3,
  back: 4,
  power: 26,
  volumeup: 24,
  volumedown: 25,
  menu: 82,
  search: 84,
  enter: 66,
  delete: 67,
};

export const DEFAULT_RATE_LIMITS: Record<string, { minInterval: number; dailyMax: number }> = {
  douyin: { minInterval: 30_000, dailyMax: 800 },
  xiaohongshu: { minInterval: 60_000, dailyMax: 300 },
  weibo: { minInterval: 15_000, dailyMax: 2_000 },
  bilibili: { minInterval: 20_000, dailyMax: 1_000 },
  taobao: { minInterval: 20_000, dailyMax: 2_000 },
  jd: { minInterval: 20_000, dailyMax: 2_000 },
  pinduoduo: { minInterval: 15_000, dailyMax: 3_000 },
  tiktok: { minInterval: 30_000, dailyMax: 500 },
};

export const RECOVERY_THRESHOLDS = {
  captchaWarning: 0.05,
  captchaCritical: 0.15,
  successRateWarning: 0.90,
} as const;

export const CONTAINER_DEFAULTS = {
  maxContainers: 50,
  idleTimeoutMs: 30 * 60 * 1_000,
  containerEvictThreshold: 0.8,
} as const;

export const DEFAULT_WARMUP_DAYS = {
  default: 3,
  xiaohongshu: 7,
} as const;

export const CANVAS_NOISE_SEED = 0.00005;

export const TASK_DEFAULTS = {
  defaultPriority: 5,
  maxRetries: 3,
  retryDelayMs: 2_000,
} as const;
