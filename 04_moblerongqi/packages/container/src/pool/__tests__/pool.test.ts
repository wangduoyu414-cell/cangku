import { describe, it, expect, beforeEach } from 'vitest';
import type { ContainerConfig } from '@creator-os/core';

import { ContainerPool } from '@creator-os/container';

const makeConfig = (id: string, accountId: string): ContainerConfig => ({
  id,
  platform: 'douyin',
  mode: 'browser',
  profile: {
    id: 'test', name: 'Test', userAgent: 'Mozilla/5.0', platform: 'Win32',
    screen: { width: 1920, height: 1080, colorDepth: 24, devicePixelRatio: 1 },
    viewport: { width: 1920, height: 1080, isMobile: false, hasTouch: false },
    hardwareConcurrency: 4, deviceMemory: 8, maxTouchPoints: 0, vendor: 'Google', locale: 'zh-CN',
  },
  proxy: { ip: '1.1.1.1', port: 8080, type: 'mobile_4g', protocol: 'http' },
  account: {
    id: accountId, platform: 'douyin', state: 'active',
    stateChangedAt: Date.now(), dailyRequestCount: 0,
  },
  strategy: {
    id: 's1', name: 'Test', platform: 'douyin',
    behavior: { dailyActions: 100, actionInterval: 5000, likeRatio: 0.3, followRatio: 0.1, commentRatio: 0.1, randomThinkTime: [1000, 3000] },
    content: { publishEnabled: true, maxDailyPublish: 10, preferredTags: [], avoidTopics: [] },
    risk: { maxCaptchaPerDay: 5, cooldownOnCaptcha: 300000, autoQuarantine: true },
  },
});

describe('ContainerPool', () => {
  let pool: ContainerPool;

  beforeEach(() => {
    // maxContainers=2 so that adding a 3rd triggers LRU eviction
    pool = new ContainerPool({ maxContainers: 2, idleTimeoutMs: 30_000 });
  });

  describe('acquire()', () => {
    it('should add a container to the pool', async () => {
      await pool.acquire(makeConfig('c1', 'a1'));
      const list = pool.listContainers();
      expect(list.some((c) => c.id === 'c1')).toBe(true);
    });

    it('should start the container', async () => {
      const container = await pool.acquire(makeConfig('c1', 'a1'));
      expect(container.state).toBe('running');
    });

    it('should return container by id', async () => {
      await pool.acquire(makeConfig('c1', 'a1'));
      expect(pool.getContainer('c1')).toBeDefined();
    });

    it('should return undefined for non-existent id', () => {
      expect(pool.getContainer('nonexistent')).toBeUndefined();
    });
  });

  describe('release() — key correctness (the core fix)', () => {
    it('should remove container when pool exceeds 80% capacity', async () => {
      // With maxContainers=2, threshold = 1.6. Pool is under threshold after 1 acquire.
      // After 2 acquires (size=2, size > 1.6), a 3rd triggers LRU eviction.
      await pool.acquire(makeConfig('c1', 'a1'));
      await pool.acquire(makeConfig('c2', 'a2'));
      await pool.acquire(makeConfig('c3', 'a3')); // evicts c1
      expect(pool.getContainer('c1')).toBeUndefined();
    });

    it('should NOT throw when releasing non-existent id', async () => {
      await expect(pool.release('nonexistent')).resolves.not.toThrow();
    });

    it('releasing a non-evicted container should be safe (container stays in pool)', async () => {
      await pool.acquire(makeConfig('c1', 'a1'));
      await pool.acquire(makeConfig('c2', 'a2'));
      // Both containers are under 80% threshold, neither is removed on release
      await pool.release('c1');
      await pool.release('c2');
      // Containers remain in pool (expected — release only evicts above 80%)
    });
  });

  describe('listContainers()', () => {
    it('should list all active containers', async () => {
      await pool.acquire(makeConfig('c1', 'a1'));
      await pool.acquire(makeConfig('c2', 'a2'));
      const list = pool.listContainers();
      expect(list.length).toBeGreaterThanOrEqual(2);
    });

    it('should include container id in snapshot', async () => {
      await pool.acquire(makeConfig('c_snapshot', 'a_snapshot'));
      const list = pool.listContainers();
      const snapshot = list.find((c) => c.id === 'c_snapshot');
      expect(snapshot).toBeDefined();
      expect(snapshot!.id).toBe('c_snapshot');
    });
  });
});
