// 行为模拟层 — 与设计文档第 5 章对齐

import type { Page } from 'playwright';

export interface GhostCursorOptions {
  startRadius?: number;
  speed?: 'human' | 'fast';
  variance?: number;
  curvature?: number;
}

// ============ GhostCursor 轨迹生成 ============

export function generateGhostCursorPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  options: GhostCursorOptions = {},
): Array<{ x: number; y: number }> {
  const { startRadius = 50, variance = 0.2, curvature = 0.5 } = options;

  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // 计算起点的随机偏移（在 startRadius 圆内）
  const angleStart = Math.random() * 2 * Math.PI;
  const radiusStart = Math.random() * startRadius;
  const sx = startX + Math.cos(angleStart) * radiusStart;
  const sy = startY + Math.sin(angleStart) * radiusStart;

  // 控制点（曲线的曲率）
  const midX = (sx + endX) / 2 + (Math.random() - 0.5) * dist * curvature;
  const midY = (sy + endY) / 2 + (Math.random() - 0.5) * dist * curvature;

  // 二阶贝塞尔采样
  const steps = Math.max(10, Math.floor(dist / 20));
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(
      (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * midX + t * t * endX +
        (Math.random() - 0.5) * variance * 10,
    );
    const y = Math.round(
      (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * midY + t * t * endY +
        (Math.random() - 0.5) * variance * 10,
    );
    points.push({ x, y });
  }

  return points;
}

// ============ 惯性滚动 ============

export async function inertialScroll(page: Page, depth: number = 5, delta: number = 300): Promise<void> {
  for (let i = 0; i < depth; i++) {
    await page.mouse.wheel(0, delta);
    const delay = 200 + Math.random() * 300;
    await page.waitForTimeout(delay);
  }
}

// ============ 人类延迟 ============

export function humanDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// ============ Think Time ============

export function randomThinkTime(range: [number, number]): number {
  return range[0] + Math.random() * (range[1] - range[0]);
}

// ============ 速率限制 ============

const RATE_LIMITS: Record<string, { minInterval: number; dailyMax: number }> = {
  douyin: { minInterval: 30_000, dailyMax: 800 },
  xiaohongshu: { minInterval: 60_000, dailyMax: 300 },
  weibo: { minInterval: 15_000, dailyMax: 2_000 },
  bilibili: { minInterval: 20_000, dailyMax: 1_000 },
  taobao: { minInterval: 20_000, dailyMax: 2_000 },
  jd: { minInterval: 20_000, dailyMax: 2_000 },
  pinduoduo: { minInterval: 15_000, dailyMax: 3_000 },
  tiktok: { minInterval: 30_000, dailyMax: 500 },
};

export function getRateLimit(platform: string): { minInterval: number; dailyMax: number } {
  return RATE_LIMITS[platform] ?? { minInterval: 60_000, dailyMax: 500 };
}

// ============ 代理延迟（模拟真实网络） ============

export function proxyLatencyDelay(avgLatency: number): Promise<void> {
  const jitter = avgLatency * 0.3 * (Math.random() - 0.5);
  const delay = avgLatency + jitter;
  return new Promise((resolve) => setTimeout(resolve, Math.max(10, delay)));
}
