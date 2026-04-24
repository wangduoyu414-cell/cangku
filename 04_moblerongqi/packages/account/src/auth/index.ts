// 登录态管理 — 与设计文档第 6.3 节对齐

import type { Account, Platform, SessionBundle, SessionMeta } from '@creator-os/core';
import { LocalFSStorage, type StorageBackend, getPlatformConfig } from '@creator-os/core';
import type { Page } from 'playwright';

// ============ Token 验证 ============

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class LoginManager {
  constructor(
    private readonly storage: StorageBackend,
    private readonly smsManager: SMSProviderManager,
  ) {}

  /**
   * 完整登录流程
   * 1. 加载已有 session
   * 2. 检查 Token 有效性
   * 3. Token 过期则尝试刷新
   * 4. 无 session 则走完整登录流程（需要传入 page）
   */
  async ensureLoggedIn(account: Account, page?: Page, phone?: string, password?: string): Promise<boolean> {
    const session = await this.storage.loadSession(account.id);

    if (!session) {
      if (!page || !phone) {
        throw new Error('Full login requires page and phone parameters');
      }
      return this.doFullLogin(account, page, phone, password || '');
    }

    if (session.token && Date.now() < session.token.expiresAt - 60_000) {
      return true; // Token 有效
    }

    if (session.token?.refreshToken) {
      const refreshed = await this.tryRefreshToken(account, session.token.refreshToken);
      if (refreshed) return true;
    }

    // Token 刷新失败，重新登录（需要传入 page）
    if (!page || !phone) {
      throw new Error('Full login requires page and phone parameters');
    }
    return this.doFullLogin(account, page, phone, password || '');
  }

  /**
   * 编排完整登录流程：
   * 1. 获取手机号
   * 2. 导航到登录页
   * 3. 填写账号密码
   * 4. 获取并填写短信验证码
   * 5. 提交登录
   * 6. 保存 session
   */
  async doFullLogin(account: Account, page: Page, phone: string, password: string): Promise<boolean> {
    if (!account.phone && !phone) {
      throw new Error(`Account ${account.id} has no phone number`);
    }

    const targetPhone = phone || account.phone;
    if (!targetPhone) {
      throw new Error(`Account ${account.id} has no phone number`);
    }

    // 1. 获取短信验证码
    const code = await this.smsManager.getCode(account.platform, targetPhone);

    // 2. 执行登录序列
    const loginSuccess = await this.executeLoginSequence(page, account, code, password);

    if (!loginSuccess) {
      // 释放手机号
      await this.smsManager.releasePhone(targetPhone);
      throw new Error('Login sequence failed');
    }

    // 3. 保存 session
    await this.saveSessionAfterLogin(account, page);

    return true;
  }

  /**
   * 调用平台 token 刷新 API
   */
  async tryRefreshToken(account: Account, refreshToken: string): Promise<boolean> {
    const config = getPlatformConfig(account.platform);
    const refreshEndpoints: Record<Platform, string> = {
      douyin: 'https://www.douyin.com/passport/web/refresh_token',
      xiaohongshu: 'https://edith.xiaohongshu.com/api/pegasus/user/refreshToken',
      weibo: 'https://login.sina.com.cn/sso/upass2.php',
      bilibili: 'https://passport.bilibili.com/api/v2/oauth2/refresh_token',
      taobao: 'https://oauth.taobao.com/token',
      jd: 'https://oauth.jd.com/oauth2/token',
      pinduoduo: 'https://mobile.yangkunsoft.com/mockapi/pdd/oauth/token',
      tiktok: 'https://open.tiktokapis.com/v2/oauth/token/refresh/',
    };

    const endpoint = refreshEndpoints[account.platform];
    if (!endpoint) return false;

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!resp.ok) return false;

      const data = (await resp.json()) as Record<string, unknown>;

      // 提取新 token
      const newAccessToken = (data['access_token'] || data['accessToken']) as string | undefined;
      const newRefreshToken = (data['refresh_token'] || data['refreshToken']) as string | undefined;
      const expiresIn = (data['expires_in'] || data['expiresIn'] || 7200) as number;

      if (!newAccessToken) return false;

      // 更新存储中的 token
      const session = await this.storage.loadSession(account.id);
      if (session) {
        session.token = {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || refreshToken,
          expiresAt: Date.now() + expiresIn * 1000,
        };
        await this.storage.saveSession(account.id, session);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 执行实际登录步骤：填写表单、点击按钮、处理重定向
   */
  async executeLoginSequence(
    page: Page,
    account: Account,
    code: string,
    _password: string,
  ): Promise<boolean> {
    const platform = account.platform;

    try {
      // 根据平台导航到登录页
      const loginUrls: Record<Platform, string> = {
        douyin: 'https://www.douyin.com/login/',
        xiaohongshu: 'https://www.xiaohongshu.com/explore/login',
        weibo: 'https://login.sina.com.cn/signup/signin.php',
        bilibili: 'https://passport.bilibili.com/login',
        taobao: 'https://login.taobao.com/member/login',
        jd: 'https://passport.jd.com/new/login.aspx',
        pinduoduo: 'https://mobile.yangkunsoft.com/mockapi/pdd/login',
        tiktok: 'https://www.tiktok.com/login',
      };

      const loginUrl = loginUrls[platform];
      if (!loginUrl) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // 1. 导航到登录页
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      // 2. 检测验证码
      const captchaDetected = await this.handleCaptcha(page);
      if (captchaDetected) {
        throw new Error('Captcha detected during login');
      }

      // 3. 平台特定登录操作（这里用通用逻辑，实际每个平台有差异）
      // 检测是否已登录
      const alreadyLoggedIn = await this.detectAlreadyLoggedIn(page);
      if (alreadyLoggedIn) {
        return true;
      }

      // 4. 填写手机号并触发短信验证码
      await this.fillPhoneAndRequestCode(page, account.phone || '');

      // 5. 填写短信验证码
      await this.fillSmsCode(page, code);

      // 6. 点击登录按钮
      await this.clickLoginButton(page);

      // 7. 等待登录完成
      await this.waitForLoginComplete(page);

      return true;
    } catch (err) {
      console.error(`Login sequence failed for ${platform}:`, err);
      return false;
    }
  }

  private async detectAlreadyLoggedIn(page: Page): Promise<boolean> {
    try {
      // 检测已登录标识（平台特定）
      const url = page.url();
      const loginIndicators = ['login', 'signin', 'sign-in'];
      if (!loginIndicators.some((ind) => url.includes(ind))) {
        return true;
      }

      // 检测页面上的登录按钮是否存在
      const loginButton = await page.$('button:has-text("登录"), button:has-text("登录"), a:has-text("登录")');
      return !loginButton;
    } catch {
      return false;
    }
  }

  private async fillPhoneAndRequestCode(page: Page, phone: string): Promise<void> {
    // 通用手机号输入（平台特定选择器）
    const phoneInput = await page.$('input[type="tel"], input[placeholder*="手机"], input[placeholder*="phone"]');
    if (phoneInput) {
      await phoneInput.fill(phone);
    }

    // 点击获取验证码按钮
    const sendCodeButton = await page.$('button:has-text("获取验证码"), button:has-text("发送验证码")');
    if (sendCodeButton) {
      await sendCodeButton.click();
      // 等待短信发送
      await page.waitForTimeout(3000);
    }
  }

  private async fillSmsCode(page: Page, code: string): Promise<void> {
    // 等待验证码输入框出现
    await page.waitForSelector('input[maxlength="6"], input[placeholder*="验证码"], input[placeholder*="code"]', {
      timeout: 10_000,
    });

    const codeInputs = await page.$$('input[maxlength="6"], input[placeholder*="验证码"]');
    for (let i = 0; i < code.length && i < codeInputs.length; i++) {
      await codeInputs[i]!.fill(code[i]!);
    }
  }

  private async clickLoginButton(page: Page): Promise<void> {
    const loginButton = await page.$('button[type="submit"], button:has-text("登录"), button:has-text("确认")');
    if (loginButton) {
      await loginButton.click();
    }
  }

  private async waitForLoginComplete(page: Page): Promise<void> {
    // 等待跳转到主页或检测登录成功标识
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        const loginIndicators = ['login', 'signin'];
        return !loginIndicators.some((ind) => url.includes(ind));
      },
      { timeout: 30_000 },
    );
  }

  /**
   * 检测并处理验证码（简化版：仅检测并记录警告）
   */
  async handleCaptcha(page: Page): Promise<boolean> {
    try {
      // 检测常见验证码元素
      const captchaSelectors = [
        '.captcha',
        '#captcha',
        '[class*="captcha"]',
        'iframe[src*="captcha"]',
        '.geetest_panel',
        '.nc_wrapper',
        '#nc_1_n1z',
      ];

      for (const selector of captchaSelectors) {
        const element = await page.$(selector);
        if (element) {
          console.warn('Captcha detected on page');
          return true;
        }
      }

      // 检测页面 URL 是否包含 captcha
      const url = page.url();
      if (url.includes('captcha')) {
        console.warn('Captcha URL detected');
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * 从页面上下文提取 cookies 并保存 session
   */
  async saveSessionAfterLogin(account: Account, page: Page): Promise<void> {
    // 提取 cookies
    const cookies = await page.context().cookies();
    const cookiesStr = JSON.stringify(cookies);

    // 提取 localStorage
    const localStorage = await page.evaluate(() => {
      return JSON.stringify(window.localStorage);
    });

    // 提取 sessionStorage
    const sessionStorage = await page.evaluate(() => {
      return JSON.stringify(window.sessionStorage);
    });

    // 尝试提取 token（从页面变量或 API 响应）
    let token: TokenData | undefined;
    try {
      const tokenData = await page.evaluate(() => {
        // 常见 token 存放位置
        const keys = ['token', 'accessToken', 'access_token', 'auth_token'];
        for (const key of keys) {
          const val = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
          if (val) return val;
        }
        return null;
      });

      if (tokenData) {
        const parsed = JSON.parse(tokenData as string);
        token = {
          accessToken: (parsed.accessToken || parsed.access_token) as string,
          refreshToken: (parsed.refreshToken || parsed.refresh_token) as string,
          expiresAt: (parsed.expiresAt || parsed.expires_at || Date.now() + 7200_000) as number,
        };
      }
    } catch {
      // token 提取失败，使用默认值
      token = {
        accessToken: '',
        refreshToken: '',
        expiresAt: Date.now() + 7200_000,
      };
    }

    const bundle: SessionBundle = {
      id: account.id,
      accountId: account.id,
      platform: account.platform,
      createdAt: Date.now(),
      cookies: cookiesStr,
      localStorage,
      sessionStorage,
      token,
    };

    await this.storage.saveSession(account.id, bundle);
  }
}

// ============ 接码平台管理 ============

export interface SMSProvider {
  name: string;
  getCode(platform: Platform, phone: string): Promise<string>;
  closePhone(phone: string): Promise<void>;
  getBalance?(): Promise<number>;
  getPhoneInfo?(phone: string): Promise<Record<string, unknown>>;
}

export class SMSProviderManager {
  private activeIndex = 0;

  constructor(private readonly providers: SMSProvider[]) {}

  async getCode(platform: Platform, phone: string): Promise<string> {
    const attempts = this.providers.length;
    for (let i = 0; i < attempts; i++) {
      const idx = (this.activeIndex + i) % this.providers.length;
      try {
        const code = await this.providers[idx]!.getCode(platform, phone);
        this.activeIndex = idx;
        return code;
      } catch {
        continue;
      }
    }
    throw new Error('All SMS providers failed');
  }

  async closePhone(phone: string): Promise<void> {
    // 关闭所有平台的该号码
    await Promise.allSettled(
      this.providers.map((p) => p.closePhone(phone).catch(() => {})),
    );
  }

  async releasePhone(phone: string): Promise<void> {
    await this.closePhone(phone);
  }

  async getProviderBalance(): Promise<Array<{ name: string; balance: number }>> {
    const results: Array<{ name: string; balance: number }> = [];
    for (const provider of this.providers) {
      if (provider.getBalance) {
        try {
          const balance = await provider.getBalance();
          results.push({ name: provider.name, balance });
        } catch {
          results.push({ name: provider.name, balance: -1 });
        }
      }
    }
    return results;
  }
}

// ============ ZSMS 接码平台实现 ============

interface ZSMSPhoneResponse {
  phone: string;
  id?: string;
}

interface ZSMSCodeResponse {
  code?: string;
  error?: string;
}

interface ZSMSBalanceResponse {
  balance: number;
}

export class ZSMSProvider implements SMSProvider {
  name = 'zsms';

  constructor(
    private readonly apiKey: string,
    private readonly apiUrl: string,
    private readonly timeout = 60_000,
    private readonly retryInterval = 5_000,
  ) {}

  async getCode(platform: Platform, phone: string): Promise<string> {
    const platformCode = getPlatformCode(platform);

    // 1. 获取手机号
    const phoneResp = await fetch(
      `${this.apiUrl}/v1/getPhone?project=${platformCode}&token=${this.apiKey}&phone=${phone}`,
    );

    if (!phoneResp.ok) {
      throw new Error(`ZSMS API error: ${phoneResp.status}`);
    }

    const phoneData = (await phoneResp.json()) as ZSMSPhoneResponse;
    if (!phoneData.phone) {
      throw new Error('ZSMS: failed to get phone number');
    }

    const thePhone = phoneData.phone;

    try {
      // 2. 轮询等待验证码
      const startTime = Date.now();
      while (Date.now() - startTime < this.timeout) {
        await sleep(this.retryInterval);

        const codeResp = await fetch(
          `${this.apiUrl}/v1/getCode?phone=${thePhone}&token=${this.apiKey}`,
        );

        if (!codeResp.ok) {
          continue;
        }

        const codeData = (await codeResp.json()) as ZSMSCodeResponse;

        if (codeData.error) {
          // 特定错误码表示还未收到验证码，继续等待
          if (codeData.error === 'no_code' || codeData.error === 'waiting') {
            continue;
          }
          throw new Error(`ZSMS: ${codeData.error}`);
        }

        if (codeData.code) {
          // 成功获取验证码
          await this.closePhone(thePhone);
          return codeData.code;
        }
      }

      // 超时未收到验证码
      await this.closePhone(thePhone);
      throw new Error('SMS timeout: no code received within timeout period');
    } catch (err) {
      await this.closePhone(thePhone).catch(() => {});
      throw err;
    }
  }

  async closePhone(phone: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/v1/releasePhone?phone=${phone}&token=${this.apiKey}`, {
        method: 'POST',
      });
    } catch {
      // 释放失败不影响主流程
    }
  }

  async getBalance(): Promise<number> {
    try {
      const resp = await fetch(`${this.apiUrl}/v1/getBalance?token=${this.apiKey}`);
      if (!resp.ok) return -1;

      const data = (await resp.json()) as ZSMSBalanceResponse;
      return data.balance ?? -1;
    } catch {
      return -1;
    }
  }

  async getPhoneInfo(phone: string): Promise<Record<string, unknown>> {
    try {
      const resp = await fetch(`${this.apiUrl}/v1/phoneInfo?phone=${phone}&token=${this.apiKey}`);
      if (!resp.ok) return {};

      return (await resp.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

// ============ Session 管理器 ============

export class AccountSessionManager {
  constructor(private readonly storage: StorageBackend) {}

  /**
   * 保存 session（cookies + token + 元数据）
   */
  async save(
    accountId: string,
    cookies: string,
    token?: TokenData,
    localStorage?: string,
    sessionStorage?: string,
  ): Promise<void> {
    const existing = await this.storage.loadSession(accountId);
    const bundle: SessionBundle = {
      id: accountId,
      accountId,
      platform: existing?.platform ?? 'douyin',
      createdAt: existing?.createdAt ?? Date.now(),
      cookies,
      localStorage: localStorage ?? '',
      sessionStorage: sessionStorage ?? '',
      token,
    };
    await this.storage.saveSession(accountId, bundle);
  }

  /**
   * 加载 session 并验证
   */
  async load(accountId: string): Promise<{
    cookies: string;
    token?: TokenData;
    localStorage?: string;
    sessionStorage?: string;
  } | null> {
    const session = await this.storage.loadSession(accountId);
    if (!session) return null;

    // 更新最后访问时间
    await this.touch(accountId);

    return {
      cookies: session.cookies,
      token: session.token as TokenData | undefined,
      localStorage: session.localStorage,
      sessionStorage: session.sessionStorage,
    };
  }

  /**
   * 删除 session 数据
   */
  async delete(accountId: string): Promise<void> {
    await this.storage.deleteSession(accountId);
  }

  /**
   * 更新最后访问时间
   */
  async touch(accountId: string): Promise<void> {
    const session = await this.storage.loadSession(accountId);
    if (session) {
      await this.storage.saveSession(accountId, session);
    }
  }

  /**
   * 列出所有已保存的 session
   */
  async listAccounts(): Promise<Array<{
    id: string;
    accountId: string;
    platform: Platform;
    createdAt: number;
    lastAccessedAt: number;
    size: number;
  }>> {
    const metas = await this.storage.listSessions();
    return metas.map((m: SessionMeta) => ({
      id: m.id,
      accountId: m.accountId,
      platform: m.platform,
      createdAt: m.createdAt,
      lastAccessedAt: m.lastAccessedAt,
      size: m.size,
    }));
  }

  /**
   * 导出 session 为 JSON（用于备份）
   */
  async exportSession(accountId: string): Promise<string | null> {
    const session = await this.storage.loadSession(accountId);
    if (!session) return null;
    return JSON.stringify(session, null, 2);
  }

  /**
   * 从 JSON 备份导入 session
   */
  async importSession(jsonData: string): Promise<string> {
    const session = JSON.parse(jsonData) as SessionBundle;

    // 验证必需字段
    if (!session.id || !session.accountId || !session.platform) {
      throw new Error('Invalid session data: missing required fields');
    }

    // 保存
    await this.storage.saveSession(session.id, session);
    return session.id;
  }
}

// ============ 辅助 ============

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getPlatformCode(platform: Platform): string {
  const map: Record<Platform, string> = {
    douyin: '1039',
    xiaohongshu: '1043',
    weibo: '1001',
    bilibili: '1012',
    taobao: '1000',
    jd: '1002',
    pinduoduo: '1011',
    tiktok: '1040',
  };
  return map[platform] ?? '1000';
}
