// Proxy Manager — round-robin rotation with success-rate tracking
// Proxies with >30% failure rate get deprioritized

import type { ProxyConfig } from '@creator-os/core';

interface ProxyStats {
  total: number;
  failures: number;
  lastUsed: number;
  lastChecked: number;
  avgLatency: number;
  banCount: number;
}

export class ProxyManager {
  private readonly proxyList: ProxyConfig[];
  private readonly stats: Map<string, ProxyStats>;
  private cursor = 0;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly proxies: ProxyConfig[], private readonly healthCheckIntervalMs = 60_000) {
    this.proxyList = proxies;
    this.stats = new Map(
      proxies.map((p) => [buildKey(p), { total: 0, failures: 0, lastUsed: 0, lastChecked: 0, avgLatency: 0, banCount: 0 }])
    );
  }

  /** Start periodic health checks for all proxies */
  startHealthCheck(): void {
    if (this.healthCheckTimer) return;
    this.healthCheckTimer = setInterval(() => {
      this.healthCheck().catch(() => {});
    }, this.healthCheckIntervalMs);
    this.healthCheck().catch(() => {});
  }

  /** Stop periodic health checks */
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /** Run a health check on all proxies concurrently */
  async healthCheck(): Promise<void> {
    const checks = this.proxyList.map((p) => this.checkOneProxy(p));
    await Promise.allSettled(checks);
  }

  private async checkOneProxy(p: ProxyConfig): Promise<void> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      await fetch('https://www.google.com/generate_204', { signal: controller.signal });
      clearTimeout(timeoutId);
      this.reportLatency(p, Date.now() - start);
    } catch {
      this.reportResult(p, false);
    }
  }

  /** Record request latency for a proxy (call after a successful request) */
  reportLatency(proxy: ProxyConfig, latencyMs: number): void {
    const key = buildKey(proxy);
    const s = this.stats.get(key);
    if (!s) return;
    s.lastChecked = Date.now();
    const prev = s.avgLatency;
    const successes = s.total - s.failures;
    s.avgLatency = Math.round((prev * Math.max(successes, 1) + latencyMs) / (Math.max(successes, 1) + 1));
  }

  /** Record a proxy result (success/failure) */
  reportResult(proxy: ProxyConfig, success: boolean): void {
    const key = buildKey(proxy);
    const s = this.stats.get(key);
    if (!s) return;
    s.total += 1;
    if (!success) {
      s.failures += 1;
      if (success === false && s.total >= 5 && s.failures / s.total > 0.5) {
        s.banCount++;
      }
    }
  }

  getProxy(): ProxyConfig {
    const deprioritized = this.findDeprioritized();
    const start = this.cursor;

    for (let i = 0; i < this.proxyList.length; i++) {
      const idx = (start + i) % this.proxyList.length;
      const p = this.proxyList[idx];
      if (!p) continue;
      if (!deprioritized.has(buildKey(p))) {
        this.cursor = (idx + 1) % this.proxyList.length;
        this.touch(buildKey(p));
        return p;
      }
    }

    const p = this.proxyList[this.cursor];
    if (!p) return this.proxyList[0]!;
    this.cursor = (this.cursor + 1) % this.proxyList.length;
    this.touch(buildKey(p));
    return p;
  }

  rotate(): ProxyConfig {
    return this.getProxy();
  }

  getStats(): { total: number; available: number; byType: Record<string, number>; reportCount: number } {
    let available = 0;
    const deprioritized = this.findDeprioritized();

    for (const p of this.proxyList) {
      if (!deprioritized.has(buildKey(p))) {
        available += 1;
      }
    }

    const byType: Record<string, number> = {};
    for (const p of this.proxyList) {
      const t = p.type ?? 'unknown';
      byType[t] = (byType[t] ?? 0) + 1;
    }

    let reportCount = 0;
    for (const s of this.stats.values()) {
      reportCount += s.total;
    }

    return { total: this.proxyList.length, available, byType, reportCount };
  }

  private findDeprioritized(): Set<string> {
    const deprioritized = new Set<string>();
    for (const [key, s] of this.stats.entries()) {
      if (s.total >= 5 && s.failures / s.total > 0.3) {
        deprioritized.add(key);
      }
    }
    return deprioritized;
  }

  private touch(key: string): void {
    const s = this.stats.get(key);
    if (s) s.lastUsed = Date.now();
  }
}

function buildKey(p: ProxyConfig): string {
  return `${p.ip}:${p.port}`;
}
