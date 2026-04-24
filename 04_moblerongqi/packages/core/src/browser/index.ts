// Patchright 浏览器引擎 — 升级版：真实浏览器 + OCR + 反爬检测
// 基于 bb-browser-PLUS 的 patchright 模块设计

import { chromium, type Browser, type BrowserContext, type Page } from 'patchright';
import type { BrowserAction, BrowserResult, DeviceProfile, ProxyConfig } from '@creator-os/core';
import { buildInitScript } from '../fingerprint/index.js';
import { TesseractPool, type TesseractResult } from './ocr/tesseract.js';
import { detectBlock } from './antidetect/index.js';

// ============ 引擎选项 ============

export interface BrowserEngineOptions {
  profile: DeviceProfile;
  proxy?: ProxyConfig;
  headless?: boolean;
  stealth?: boolean;
  /** 使用真实 Chrome 通道（更难被检测） */
  channel?: 'chrome' | 'chromium' | 'msedge';
  /** 导航等待策略 */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'networkidle2' | 'commit';
  /** 超时时间（毫秒） */
  timeout?: number;
}

// ============ 截图类型 ============

export interface Screenshot {
  base64: string;
  width: number;
  height: number;
}

// ============ 浏览器引擎封装 ============

export class BrowserEngine {
  private browser: Browser | null = null;
  private contexts = new Map<string, BrowserContext>();
  private pages = new Map<string, Page>();
  private readonly id: string;
  private readonly options: Required<BrowserEngineOptions>;
  private readonly ocrPool: TesseractPool;

  constructor(
    id: string,
    options: BrowserEngineOptions,
  ) {
    this.id = id;
    this.options = {
      profile: options.profile,
      proxy: options.proxy,
      headless: options.headless ?? true,
      stealth: options.stealth ?? true,
      channel: options.channel ?? 'chrome',
      waitUntil: options.waitUntil ?? 'networkidle2',
      timeout: options.timeout ?? 60_000,
    };
    this.ocrPool = new TesseractPool({
      poolSize: 2,
      languages: 'eng+chi_sim',
      timeoutMs: 30_000,
    });
  }

  // ─── 浏览器生命周期 ───────────────────────────────────────────────────────────

  async launch(): Promise<void> {
    const launchArgs = this.buildLaunchArgs();
    this.browser = await chromium.launch({
      headless: this.options.headless,
      channel: this.options.channel,
      args: launchArgs,
    });
    // 预热 OCR worker
    await this.ocrPool.initialize();
  }

  async newContext(contextId: string): Promise<void> {
    if (!this.browser) throw new Error('Browser not launched');
    const ctx = await this.browser.newContext({
      viewport: this.options.profile.viewport as { width: number; height: number; isMobile: boolean; hasTouch: boolean },
      userAgent: this.options.profile.userAgent,
      deviceScaleFactor: this.options.profile.screen.devicePixelRatio,
      isMobile: this.options.profile.viewport.isMobile,
      hasTouch: this.options.profile.viewport.hasTouch,
      proxy: this.proxyArgs(),
      locale: this.options.profile.locale,
      timezoneId: this.inferTimezone(this.options.profile),
    });
    this.contexts.set(contextId, ctx);
  }

  async newPage(contextId: string, pageId: string): Promise<void> {
    const ctx = this.contexts.get(contextId);
    if (!ctx) throw new Error(`Context ${contextId} not found`);
    const page = await ctx.newPage();

    if (this.options.stealth) {
      await this.injectStealth(page);
    }

    this.pages.set(pageId, page);
  }

  async execute(pageId: string, action: BrowserAction): Promise<BrowserResult> {
    const page = this.pages.get(pageId);
    if (!page) return { success: false, error: `Page ${pageId} not found` };

    try {
      return await this.executeAction(page, action);
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  // ─── 动作执行 ────────────────────────────────────────────────────────────────

  private async executeAction(page: Page, action: BrowserAction): Promise<BrowserResult> {
    switch (action.type) {
      case 'goto': {
        const url = action.params.url as string;
        const resp = await page.goto(url, {
          waitUntil: this.options.waitUntil,
          timeout: this.options.timeout,
        });

        // 检测反爬拦截
        const html = await page.content();
        const detection = detectBlock(resp?.status() ?? 0, html);
        if (detection.blocked) {
          return {
            success: false,
            error: `Blocked by anti-bot: ${detection.reason}`,
            pageHtml: html,
          };
        }

        return { success: true, data: { status: resp?.status(), url: resp?.url() }, pageHtml: html };
      }

      case 'click': {
        await page.click(action.params.selector as string);
        return { success: true };
      }

      case 'type': {
        await page.fill(action.params.selector as string, action.params.text as string);
        return { success: true };
      }

      case 'scroll': {
        const scrollStep = (action.params.step as number) ?? 500;
        await page.evaluate(
          (step) => window.scrollBy(0, step),
          scrollStep,
        );
        return { success: true };
      }

      case 'screenshot': {
        const buf = await page.screenshot({ fullPage: action.params.fullPage as boolean });
        const base64 = buf.toString('base64');
        return { success: true, data: { base64, width: page.viewportSize()?.width, height: page.viewportSize()?.height } };
      }

      case 'evaluate': {
        const result = await page.evaluate(action.params.expression as string | ((...args: unknown[]) => unknown));
        return { success: true, data: result };
      }

      case 'waitForSelector': {
        await page.waitForSelector(action.params.selector as string, {
          timeout: (action.params.timeout as number) ?? 10_000,
        });
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }

  // ─── OCR 能力 ────────────────────────────────────────────────────────────────

  /**
   * 对截图进行 OCR 识别
   */
  async ocrImage(imageBase64: string): Promise<TesseractResult> {
    return this.ocrPool.recognize(imageBase64, `ocr-${this.id}-${Date.now()}`);
  }

  /**
   * 检测截图是否为验证码
   */
  isCaptcha(text: string): boolean {
    return this.ocrPool.looksLikeCaptcha(text);
  }

  /**
   * 检测文本是否为空/噪声
   */
  isEmptyText(text: string): boolean {
    return this.ocrPool.isEmptyText(text);
  }

  /**
   * 捕获页面截图并执行 OCR
   */
  async captureAndOcr(pageId: string): Promise<{ screenshot: Screenshot; ocr: TesseractResult }> {
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page ${pageId} not found`);

    const buf = await page.screenshot({ fullPage: false, encoding: 'base64' });
    const screenshot: Screenshot = {
      base64: buf,
      width: page.viewportSize()?.width ?? 0,
      height: page.viewportSize()?.height ?? 0,
    };

    const ocr = await this.ocrPool.recognize(buf, `cap-${this.id}-${Date.now()}`);

    return { screenshot, ocr };
  }

  // ─── 反爬检测 ────────────────────────────────────────────────────────────────

  /**
   * 检测页面是否被反爬拦截
   */
  detectBlock(statusCode: number, html: string): { blocked: boolean; reason?: string } {
    return detectBlock(statusCode, html);
  }

  // ─── 私有工具方法 ────────────────────────────────────────────────────────────

  private async injectStealth(page: Page): Promise<void> {
    const script = buildInitScript(this.options.profile);
    await page.addInitScript(script);
  }

  private buildLaunchArgs(): string[] {
    // Patchright 自动修复的自动化泄漏标志：
    // --disable-blink-features=AutomationControlled (添加)
    // --enable-automation (移除)
    // --disable-popup-blocking (移除)
    // --disable-default-apps (移除)
    const base = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--start-maximized',
    ];
    return base;
  }

  private proxyArgs(): { server: string; username?: string; password?: string } | undefined {
    if (!this.options.proxy) return undefined;
    const { ip, port, auth } = this.options.proxy;
    return {
      server: `http://${ip}:${port}`,
      username: auth?.username,
      password: auth?.password,
    };
  }

  private inferTimezone(profile: DeviceProfile): string {
    const locale = profile.locale ?? 'zh-CN';
    const tzMap: Record<string, string> = {
      'zh-CN': 'Asia/Shanghai',
      'zh-HK': 'Asia/Hong_Kong',
      'zh-TW': 'Asia/Taipei',
      'ja-JP': 'Asia/Tokyo',
      'ko-KR': 'Asia/Seoul',
      'en-US': 'America/New_York',
    };
    return tzMap[locale] ?? 'Asia/Shanghai';
  }

  // ─── 生命周期 ────────────────────────────────────────────────────────────────

  async closeContext(contextId: string): Promise<void> {
    const ctx = this.contexts.get(contextId);
    if (ctx) {
      await ctx.close();
      this.contexts.delete(contextId);
    }
  }

  async closePage(pageId: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (page) {
      await page.close();
      this.pages.delete(pageId);
    }
  }

  async destroy(): Promise<void> {
    await Promise.all([...this.contexts.values()].map((c) => c.close().catch(() => {})));
    await this.browser?.close();
    await this.ocrPool.terminate();
    this.contexts.clear();
    this.pages.clear();
    this.browser = null;
  }

  /** Expose contexts map for session persistence (cookies access) */
  getContexts(): Map<string, BrowserContext> {
    return this.contexts;
  }

  /** Expose pages map for session persistence (localStorage/sessionStorage) */
  getPages(): Map<string, Page> {
    return this.pages;
  }
}
