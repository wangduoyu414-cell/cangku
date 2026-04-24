import type { ProxyConfig } from '@creator-os/core';
export declare class ProxyManager {
    private readonly proxies;
    private readonly proxyList;
    private readonly stats;
    private cursor;
    constructor(proxies: ProxyConfig[]);
    getProxy(): ProxyConfig;
    rotate(): ProxyConfig;
    reportResult(proxy: ProxyConfig, success: boolean): void;
    getStats(): {
        total: number;
        available: number;
        byType: Record<string, number>;
    };
    private findDeprioritized;
    private touch;
}
//# sourceMappingURL=index.d.ts.map