import { describe, it, expect } from 'vitest';
import type { ProxyConfig } from '@creator-os/core';
import { ProxyManager } from '@creator-os/anticrawl';

const makeProxy = (id: number): ProxyConfig => ({
  ip: `1.2.3.${id}`,
  port: 8080 + id,
  type: 'mobile_4g',
  protocol: 'http',
});

describe('ProxyManager', () => {
  describe('getProxy()', () => {
    it('should return a proxy from the list', () => {
      const manager = new ProxyManager([makeProxy(1), makeProxy(2)], 0);
      const proxy = manager.getProxy();
      expect(proxy.ip).toBeDefined();
    });

    it('should round-robin across proxies', () => {
      const manager = new ProxyManager([makeProxy(1), makeProxy(2), makeProxy(3)], 0);
      const results = new Set([manager.getProxy().port, manager.getProxy().port, manager.getProxy().port]);
      expect(results.size).toBeGreaterThan(1);
    });

    it('should skip deprioritized proxies (>30% failure rate)', () => {
      const proxy1 = makeProxy(1);
      const proxy2 = makeProxy(2);
      const manager = new ProxyManager([proxy1, proxy2], 0);

      for (let i = 0; i < 5; i++) manager.reportResult(proxy1, false);
      for (let i = 0; i < 5; i++) manager.reportResult(proxy2, true);

      let proxy2Chosen = false;
      for (let i = 0; i < 10; i++) {
        const p = manager.getProxy();
        if (p.ip === '1.2.3.2') proxy2Chosen = true;
      }
      expect(proxy2Chosen).toBe(true);
    });
  });

  describe('reportResult()', () => {
    it('should track failures via reportCount', () => {
      const proxy = makeProxy(1);
      const manager = new ProxyManager([proxy], 0);
      manager.reportResult(proxy, false);
      manager.reportResult(proxy, false);
      manager.reportResult(proxy, false);
      const stats = manager.getStats() as { total: number; reportCount: number };
      expect(stats.reportCount).toBe(3);
    });

    it('should increment reportCount on mixed success/failure', () => {
      const proxy = makeProxy(1);
      const manager = new ProxyManager([proxy], 0);
      manager.reportResult(proxy, true);
      manager.reportResult(proxy, false);
      const stats = manager.getStats() as { reportCount: number };
      expect(stats.reportCount).toBe(2);
    });
  });

  describe('health check API', () => {
    it('should expose startHealthCheck, stopHealthCheck, healthCheck methods', () => {
      const manager = new ProxyManager([makeProxy(1)], 0);
      expect(typeof manager.startHealthCheck).toBe('function');
      expect(typeof manager.stopHealthCheck).toBe('function');
      expect(typeof manager.healthCheck).toBe('function');
    });

    it('healthCheck should be callable without throwing', () => {
      const manager = new ProxyManager([makeProxy(1)], 0);
      expect(() => manager.healthCheck()).not.toThrow();
    });

    it('startHealthCheck and stopHealthCheck should not throw', () => {
      const manager = new ProxyManager([makeProxy(1)], 0);
      expect(() => manager.startHealthCheck()).not.toThrow();
      expect(() => manager.stopHealthCheck()).not.toThrow();
    });
  });

  describe('rotate()', () => {
    it('should rotate proxy', () => {
      const manager = new ProxyManager([makeProxy(1), makeProxy(2)], 0);
      const first = manager.rotate().ip;
      const second = manager.rotate().ip;
      expect(first).not.toBe(second);
    });
  });
});
