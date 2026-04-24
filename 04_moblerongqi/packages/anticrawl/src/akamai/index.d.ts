import type { Page } from 'playwright';
import type { SessionBundle } from '@creator-os/core';
export declare class AkamaiBypasser {
    bypass(page: Page, url: string): Promise<boolean>;
    injectSessionCookies(page: Page, sessionData: SessionBundle): Promise<void>;
    private detectChallenge;
    private solveChallenge;
    private solveAcNonce;
    private solveUrlFingerprint;
    private parseCookies;
    private waitRandom;
}
//# sourceMappingURL=index.d.ts.map