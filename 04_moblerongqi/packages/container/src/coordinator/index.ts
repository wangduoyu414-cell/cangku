// 跨容器协调 — 与设计文档第 9.4 节对齐

import type { Platform } from '@creator-os/core';

// ============ 协调信号 ============

export interface CoordinationSignal {
  id: string;
  type: 'release' | 'acquire' | 'broadcast' | 'barrier';
  payload?: unknown;
  timestamp: number;
}

// ============ 跨容器协调器 ============

type SignalHandler = (signal: CoordinationSignal) => void | Promise<void>;

export class CrossContainerCoordinator {
  private handlers = new Map<string, Set<SignalHandler>>();
  private signals: CoordinationSignal[] = [];

  /** 注册信号处理器 */
  on(type: string, handler: SignalHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  /** 发布信号 */
  async emit(signal: CoordinationSignal): Promise<void> {
    this.signals.push(signal);
    const handlers = this.handlers.get(signal.type);
    if (handlers) {
      await Promise.all([...handlers].map((h) => h(signal)));
    }
  }

  /** 等待所有容器完成特定操作 */
  async barrier(
    containerIds: string[],
    operation: string,
    timeoutMs = 120_000,
  ): Promise<void> {
    const pending = new Set(containerIds);
    const start = Date.now();

    await new Promise<void>((resolve) => {
      const done = (signal: CoordinationSignal) => {
        if (
          signal.type === 'broadcast' &&
          signal.payload === operation &&
          pending.has(signal.id)
        ) {
          pending.delete(signal.id);
          if (pending.size === 0) resolve();
        }
      };
      this.on('broadcast', done);
      setTimeout(resolve, timeoutMs);
    });
  }

  /** 按平台获取容器锁（防止同一平台并发冲突） */
  async acquirePlatformLock(
    containerId: string,
    platform: Platform,
    ttlMs = 60_000,
  ): Promise<() => void> {
    const lockKey = `platform:${platform}`;
    const signal: CoordinationSignal = {
      id: containerId,
      type: 'acquire',
      payload: { lockKey, ttlMs },
      timestamp: Date.now(),
    };

    // 简化为直接信号广播（生产环境应使用 Redis 等分布式锁）
    await this.emit(signal);

    const release = () =>
      this.emit({
        id: containerId,
        type: 'release',
        payload: { lockKey },
        timestamp: Date.now(),
      });

    return release;
  }

  getSignalHistory(): CoordinationSignal[] {
    return [...this.signals];
  }
}
