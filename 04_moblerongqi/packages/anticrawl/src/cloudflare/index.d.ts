import type { Page } from 'playwright';
export declare class CloudflareBypasser {
    bypass(page: Page, url: string): Promise<boolean>;
    private detectChallenge;
    private waitForClearance;
    private refreshContext;
    private sleep;
}
//# sourceMappingURL=index.d.ts.map