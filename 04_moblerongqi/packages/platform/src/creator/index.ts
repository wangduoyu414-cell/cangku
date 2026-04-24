// 创作者经济层 — 与设计文档第 17 节对齐

import type { Platform, ContentItem, PublishResult, RevenueEntry } from '@creator-os/core';

// ============ 收入聚合器 ============

export interface RevenueRecord {
  platform: Platform;
  accountId: string;
  entries: RevenueEntry[];
  lastUpdated: number;
}

export interface AggregatedRevenue {
  total: number;
  byPlatform: Record<Platform, number>;
  byDay: Record<string, number>;
  trends: {
    dailyAvg: number;
    weeklyGrowth: number;
    monthlyGrowth: number;
  };
}

export class RevenueAggregator {
  private records = new Map<string, RevenueRecord>();

  addEntry(accountId: string, entry: RevenueEntry): void {
    const record = this.records.get(accountId) ?? {
      platform: entry.platform,
      accountId,
      entries: [],
      lastUpdated: 0,
    };
    record.entries.push(entry);
    record.lastUpdated = Date.now();
    this.records.set(accountId, record);
  }

  aggregate(accountIds: string[]): AggregatedRevenue {
    let total = 0;
    const byPlatform: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    for (const id of accountIds) {
      const record = this.records.get(id);
      if (!record) continue;

      for (const entry of record.entries) {
        total += entry.amount;
        byPlatform[entry.platform] = (byPlatform[entry.platform] ?? 0) + entry.amount;
        const day = new Date(entry.date).toISOString().slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + entry.amount;
      }
    }

    const days = Object.keys(byDay).sort();
    const recentDays = days.slice(-7);
    const dailyVals = recentDays.map((d) => byDay[d] ?? 0);
    const dailyAvg = dailyVals.length > 0 ? dailyVals.reduce((a, b) => a + b, 0) / dailyVals.length : 0;

    return {
      total,
      byPlatform: byPlatform as Record<Platform, number>,
      byDay,
      trends: { dailyAvg, weeklyGrowth: 0, monthlyGrowth: 0 },
    };
  }
}

// ============ 增长分析器 ============

export interface GrowthMetrics {
  accountId: string;
  platform: Platform;
  followers: number;
  engagement: number;
  contentCount: number;
  lastUpdated: number;
}

export interface ROIScore {
  accountId: string;
  roi: number;
  grade: 'A' | 'B' | 'C' | 'D';
  insight: string;
}

export class GrowthAnalyzer {
  private metrics = new Map<string, GrowthMetrics[]>();

  recordMetrics(m: GrowthMetrics): void {
    const hist = this.metrics.get(m.accountId) ?? [];
    hist.push(m);
    if (hist.length > 90) hist.shift();
    this.metrics.set(m.accountId, hist);
  }

  computeROI(accountId: string, revenue: number): ROIScore {
    const hist = this.metrics.get(accountId) ?? [];
    const latest = hist.at(-1);
    if (!latest || hist.length < 2) {
      return { accountId, roi: 0, grade: 'D', insight: '数据不足，无法计算 ROI' };
    }

    const prev = hist[0]!;
    const growth = (latest.followers - prev.followers) / Math.max(prev.followers, 1);
    const costPerFollower = 0.05; // 估算成本
    const revenuePerFollower = revenue / Math.max(latest.followers, 1);
    const roi = (revenuePerFollower - costPerFollower) / costPerFollower;

    let grade: ROIScore['grade'];
    if (roi > 5) grade = 'A';
    else if (roi > 2) grade = 'B';
    else if (roi > 0.5) grade = 'C';
    else grade = 'D';

    return {
      accountId,
      roi,
      grade,
      insight: `ROI ${roi.toFixed(2)}x，等级 ${grade}`,
    };
  }
}
