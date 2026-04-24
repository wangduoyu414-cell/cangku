// 运营策略矩阵 — 与设计文档第 9.3 节对齐
// 策略定义来自 core/types/index.ts (OperationStrategy, BehaviorStrategy, ContentStrategy, RiskStrategy)

import type {
  OperationStrategy,
  BehaviorStrategy,
  ContentStrategy,
  RiskStrategy,
  Platform,
} from '@creator-os/core';

// ============ 策略工厂 ============

export interface StrategyContext {
  platform: Platform;
  accountAge: number; // 天
  violationCount: number;
  lastActionTime: number;
  actionCount24h: number;
  isWarmedUp: boolean;
}

/** 根据上下文推断推荐策略强度 */
export function inferStrategy(ctx: StrategyContext): OperationStrategy {
  const base: OperationStrategy = {
    id: `infer-${ctx.platform}-${Date.now()}`,
    name: `Inferred ${ctx.platform}`,
    platform: ctx.platform,
    behavior: buildBehaviorStrategy(ctx),
    content: buildContentStrategy(ctx),
    risk: buildRiskStrategy(ctx),
  };
  return base;
}

function buildBehaviorStrategy(ctx: StrategyContext): BehaviorStrategy {
  if (ctx.accountAge < 7) {
    return { dailyActions: 50, actionInterval: 60_000, likeRatio: 0.3, followRatio: 0.1, commentRatio: 0.05, randomThinkTime: [5000, 15000] };
  }
  if (ctx.accountAge < 30) {
    return { dailyActions: 150, actionInterval: 30_000, likeRatio: 0.5, followRatio: 0.2, commentRatio: 0.1, randomThinkTime: [2000, 8000] };
  }
  return { dailyActions: 300, actionInterval: 15_000, likeRatio: 0.7, followRatio: 0.3, commentRatio: 0.15, randomThinkTime: [800, 4000] };
}

function buildContentStrategy(ctx: StrategyContext): ContentStrategy {
  if (ctx.accountAge < 7) {
    return { publishEnabled: false, maxDailyPublish: 0, preferredTags: [], avoidTopics: [] };
  }
  if (ctx.accountAge < 30) {
    return { publishEnabled: true, maxDailyPublish: 3, preferredTags: [], avoidTopics: ['敏感话题'] };
  }
  return { publishEnabled: true, maxDailyPublish: 10, preferredTags: [], avoidTopics: [] };
}

function buildRiskStrategy(ctx: StrategyContext): RiskStrategy {
  if (ctx.violationCount > 0 || ctx.accountAge < 7) {
    return { maxCaptchaPerDay: 1, cooldownOnCaptcha: 3600_000, autoQuarantine: true };
  }
  if (ctx.accountAge < 30) {
    return { maxCaptchaPerDay: 3, cooldownOnCaptcha: 1800_000, autoQuarantine: true };
  }
  return { maxCaptchaPerDay: 10, cooldownOnCaptcha: 600_000, autoQuarantine: false };
}

// ============ 策略执行器 ============

export class StrategyExecutor {
  constructor(private readonly strategy: OperationStrategy) {}

  isQuietHour(): boolean {
    return false; // 简化: skipHours 需要额外的时间范围字段
  }

  isCooldownElapsed(lastActionTime: number): boolean {
    return Date.now() - lastActionTime > this.strategy.behavior.actionInterval;
  }

  /** 行为配额耗尽则暂停 */
  isDailyQuotaExceeded(actionCount24h: number): boolean {
    return actionCount24h >= this.strategy.behavior.dailyActions;
  }
}
