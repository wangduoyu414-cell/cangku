// Session 验证器 — 与设计文档第 6.3 节对齐

import type { Page } from 'playwright';
import type { Platform, SessionBundle } from '@creator-os/core';

// ============ 类型定义 ============

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  needsRefresh: boolean;
  timestamp: number;
}

export interface SessionTestOptions {
  timeout?: number;
  profileUrl?: string;
}

// ============ Session 验证器 ============

export class SessionValidator {
  /**
   * 完整验证 session：加载 cookies，导航到已知页面，检查登录标识
   */
  async validate(page: Page, session: SessionBundle): Promise<ValidationResult> {
    const timestamp = Date.now();

    try {
      // 1. 检查 session 是否过期
      if (session.expiresAt && session.expiresAt < timestamp) {
        return {
          valid: false,
          reason: 'Session expired',
          needsRefresh: true,
          timestamp,
        };
      }

      // 2. 检查 token 是否过期
      if (session.token?.expiresAt && session.token.expiresAt < timestamp - 60_000) {
        return {
          valid: false,
          reason: 'Token expired',
          needsRefresh: true,
          timestamp,
        };
      }

      // 3. 检查是否有 cookies
      if (!session.cookies || session.cookies === '[]') {
        return {
          valid: false,
          reason: 'No cookies in session',
          needsRefresh: false,
          timestamp,
        };
      }

      // 4. 测试 session（导航到平台主页并检查）
      const testResult = await this.testSession(page, session);
      return testResult;
    } catch (err) {
      return {
        valid: false,
        reason: err instanceof Error ? err.message : 'Unknown validation error',
        needsRefresh: false,
        timestamp,
      };
    }
  }

  /**
   * 检测用户是否已登出
   */
  async detectLogout(page: Page): Promise<boolean> {
    try {
      const currentUrl = page.url();

      // 检查 URL 是否重定向到登录页
      const loginPatterns: Array<{ pattern: RegExp; platform: Platform }> = [
        { pattern: /douyin\.com\/login/, platform: 'douyin' },
        { pattern: /xiaohongshu\.com\/.*login/, platform: 'xiaohongshu' },
        { pattern: /login\.sina\.com/, platform: 'weibo' },
        { pattern: /passport\.bilibili\.com\/login/, platform: 'bilibili' },
        { pattern: /login\.taobao\.com/, platform: 'taobao' },
        { pattern: /passport\.jd\.com/, platform: 'jd' },
        { pattern: /pinduoduo.*login/, platform: 'pinduoduo' },
        { pattern: /tiktok\.com\/login/, platform: 'tiktok' },
      ];

      for (const { pattern } of loginPatterns) {
        if (pattern.test(currentUrl)) {
          return true;
        }
      }

      // 检查页面内容是否包含登录标识
      const loginTexts = ['登录', 'login', 'sign in', '登录/注册', '登录注册', 'LOGIN'];
      const bodyText = await page.evaluate(() => document.body?.innerText || '');

      for (const text of loginTexts) {
        if (bodyText.includes(text)) {
          // 进一步检查是否有登录表单
          const hasLoginForm = await page.evaluate(() => {
            const inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[name*="phone"]');
            return inputs.length > 0;
          });

          if (hasLoginForm) {
            return true;
          }
        }
      }

      // 检查是否出现验证码页面（可能表示需要重新登录）
      const captchaPatterns = [
        '.captcha',
        '.geetest_panel',
        '#captcha',
        '[class*="captcha"]',
        '.nc_wrapper',
      ];

      for (const selector of captchaPatterns) {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            // 检查验证码旁边是否有登录表单
            const hasLoginContext = await page.evaluate(() => {
              const body = document.body?.innerText || '';
              return /登录|login|验证码/.test(body);
            });

            if (hasLoginContext) {
              return true;
            }
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * 测试 session 是否有效：导航到个人主页，验证内容加载
   */
  async testSession(page: Page, session: SessionBundle): Promise<ValidationResult> {
    const timestamp = Date.now();
    const platform = session.platform;

    // 获取平台特定的测试 URL
    const testUrls: Record<Platform, string> = {
      douyin: 'https://www.douyin.com/user/me',
      xiaohongshu: 'https://www.xiaohongshu.com/user/profile',
      weibo: 'https://weibo.com/u/my',
      bilibili: 'https://account.bilibili.com/account/home',
      taobao: 'https://i.taobao.com/my_taobao.htm',
      jd: 'https://home.jd.com',
      pinduoduo: 'https://mobile.yangkunsoft.com/mockapi/pdd/user',
      tiktok: 'https://www.tiktok.com/profile',
    };

    const testUrl = testUrls[platform];
    if (!testUrl) {
      return {
        valid: false,
        reason: `Unknown platform: ${platform}`,
        needsRefresh: false,
        timestamp,
      };
    }

    try {
      // 设置 cookies
      const cookies = JSON.parse(session.cookies) as Array<{
        name: string;
        value: string;
        domain?: string;
        path?: string;
        secure?: boolean;
        httpOnly?: boolean;
      }>;

      if (cookies.length > 0) {
        await page.context().addCookies(cookies);
      }

      // 导航到测试页面
      await page.goto(testUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });

      // 等待页面稳定
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
        // 网络可能不空闲，继续
      });

      // 检测登出
      const isLoggedOut = await this.detectLogout(page);
      if (isLoggedOut) {
        return {
          valid: false,
          reason: 'Detected logout during session test',
          needsRefresh: true,
          timestamp,
        };
      }

      // 平台特定的登录验证
      const platformValid = await this.checkPlatformLogin(page, platform);
      if (!platformValid) {
        return {
          valid: false,
          reason: 'Platform-specific login check failed',
          needsRefresh: true,
          timestamp,
        };
      }

      return {
        valid: true,
        needsRefresh: false,
        timestamp,
      };
    } catch (err) {
      return {
        valid: false,
        reason: err instanceof Error ? err.message : 'Session test failed',
        needsRefresh: true,
        timestamp,
      };
    }
  }

  /**
   * 平台特定的登录验证
   */
  private async checkPlatformLogin(page: Page, platform: Platform): Promise<boolean> {
    try {
      switch (platform) {
        case 'douyin': {
          // 检查是否有用户头像或昵称
          const userInfo = await page.$('.header-user-avatar, [data-e2e="user-avatar"], .profile-avatar');
          return userInfo !== null;
        }

        case 'xiaohongshu': {
          // 检查是否有用户信息
          const userInfo = await page.$('.user-info, .avatar, .profile-avatar');
          return userInfo !== null;
        }

        case 'weibo': {
          // 检查是否有用户信息
          const userInfo = await page.$('.userinfo, .user-avatar, #plc_top');
          return userInfo !== null;
        }

        case 'bilibili': {
          // 检查是否有用户信息
          const userInfo = await page.$('.user-info, .header-user, .avatar');
          return userInfo !== null;
        }

        case 'taobao': {
          // 检查是否有用户信息
          const userInfo = await page.$('.site-nav-user, .logout, #J_SiteNavLogin');
          return userInfo !== null;
        }

        case 'jd': {
          // 检查是否有用户信息
          const userInfo = await page.$('.user-info, .nickname, .header-user');
          return userInfo !== null;
        }

        case 'pinduoduo': {
          // 检查是否有用户信息
          const userInfo = await page.$('.user-info, .profile-avatar');
          return userInfo !== null;
        }

        case 'tiktok': {
          // 检查是否有用户信息
          const userInfo = await page.$('[data-e2e="profile-icon"], .profile-icon');
          return userInfo !== null;
        }

        default:
          return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * 批量验证多个 session
   */
  async validateBatch(
    page: Page,
    sessions: SessionBundle[],
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    for (const session of sessions) {
      const result = await this.validate(page, session);
      results.set(session.id, result);
    }

    return results;
  }

  /**
   * 获取需要刷新的 session
   */
  async getSessionsNeedingRefresh(
    page: Page,
    sessions: SessionBundle[],
  ): Promise<SessionBundle[]> {
    const results = await this.validateBatch(page, sessions);
    const needsRefresh: SessionBundle[] = [];

    for (const session of sessions) {
      const result = results.get(session.id);
      if (result?.needsRefresh) {
        needsRefresh.push(session);
      }
    }

    return needsRefresh;
  }
}

// ============ 辅助函数 ============

/**
 * 快速检查 session 是否可能有效（不进行网络请求）
 */
export function quickSessionCheck(session: SessionBundle): ValidationResult {
  const timestamp = Date.now();

  // 检查必需字段
  if (!session.id || !session.accountId || !session.platform) {
    return {
      valid: false,
      reason: 'Missing required session fields',
      needsRefresh: false,
      timestamp,
    };
  }

  // 检查过期时间
  if (session.expiresAt && session.expiresAt < timestamp) {
    return {
      valid: false,
      reason: 'Session expired',
      needsRefresh: true,
      timestamp,
    };
  }

  // 检查 token
  if (session.token?.expiresAt && session.token.expiresAt < timestamp - 60_000) {
    return {
      valid: false,
      reason: 'Token expired',
      needsRefresh: true,
      timestamp,
    };
  }

  // 检查 cookies
  if (!session.cookies || session.cookies === '[]') {
    return {
      valid: false,
      reason: 'No cookies',
      needsRefresh: false,
      timestamp,
    };
  }

  return {
    valid: true,
    needsRefresh: session.token?.expiresAt ? session.token.expiresAt < timestamp + 300_000 : false,
    timestamp,
  };
}
