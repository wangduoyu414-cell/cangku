// 容器生命周期管理 — 与设计文档第 9.1 节对齐
// 升级版：集成 Patchright 真实浏览器 + OCR + 反爬检测

import type {
  ContainerConfig,
  ContainerState,
  ContainerSnapshot,
  ContainerMetrics,
  SessionBundle,
  BrowserAction,
  AppAction,
  BrowserResult,
  AppResult,
  DeviceProfile,
} from '@creator-os/core';
import {
  BrowserEngine,
  type BrowserEngineOptions,
  LocalFSStorage,
  buildInitScript,
  TesseractResult,
  detectBlock,
  type BlockDetection,
} from '@creator-os/core';

// ============ 容器抽象 ============

export interface SimulationContainer {
  readonly id: string;
  readonly state: ContainerState;

  start(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;

  execute(action: BrowserAction): Promise<BrowserResult>;
  executeApp(action: AppAction): Promise<AppResult>;

  getSnapshot(): ContainerSnapshot;
  getMetrics(): ContainerMetrics;

  saveSession(): Promise<void>;
  loadSession(): Promise<void>;
  exportSession(): Promise<SessionBundle>;

  // 新增：OCR 能力
  ocrPage(): Promise<TesseractResult>;
  detectCaptcha(): Promise<{ isCaptcha: boolean; type?: string }>;
  checkAntiBot(): Promise<BlockDetection>;
}

// ============ BrowserContainer 实现 ============

export class BrowserContainer implements SimulationContainer {
  private _state: ContainerState = 'created';
  private _startedAt = 0;
  private _actionCount = 0;
  private _lastAction = '';
  private _lastError?: string;

  private engine: BrowserEngine;
  private readonly contextId = 'default';
  private readonly pageId = 'main';
  private storage: LocalFSStorage;

  constructor(
    public readonly id: string,
    public readonly config: ContainerConfig,
  ) {
    const options: BrowserEngineOptions = {
      profile: config.profile,
      proxy: config.proxy,
      headless: true,
      stealth: true,
    };
    this.engine = new BrowserEngine(id, options);
    this.storage = new LocalFSStorage(`./sessions/${id}`);
  }

  get state(): ContainerState {
    return this._state;
  }

  async start(): Promise<void> {
    if (this._state === 'running') return;
    try {
      await this.engine.launch();
      await this.engine.newContext(this.contextId);
      await this.engine.newPage(this.contextId, this.pageId);
      this._startedAt = Date.now();
      this._state = 'running';
    } catch (err) {
      this._lastError = String(err);
      this._state = 'error';
      throw err;
    }
  }

  async pause(): Promise<void> {
    if (this._state !== 'running') return;
    this._state = 'paused';
  }

  async stop(): Promise<void> {
    this._state = 'stopped';
    await this.engine.destroy();
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async execute(action: BrowserAction): Promise<BrowserResult> {
    this._actionCount++;
    this._lastAction = action.type;

    if (this._state !== 'running') {
      return { success: false, error: `Container not running (state: ${this._state})` };
    }

    try {
      const result = await this.engine.execute(this.pageId, action);
      if (!result.success) {
        this._lastError = result.error;
      }
      return result;
    } catch (err) {
      this._lastError = String(err);
      return { success: false, error: String(err) };
    }
  }

  async executeApp(_action: AppAction): Promise<AppResult> {
    return { success: false, error: 'BrowserContainer does not support App actions (use AppContainer)' };
  }

  getSnapshot(): ContainerSnapshot {
    return {
      id: this.id,
      state: this._state,
      uptime: this._startedAt ? Date.now() - this._startedAt : 0,
      memoryUsage: 0,
      cpuUsage: 0,
      lastAction: this._lastAction,
      lastActionTime: 0,
    };
  }

  getMetrics(): ContainerMetrics {
    return {
      state: this._state,
      uptime: this._startedAt ? Date.now() - this._startedAt : 0,
      memoryUsage: 0,
      actionCount: this._actionCount,
      lastAction: this._lastAction,
      lastError: this._lastError,
    };
  }

  async saveSession(): Promise<void> {
    try {
      const contexts = this.engine.getContexts();
      const pages = this.engine.getPages();
      const context = contexts.get(this.contextId);
      const page = pages.get(this.pageId);

      const cookies = await context?.cookies();
      const localStorageStr = await page?.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) data[key] = localStorage.getItem(key) ?? '';
        }
        return JSON.stringify(data);
      });
      const sessionStorageStr = await page?.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) data[key] = sessionStorage.getItem(key) ?? '';
        }
        return JSON.stringify(data);
      });

      const bundle: SessionBundle = {
        id: this.id,
        accountId: this.config.account.id,
        platform: this.config.platform,
        createdAt: this._startedAt || Date.now(),
        cookies: JSON.stringify(cookies ?? []),
        localStorage: localStorageStr ?? '{}',
        sessionStorage: sessionStorageStr ?? '{}',
      };

      await this.storage.saveSession(this.id, bundle);
    } catch {
      // Silently fail if browser is not running — saveSession is best-effort
    }
  }

  async loadSession(): Promise<void> {
    try {
      const session = await this.storage.loadSession(this.id);
      if (!session) return;

      const contexts = this.engine.getContexts();
      const pages = this.engine.getPages();
      const context = contexts.get(this.contextId);
      const page = pages.get(this.pageId);
      if (!context || !page) return;

      // Restore cookies
      if (session.cookies) {
        try {
          const cookies = JSON.parse(session.cookies);
          if (Array.isArray(cookies) && cookies.length > 0) {
            const origin = new URL(page.url()).origin;
            await context.addCookies(
              cookies.map((c: Record<string, unknown>) => ({
                name: c.name as string,
                value: c.value as string,
                domain: (c.domain as string) ?? new URL(origin).hostname,
                path: (c.path as string) ?? '/',
                httpOnly: (c.httpOnly as boolean) ?? false,
                secure: (c.secure as boolean) ?? true,
                sameSite: (c.sameSite as 'Strict' | 'Lax' | 'None') ?? 'Lax',
                expires: (c.expires as number) ?? -1,
              }))
            );
          }
        } catch {
          // Invalid cookies JSON — skip
        }
      }

      // Restore localStorage
      if (session.localStorage && session.localStorage !== '{}') {
        try {
          const data = JSON.parse(session.localStorage) as Record<string, string>;
          await page.evaluate((obj: Record<string, string>) => {
            for (const [k, v] of Object.entries(obj)) {
              localStorage.setItem(k, v);
            }
          }, data);
        } catch {
          // Invalid localStorage JSON — skip
        }
      }

      // Restore sessionStorage
      if (session.sessionStorage && session.sessionStorage !== '{}') {
        try {
          const data = JSON.parse(session.sessionStorage) as Record<string, string>;
          await page.evaluate((obj: Record<string, string>) => {
            for (const [k, v] of Object.entries(obj)) {
              sessionStorage.setItem(k, v);
            }
          }, data);
        } catch {
          // Invalid sessionStorage JSON — skip
        }
      }
    } catch {
      // Silently fail — loadSession is best-effort
    }
  }

  async exportSession(): Promise<SessionBundle> {
    await this.saveSession();
    const session = await this.storage.loadSession(this.id);
    return session ?? {
      id: this.id,
      accountId: this.config.account.id,
      platform: this.config.platform,
      createdAt: Date.now(),
      cookies: '',
      localStorage: '',
      sessionStorage: '',
    };
  }

  protected setError(err: string): void {
    this._lastError = err;
    this._state = 'error';
  }

  // ─── OCR 能力 ──────────────────────────────────────────────────────────────

  /**
   * 对当前页面截图进行 OCR 识别
   */
  async ocrPage(): Promise<TesseractResult> {
    const screenshot = await this.execute({
      type: 'screenshot',
      params: { fullPage: false },
    });

    if (!screenshot.success || !screenshot.data) {
      throw new Error('Failed to capture screenshot for OCR');
    }

    const base64 = (screenshot.data as { base64: string }).base64;
    return this.engine.ocrImage(base64);
  }

  /**
   * 检测当前页面是否为验证码
   */
  async detectCaptcha(): Promise<{ isCaptcha: boolean; type?: string }> {
    const ocr = await this.ocrPage();
    const isCaptcha = this.engine.isCaptcha(ocr.text);

    if (isCaptcha) {
      // 尝试识别验证码类型
      const captchaTypes = [
        { keyword: 'turnstile', type: 'cloudflare_turnstile' },
        { keyword: 'recaptcha', type: 'recaptcha' },
        { keyword: 'hcaptcha', type: 'hcaptcha' },
        { keyword: '滑动', type: 'slider' },
        { keyword: '点击', type: 'click' },
        { keyword: '拼图', type: 'puzzle' },
        { keyword: '验证', type: 'general' },
      ];

      for (const { keyword, type } of captchaTypes) {
        if (ocr.text.includes(keyword)) {
          return { isCaptcha: true, type };
        }
      }

      return { isCaptcha: true, type: 'unknown' };
    }

    return { isCaptcha: false };
  }

  /**
   * 检测当前页面是否被反爬拦截
   */
  async checkAntiBot(): Promise<BlockDetection> {
    const html = await this.engine.execute(this.pageId, {
      type: 'evaluate',
      params: { expression: 'document.documentElement.outerHTML' },
    });

    const statusCode = 0; // 无法获取响应状态码，使用内容检测
    const pageHtml = html.success && typeof html.data === 'string' ? html.data : '';

    return detectBlock(statusCode, pageHtml);
  }
}

// ============ AppContainer 实现（云手机模式） ============

export class AppContainer extends BrowserContainer {
  constructor(
    id: string,
    config: ContainerConfig,
    public readonly deviceId: string,
  ) {
    super(id, config);
  }

  async exportSession(): Promise<SessionBundle> {
    await this.saveSession();
    return super.exportSession();
  }

  async executeApp(action: AppAction): Promise<AppResult> {
    this.getMetrics();
    return { success: false, error: 'AppContainer.executeApp() must be overridden with ADB bridge' };
  }
}
