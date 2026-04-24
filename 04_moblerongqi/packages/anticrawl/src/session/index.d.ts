import type { Page } from 'playwright';
import type { StorageBackend as CoreStorageBackend } from '@creator-os/core';
/**
 * Alias for the canonical StorageBackend from core.
 * The SessionContinuityManager uses an adapter internally to map its save/load
 * method names to the core StorageBackend's saveSession/loadSession.
 */
export type StorageBackend = CoreStorageBackend;
export declare class SessionContinuityManager {
    private readonly storage;
    constructor(storage: CoreStorageBackend);
    ensureFresh(page: Page, accountId: string): Promise<void>;
    saveState(page: Page, accountId: string): Promise<void>;
    detectBan(page: Page): Promise<boolean>;
    private loadCookies;
    private injectAntiDetect;
}
//# sourceMappingURL=index.d.ts.map