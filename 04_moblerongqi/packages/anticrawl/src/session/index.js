// Session Continuity Manager — state persistence and ban detection
const BAN_PATTERNS = [
    '账号已被封禁',
    '账号已被禁用',
    '账号存在异常',
    '请重新登录',
    'login',
    'captcha',
    '验证',
    'access denied',
    'forbidden',
    'blocked',
    'ip blocked',
    'ip封禁',
    'too many requests',
    'rate limit',
    '请求过于频繁',
    '账号受限',
    '系统检测到异常',
];
export class SessionContinuityManager {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    async ensureFresh(page, accountId) {
        const sessionId = buildSessionId(accountId);
        const existing = await this.storage.loadSession(sessionId).catch(() => null);
        if (existing) {
            await this.loadCookies(page, existing);
        }
        await this.injectAntiDetect(page);
    }
    async saveState(page, accountId) {
        const sessionId = buildSessionId(accountId);
        const cookies = await page.context().cookies();
        const cookiesStr = JSON.stringify(cookies.map((c) => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path,
            httpOnly: c.httpOnly,
            secure: c.secure,
            sameSite: c.sameSite,
            expires: c.expires,
        })));
        const localStorageStr = await page.evaluate(() => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key)
                    data[key] = localStorage.getItem(key) ?? '';
            }
            return JSON.stringify(data);
        });
        const sessionStorageStr = await page.evaluate(() => {
            const data = {};
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key)
                    data[key] = sessionStorage.getItem(key) ?? '';
            }
            return JSON.stringify(data);
        });
        const session = {
            id: sessionId,
            accountId,
            platform: 'douyin',
            createdAt: Date.now(),
            cookies: cookiesStr,
            localStorage: localStorageStr,
            sessionStorage: sessionStorageStr,
        };
        await this.storage.saveSession(sessionId, session);
    }
    async detectBan(page) {
        const url = page.url().toLowerCase();
        // URL-level indicators
        const urlBan = [
            url.includes('login'),
            url.includes('captcha'),
            url.includes('blocked'),
            url.includes('banned'),
            url.includes('verify'),
        ];
        if (urlBan.some(Boolean))
            return true;
        // Content-level indicators
        const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
        for (const pattern of BAN_PATTERNS) {
            if (bodyText.toLowerCase().includes(pattern.toLowerCase())) {
                return true;
            }
        }
        // Status-code check from response
        const statusCode = await page.evaluate(() => {
            return window.__statusCode ?? 0;
        });
        if (statusCode === 403 || statusCode === 451)
            return true;
        return false;
    }
    async loadCookies(page, session) {
        try {
            const cookies = JSON.parse(session.cookies);
            if (cookies.length > 0) {
                const domain = cookies[0]?.domain ?? new URL(page.url()).hostname;
                await page.context().addCookies(cookies.map((c) => ({
                    name: c.name,
                    value: c.value,
                    domain: c.domain ?? domain,
                    path: c.path ?? '/',
                    httpOnly: c.httpOnly ?? false,
                    secure: c.secure ?? true,
                    sameSite: c.sameSite ?? 'Lax',
                    expires: c.expires ?? -1,
                })));
            }
        }
        catch {
            // invalid session, ignore
        }
    }
    async injectAntiDetect(page) {
        // Remove webdriver property that triggers detection
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
                configurable: true,
            });
        });
    }
}
function buildSessionId(accountId) {
    return `session_${accountId}`;
}
//# sourceMappingURL=index.js.map