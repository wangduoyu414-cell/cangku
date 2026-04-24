import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskScheduler, DEFAULT_RATE_LIMITS } from '@creator-os/scheduler';
import type { Action, Task } from '@creator-os/core';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task_${Math.random().toString(36).slice(2, 8)}`,
    type: 'scrape_posts',
    params: { platform: 'douyin' },
    status: 'pending',
    priority: 0,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  describe('enqueue()', () => {
    it('should add a task to the queue', () => {
      const action: Action = { type: 'scrape_posts', params: { platform: 'douyin' } };
      const task = scheduler.enqueue(action);
      expect(task.status).toBe('pending');
      expect(task.id).toBeDefined();
    });

    it('should sort by priority (higher first)', () => {
      const action1: Action = { type: 'scrape_posts', params: {}, priority: 1 };
      const action2: Action = { type: 'scrape_posts', params: {}, priority: 10 };
      scheduler.enqueue(action1);
      scheduler.enqueue(action2);
      const stats = scheduler.getStats();
      expect(stats.pending).toBe(2);
    });
  });

  describe('getStats().completed', () => {
    it('should return 0 initially', () => {
      const stats = scheduler.getStats();
      expect(stats.completed).toBe(0);
    });

    it('should increment completed counter on success', () => {
      const action: Action = { type: 'scrape_posts', params: {} };
      const task = scheduler.enqueue(action);
      const dequeued = scheduler.dequeue();
      expect(dequeued?.id).toBe(task.id);
      scheduler.complete(task.id, { success: true });
      const stats = scheduler.getStats();
      expect(stats.completed).toBe(1);
    });

    it('should NOT increment completed counter on failure', () => {
      const action: Action = { type: 'scrape_posts', params: {} };
      const task = scheduler.enqueue(action);
      const dequeued = scheduler.dequeue();
      scheduler.complete(task.id, { success: false, error: 'test error' });
      const stats = scheduler.getStats();
      expect(stats.completed).toBe(0);
    });

    it('should count multiple completed tasks', () => {
      for (let i = 0; i < 5; i++) {
        const task = scheduler.enqueue({ type: 'scrape_posts', params: {} });
        scheduler.dequeue();
        scheduler.complete(task.id, { success: true });
      }
      expect(scheduler.getStats().completed).toBe(5);
    });
  });

  describe('retry logic', () => {
    it('should NOT retry non-retryable failures', () => {
      const task = scheduler.enqueue({ type: 'scrape_posts', params: {}, retryable: false, maxRetries: 3 });
      scheduler.dequeue();
      scheduler.complete(task.id, { success: false, error: 'failed', retryable: false });
      const stats = scheduler.getStats();
      expect(stats.pending).toBe(0);
      expect(stats.completed).toBe(0);
    });

    it('should retry retryable failures up to maxRetries', () => {
      const task = scheduler.enqueue({
        type: 'scrape_posts',
        params: {},
        retryable: true,
        maxRetries: 2,
      });
      scheduler.dequeue();
      scheduler.complete(task.id, { success: false, error: 'temp error', retryable: true });

      const stats = scheduler.getStats();
      expect(stats.pending).toBe(1); // retried back to queue
      expect(stats.completed).toBe(0);

      scheduler.dequeue();
      scheduler.complete(task.id, { success: false, error: 'temp error', retryable: true });
      expect(scheduler.getStats().completed).toBe(0); // still retrying

      scheduler.dequeue();
      scheduler.complete(task.id, { success: false, error: 'temp error', retryable: true });
      expect(scheduler.getStats().completed).toBe(0); // exhausted retries, still in running
    });

    it('should mark as failed after max retries exhausted', () => {
      const task = scheduler.enqueue({
        type: 'scrape_posts',
        params: {},
        retryable: true,
        maxRetries: 1,
      });
      scheduler.dequeue();
      scheduler.complete(task.id, { success: false, error: 'temp', retryable: true });
      scheduler.dequeue();
      scheduler.complete(task.id, { success: false, error: 'temp', retryable: true });
      const stats = scheduler.getStats();
      expect(stats.completed).toBe(0); // failed, not counted as completed
    });
  });

  describe('rate limit enforcement', () => {
    it('should allow task enqueue when under daily limit', () => {
      const accountStore = new Map();
      accountStore.set('acc_001', {
        id: 'acc_001',
        platform: 'douyin',
        state: 'active',
        stateChangedAt: Date.now(),
        dailyRequestCount: 100,
      } as any);
      scheduler.setAccountStore(accountStore);

      const action: Action = { type: 'scrape_posts', params: { platform: 'douyin' } };
      expect(() => scheduler.enqueue(action, 'acc_001')).not.toThrow();
    });

    it('should throw when daily limit exceeded', () => {
      const accountStore = new Map();
      accountStore.set('acc_001', {
        id: 'acc_001',
        platform: 'douyin',
        state: 'active',
        stateChangedAt: Date.now(),
        dailyRequestCount: 501,
      } as any);
      scheduler.setAccountStore(accountStore);

      const action: Action = { type: 'scrape_posts', params: { platform: 'douyin' } };
      expect(() => scheduler.enqueue(action, 'acc_001')).toThrow(/rate limit exceeded/i);
    });

    it('should throw for xiaohongshu at its limit', () => {
      const accountStore = new Map();
      accountStore.set('acc_002', {
        id: 'acc_002',
        platform: 'xiaohongshu',
        state: 'active',
        stateChangedAt: Date.now(),
        dailyRequestCount: 300,
      } as any);
      scheduler.setAccountStore(accountStore);

      const action: Action = { type: 'scrape_posts', params: { platform: 'xiaohongshu' } };
      expect(() => scheduler.enqueue(action, 'acc_002')).toThrow(/rate limit exceeded/i);
    });
  });

  describe('DEFAULT_RATE_LIMITS', () => {
    it('should have limits for all 8 platforms', () => {
      const platforms = ['douyin', 'xiaohongshu', 'weibo', 'bilibili', 'taobao', 'jd', 'pinduoduo', 'tiktok'];
      for (const p of platforms) {
        expect(DEFAULT_RATE_LIMITS[p as keyof typeof DEFAULT_RATE_LIMITS]).toBeDefined();
        expect(DEFAULT_RATE_LIMITS[p as keyof typeof DEFAULT_RATE_LIMITS].dailyMax).toBeGreaterThan(0);
      }
    });

    it('should have douyin at 500 daily limit', () => {
      expect(DEFAULT_RATE_LIMITS.douyin.dailyMax).toBe(500);
    });
  });

  describe('listCompletedTasks()', () => {
    it('should return empty initially', () => {
      expect(scheduler.listCompletedTasks()).toEqual([]);
    });

    it('should return completed tasks', () => {
      const task = scheduler.enqueue({ type: 'scrape_posts', params: {} });
      scheduler.dequeue();
      scheduler.complete(task.id, { success: true });
      expect(scheduler.listCompletedTasks().length).toBe(1);
    });
  });

  describe('cancel()', () => {
    it('should remove pending task from queue', () => {
      const task = scheduler.enqueue({ type: 'scrape_posts', params: {} });
      scheduler.cancel(task.id);
      expect(scheduler.getStats().pending).toBe(0);
    });

    it('should mark running task as cancelled', () => {
      const task = scheduler.enqueue({ type: 'scrape_posts', params: {} });
      scheduler.dequeue();
      scheduler.cancel(task.id);
      expect(scheduler.getStats().running).toBe(0);
    });
  });
});
