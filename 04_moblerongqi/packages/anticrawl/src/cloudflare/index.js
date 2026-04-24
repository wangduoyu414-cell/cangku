// Cloudflare bypasser — challenge detection and context refresh
const CHALLENGE_WAIT_MS = 10_000;
export class CloudflareBypasser {
    async bypass(page, url) {
        let attempt = 0;
        const MAX_ATTEMPTS = 2;
        while (attempt < MAX_ATTEMPTS) {
            attempt += 1;
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
            }
            catch {
                // navigation may be blocked — continue to check
            }
            const isChallenge = await this.detectChallenge(page);
            if (!isChallenge) {
                return true;
            }
            const cleared = await this.waitForClearance(page);
            if (cleared) {
                return true;
            }
            if (attempt < MAX_ATTEMPTS) {
                await this.refreshContext(page, url);
            }
        }
        return false;
    }
    async detectChallenge(page) {
        const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
        const indicators = [
            bodyText.includes('Just a moment'),
            bodyText.includes('Checking your browser'),
            bodyText.includes('cf-challenge'),
            page.url().includes('_cf_chl_captcha'),
            page.url().includes(' Cloudflare'),
            page.url().includes('cdn-cgi'),
        ];
        return indicators.some(Boolean);
    }
    async waitForClearance(page) {
        const deadline = Date.now() + CHALLENGE_WAIT_MS;
        while (Date.now() < deadline) {
            const stillRunning = await page.evaluate(() => {
                const el = document.querySelector('#challenge-running, #cf-challenge-running, [id*="challenge-running"]');
                return !!el;
            });
            if (!stillRunning) {
                const hasCfClearance = await page.evaluate(() => {
                    return document.cookie.includes('cf_clearance=');
                });
                if (hasCfClearance)
                    return true;
                const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
                if (!bodyText.includes('Just a moment') && !bodyText.includes('Checking your browser')) {
                    return true;
                }
            }
            await this.sleep(500);
        }
        return false;
    }
    async refreshContext(page, url) {
        const context = page.context();
        try {
            await context.clearCookies();
        }
        catch {
            // ignore
        }
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        }
        catch {
            // ignore
        }
        await this.sleep(1000);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=index.js.map