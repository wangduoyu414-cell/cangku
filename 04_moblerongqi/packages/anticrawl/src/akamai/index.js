// Akamai bypasser — challenge detection, extraction, and simplified solving
const MAX_RETRIES = 3;
export class AkamaiBypasser {
    async bypass(page, url) {
        let attempt = 0;
        while (attempt < MAX_RETRIES) {
            attempt += 1;
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
            }
            catch {
                // navigation may be intercepted — continue to check for challenge
            }
            const challenge = await this.detectChallenge(page);
            if (!challenge) {
                return true;
            }
            const solved = await this.solveChallenge(page, challenge);
            if (solved) {
                return true;
            }
            if (attempt < MAX_RETRIES) {
                await this.waitRandom(800, 1500);
            }
        }
        return false;
    }
    async injectSessionCookies(page, sessionData) {
        const cookies = this.parseCookies(sessionData.cookies);
        const pageUrl = page.url();
        const origin = pageUrl && pageUrl.startsWith('http') ? new URL(pageUrl).origin : 'https://example.com';
        await page.context().addCookies(cookies.map((c) => ({
            name: c.name,
            value: c.value,
            domain: c.domain ?? new URL(origin).hostname,
            path: c.path ?? '/',
            httpOnly: c.httpOnly ?? false,
            secure: c.secure ?? true,
            sameSite: c.sameSite ?? 'Lax',
            expires: c.expires ?? -1,
        })));
    }
    async detectChallenge(page) {
        const hasNonce = await page.evaluate(() => {
            return document.cookie.includes('__ac_nonce') || document.cookie.includes('bm-mc-');
        });
        if (hasNonce)
            return '__ac_nonce';
        const url = page.url();
        if (url.includes('/__ac') || url.includes('akamai'))
            return 'url_fingerprint';
        return null;
    }
    async solveChallenge(page, challengeType) {
        if (challengeType === '__ac_nonce') {
            return this.solveAcNonce(page);
        }
        if (challengeType === 'url_fingerprint') {
            return this.solveUrlFingerprint(page);
        }
        return false;
    }
    async solveAcNonce(page) {
        const nonce = await page.evaluate(() => {
            const match = document.cookie.match(/__ac_nonce=([^;]+)/);
            return match ? match[1] : null;
        });
        if (!nonce)
            return false;
        const solved = await page.evaluate((n) => {
            try {
                const form = document.querySelector('#challenge-form, form[action*="__ac"]');
                if (form) {
                    const input = form.querySelector('input[name="nonce"]');
                    if (input)
                        input.value = n;
                    const verifyInput = form.querySelector('input[name="verify"]');
                    if (verifyInput)
                        verifyInput.value = '1';
                    return true;
                }
            }
            catch {
                // ignore
            }
            return false;
        }, nonce);
        if (solved) {
            try {
                await page.click('#challenge-form button[type="submit"], form button[type="submit"]');
                await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => { });
                return true;
            }
            catch {
                return false;
            }
        }
        return false;
    }
    async solveUrlFingerprint(page) {
        try {
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 });
            await this.waitRandom(500, 1000);
            const stillBlocked = await page.evaluate(() => {
                return (document.cookie.includes('__ac_nonce') ||
                    document.cookie.includes('bm-mc-') ||
                    document.body.innerText.includes('security check'));
            });
            return !stillBlocked;
        }
        catch {
            return false;
        }
    }
    parseCookies(cookieString) {
        if (!cookieString)
            return [];
        try {
            const parsed = JSON.parse(cookieString);
            if (Array.isArray(parsed))
                return parsed;
        }
        catch {
            // fall through to line-parser
        }
        return cookieString.split(';').map((part) => {
            const parts = part.trim().split(';').map((s) => s.trim());
            const nameValueRaw = parts[0];
            if (!nameValueRaw)
                return null;
            const nv = nameValueRaw.split('=');
            const name = nv[0] ?? '';
            const value = nv.slice(1).join('=');
            const result = { name: name.trim(), value };
            for (let i = 1; i < parts.length; i++) {
                const attr = parts[i] ?? '';
                const kv = attr.split('=').map((s) => s.trim().toLowerCase());
                const k = kv[0] ?? '';
                const v = kv[1];
                if (k === 'domain')
                    result.domain = v ?? '';
                else if (k === 'path')
                    result.path = v ?? '';
                else if (k === 'httponly' || k === 'http-only')
                    result.httpOnly = true;
                else if (k === 'secure')
                    result.secure = true;
                else if (k === 'samesite')
                    result.sameSite = v ?? '';
                else if (k === 'expires' && v)
                    result.expires = new Date(v).getTime() / 1000;
            }
            return result;
        }).filter(Boolean);
    }
    waitRandom(min, max) {
        const delay = min + Math.random() * (max - min);
        return new Promise((resolve) => setTimeout(resolve, delay));
    }
}
//# sourceMappingURL=index.js.map