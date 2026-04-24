// Session Continuity Manager — state persistence and ban detection

import type { Page } from 'playwright';
import type { SessionBundle, Platform } from '@creator-os/core';
import type { StorageBackend as CoreStorageBackend } from '@creator-os/core';

/**
 * Alias for the canonical StorageBackend from core.
 * The SessionContinuityManager uses an adapter internally to map its save/load
 * method names to the core StorageBackend's saveSession/loadSession.
 */
export type StorageBackend = CoreStorageBackend;

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
  private platform: Platform = 'douyin';

  constructor(private readonly storage: CoreStorageBackend, platform?: Platform) {
    if (platform) this.platform = platform;
  }

  setPlatform(platform: Platform): void {
    this.platform = platform;
  }

  async ensureFresh(page: Page, accountId: string): Promise<void> {
    const sessionId = buildSessionId(accountId);
    const existing = await this.storage.loadSession(sessionId).catch(() => null);

    if (existing) {
      await this.loadCookies(page, existing);
    }

    await this.injectAntiDetect(page);
  }

  async saveState(page: Page, accountId: string): Promise<void> {
    const sessionId = buildSessionId(accountId);

    const cookies = await page.context().cookies();
    const cookiesStr = JSON.stringify(
      cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
        expires: c.expires,
      }))
    );

    const localStorageStr = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) data[key] = localStorage.getItem(key) ?? '';
      }
      return JSON.stringify(data);
    });

    const sessionStorageStr = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) data[key] = sessionStorage.getItem(key) ?? '';
      }
      return JSON.stringify(data);
    });

    const session: SessionBundle = {
      id: sessionId,
      accountId,
      platform: this.platform,
      createdAt: Date.now(),
      cookies: cookiesStr,
      localStorage: localStorageStr,
      sessionStorage: sessionStorageStr,
    };

    await this.storage.saveSession(sessionId, session);
  }

  async detectBan(page: Page): Promise<boolean> {
    const url = page.url().toLowerCase();

    // URL-level indicators
    const urlBan = [
      url.includes('login'),
      url.includes('captcha'),
      url.includes('blocked'),
      url.includes('banned'),
      url.includes('verify'),
    ];
    if (urlBan.some(Boolean)) return true;

    // Content-level indicators
    const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');

    for (const pattern of BAN_PATTERNS) {
      if (bodyText.toLowerCase().includes(pattern.toLowerCase())) {
        return true;
      }
    }

    // Status-code check from response
    const statusCode = await page.evaluate(() => {
      return (window as unknown as { __statusCode?: number }).__statusCode ?? 0;
    });

    if (statusCode === 403 || statusCode === 451) return true;

    return false;
  }

  private async loadCookies(page: Page, session: SessionBundle): Promise<void> {
    try {
      const cookies = JSON.parse(session.cookies) as Array<{
        name: string;
        value: string;
        domain?: string;
        path?: string;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: string;
        expires?: number;
      }>;

      if (cookies.length > 0) {
        const domain = cookies[0]?.domain ?? new URL(page.url()).hostname;
        await page.context().addCookies(
          cookies.map((c) => ({
            name: c.name,
            value: c.value,
            domain: c.domain ?? domain,
            path: c.path ?? '/',
            httpOnly: c.httpOnly ?? false,
            secure: c.secure ?? true,
            sameSite: (c.sameSite as 'Strict' | 'Lax' | 'None') ?? 'Lax',
            expires: c.expires ?? -1,
          }))
        );
      }
    } catch {
      // invalid session, ignore
    }
  }

  private async injectAntiDetect(page: Page): Promise<void> {
    // Remove webdriver property that triggers detection
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      });
    });
  }
}

function buildSessionId(accountId: string): string {
  return `session_${accountId}`;
}
