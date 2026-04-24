// 任务调度器 — 与设计文档第 1、12 章对齐

import type { Task, TaskStatus, Action, ActionResult, Platform, Account } from '@creator-os/core';
import { TASK_DEFAULTS } from '@creator-os/core';

export interface SchedulerOptions {
  redisUrl?: string;
  maxConcurrent?: number;
}

export interface RateLimitConfig {
  platform: Platform;
  dailyMax: number;
  intervalMin: number;
  intervalMax: number;
}

export const DEFAULT_RATE_LIMITS: Record<Platform, RateLimitConfig> = {
  douyin: { platform: 'douyin', dailyMax: 500, intervalMin: 30_000, intervalMax: 60_000 },
  xiaohongshu: { platform: 'xiaohongshu', dailyMax: 300, intervalMin: 20_000, intervalMax: 45_000 },
  weibo: { platform: 'weibo', dailyMax: 400, intervalMin: 25_000, intervalMax: 50_000 },
  bilibili: { platform: 'bilibili', dailyMax: 300, intervalMin: 20_000, intervalMax: 45_000 },
  taobao: { platform: 'taobao', dailyMax: 200, intervalMin: 30_000, intervalMax: 60_000 },
  jd: { platform: 'jd', dailyMax: 200, intervalMin: 30_000, intervalMax: 60_000 },
  pinduoduo: { platform: 'pinduoduo', dailyMax: 150, intervalMin: 35_000, intervalMax: 70_000 },
  tiktok: { platform: 'tiktok', dailyMax: 400, intervalMin: 25_000, intervalMax: 50_000 },
};

export class TaskScheduler {
  private readonly queue: Task[] = [];
  private readonly running = new Map<string, Task>();
  private completedCount = 0;
  private readonly completed: Task[] = [];
  private accountStoreRef: Map<string, Account> | null = null;

  constructor(private readonly options: SchedulerOptions = {}) {}

  /** Provide a reference to the account store for rate-limit checks */
  setAccountStore(store: Map<string, Account>): void {
    this.accountStoreRef = store;
  }

  enqueue(action: Action, accountId?: string, containerId?: string, priority?: number): Task {
    const platform = (action.params['platform'] as Platform) ?? 'douyin';
    const limit = DEFAULT_RATE_LIMITS[platform];

    if (accountId && this.accountStoreRef) {
      const account = this.accountStoreRef.get(accountId);
      if (account && account.dailyRequestCount >= limit.dailyMax) {
        throw new Error(`Daily rate limit exceeded for account ${accountId} on ${platform} (${account.dailyRequestCount}/${limit.dailyMax})`);
      }
    }

    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: action.type,
      params: action.params,
      containerId,
      accountId,
      status: 'pending',
      priority: priority ?? TASK_DEFAULTS.defaultPriority,
      createdAt: Date.now(),
      maxRetries: action.maxRetries,
    };
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    return task;
  }

  dequeue(): Task | undefined {
    const task = this.queue.shift();
    if (task) {
      task.status = 'running';
      task.startedAt = Date.now();
      this.running.set(task.id, task);
    }
    return task;
  }

  complete(taskId: string, result: ActionResult): void {
    const task = this.running.get(taskId);
    if (!task) return;
    task.result = result;

    const maxRetries = task.maxRetries ?? 3;
    const retryCount = (task as { retryCount?: number })['retryCount'] ?? 0;

    if (result.retryable && retryCount < maxRetries) {
      (task as { retryCount?: number })['retryCount'] = retryCount + 1;
      task.status = 'pending';
      task.startedAt = undefined;
      this.enqueue({ type: task.type, params: task.params, priority: task.priority, maxRetries, retryable: result.retryable }, task.accountId, task.containerId, task.priority);
      this.running.delete(taskId);
      return;
    }

    task.status = result.success ? 'completed' : 'failed';
    task.completedAt = Date.now();
    this.running.delete(taskId);
    if (result.success) {
      this.completedCount++;
      this.completed.push(task);
      if (this.completed.length > 1000) {
        this.completed.shift();
      }
    }
  }

  cancel(taskId: string): void {
    const idx = this.queue.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      this.queue.splice(idx, 1);
    }
    const task = this.running.get(taskId);
    if (task) {
      task.status = 'cancelled';
      task.completedAt = Date.now();
      this.running.delete(taskId);
    }
  }

  getStats(): { pending: number; running: number; completed: number } {
    return {
      pending: this.queue.length,
      running: this.running.size,
      completed: this.completedCount,
    };
  }

  listTasks(): Task[] {
    return [...this.queue, ...this.running.values()];
  }

  listCompletedTasks(): Task[] {
    return this.completed;
  }
}
