// 容器池 — 与设计文档第 9.2 节对齐

import type { ContainerConfig, ContainerSnapshot } from '@creator-os/core';
import { BrowserContainer, AppContainer } from '../manager/index.js';

interface PoolOptions {
  maxContainers?: number;
  idleTimeoutMs?: number;
}

export class ContainerPool {
  private readonly maxContainers: number;
  private readonly idleTimeoutMs: number;
  private readonly containers = new Map<string, BrowserContainer>();
  private readonly accountToContainer = new Map<string, string>();
  private readonly lastUsed = new Map<string, number>();

  constructor(options: PoolOptions = {}) {
    this.maxContainers = options.maxContainers ?? 50;
    this.idleTimeoutMs = options.idleTimeoutMs ?? 30 * 60 * 1_000;
  }

  async acquire(config: ContainerConfig): Promise<BrowserContainer> {
    // 1. 检查是否已有该账号的容器
    const existingId = this.accountToContainer.get(config.account.id);
    if (existingId && this.containers.has(existingId)) {
      const container = this.containers.get(existingId)!;
      await container.start();
      this.lastUsed.set(existingId, Date.now());
      return container;
    }

    // 2. 容器池已满，驱逐 LRU
    if (this.containers.size >= this.maxContainers) {
      await this.evictLeastRecentlyUsed();
    }

    // 3. 创建新容器
    const container =
      config.mode === 'app'
        ? new AppContainer(config.id, config, config.id)
        : new BrowserContainer(config.id, config);

    this.containers.set(container.id, container);
    this.accountToContainer.set(config.account.id, container.id);
    this.lastUsed.set(container.id, Date.now());

    await container.start();
    return container;
  }

  async release(containerId: string): Promise<void> {
    const container = this.containers.get(containerId);
    if (!container) return;

    await container.saveSession();
    await container.stop();

    if (this.containers.size > this.maxContainers * 0.8) {
      this.containers.delete(containerId);
      this.accountToContainer.delete(container.config.account.id);
      this.lastUsed.delete(containerId);
    }
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, time] of this.lastUsed) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestId = id;
      }
    }

    if (oldestId) {
      await this.release(oldestId);
    }
  }

  listContainers(): Array<{ id: string; snapshot: ContainerSnapshot }> {
    return Array.from(this.containers.values()).map((c) => ({
      id: c.id,
      snapshot: c.getSnapshot(),
    }));
  }

  getContainer(id: string): BrowserContainer | undefined {
    return this.containers.get(id);
  }
}
