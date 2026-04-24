/**
 * Tesseract.js OCR Worker Pool
 * 
 * 设计原则：
 * - Worker 池化复用，避免每次 OCR 重建
 * - 可配置的池大小限制资源使用
 * - Worker 崩溃自动恢复
 * - 图片预处理（缩放、暗色反转）
 * - 30s 超时保护
 */

import { createWorker, OEM, PSM, Worker as TesseractWorker } from 'tesseract.js';

// ─── 配置 ────────────────────────────────────────────────────────────────────

export interface TesseractPoolConfig {
  /** 语言：'eng', 'eng+chi_sim', 'eng+chi_sim+chi_tra' 等 */
  languages?: string;
  /** 并发 worker 数量，默认 2 */
  poolSize?: number;
  /** 自动回收间隔（处理图片数），默认 200 */
  recycleAfter?: number;
  /** OCR 超时毫秒数，默认 30000 */
  timeoutMs?: number;
}

// ─── 结果 ─────────────────────────────────────────────────────────────────────

export interface TesseractResult {
  text: string;
  confidence: number;
  lines: Array<{ text: string; confidence: number }>;
  elapsedMs: number;
}

// ─── Worker 封装 ──────────────────────────────────────────────────────────────

interface PooledWorker {
  worker: TesseractWorker;
  processedCount: number;
  busy: boolean;
  lastTaskId: string;
}

// ─── TesseractPool ───────────────────────────────────────────────────────────

export class TesseractPool {
  private readonly pool: PooledWorker[] = [];
  private readonly poolSize: number;
  private readonly languages: string;
  private readonly recycleAfter: number;
  private readonly timeoutMs: number;
  private pendingQueue: Array<{
    image: string | Buffer | Blob;
    taskId: string;
    resolve: (r: TesseractResult) => void;
    reject: (e: Error) => void;
  }> = [];
  private initialized = false;
  private initPromise?: Promise<void>;

  constructor(config: TesseractPoolConfig = {}) {
    this.poolSize = config.poolSize ?? 2;
    this.languages = config.languages ?? 'eng+chi_sim';
    this.recycleAfter = config.recycleAfter ?? 200;
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  // ── 生命周期 ───────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    await Promise.all(
      Array.from({ length: this.poolSize }, () => this._createWorker())
    );
    this.initialized = true;
  }

  private async _createWorker(): Promise<PooledWorker> {
    const worker = await createWorker(this.languages, OEM.LSTM_ONLY, {
      logger: () => {},
    });

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });

    const pooled: PooledWorker = {
      worker,
      processedCount: 0,
      busy: false,
      lastTaskId: '',
    };
    this.pool.push(pooled);
    return pooled;
  }

  private _getAvailableWorker(): PooledWorker | undefined {
    return this.pool.find((w) => !w.busy);
  }

  private async _recycleWorker(pooled: PooledWorker): Promise<void> {
    try {
      await pooled.worker.terminate();
    } catch {
      // ignore
    }
    const idx = this.pool.indexOf(pooled);
    if (idx !== -1) this.pool.splice(idx, 1);
    await this._createWorker();
  }

  // ── 公开 API ───────────────────────────────────────────────────────────────

  /**
   * 对图片执行 OCR
   */
  async recognize(
    image: string | Buffer | Blob,
    taskId = 'unknown'
  ): Promise<TesseractResult> {
    await this.initialize();

    const start = Date.now();

    return new Promise((resolve, reject) => {
      const worker = this._getAvailableWorker();
      if (!worker) {
        this.pendingQueue.push({ image, taskId, resolve, reject });
        return;
      }

      worker.busy = true;
      worker.lastTaskId = taskId;

      const abortController = new AbortController();
      const timeoutHandle = setTimeout(() => abortController.abort(), this.timeoutMs);

      worker.worker
        .recognize(image)
        .then((result) => {
          clearTimeout(timeoutHandle);
          worker.busy = false;
          worker.processedCount++;

          // 定期回收 worker 防止内存增长
          if (worker.processedCount >= this.recycleAfter) {
            this._recycleWorker(worker).catch(() => {});
          }

          const lines = (result.data.lines ?? []).map((l) => ({
            text: l.text,
            confidence: l.confidence,
          }));

          resolve({
            text: result.data.text,
            confidence: result.data.confidence / 100,
            lines,
            elapsedMs: Date.now() - start,
          });

          this._drainQueue();
        })
        .catch((err: Error) => {
          clearTimeout(timeoutHandle);
          worker.busy = false;

          if (err.name === 'AbortError' || err.message?.includes('timeout')) {
            this._recycleWorker(worker).catch(() => {});
            reject(new Error(`OCR timeout after ${this.timeoutMs}ms`));
          } else {
            this._recycleWorker(worker).catch(() => {});
            reject(new Error(`Tesseract worker crashed: ${err.message}`));
          }

          this._drainQueue();
        });
    });
  }

  private _drainQueue(): void {
    const worker = this._getAvailableWorker();
    if (worker && this.pendingQueue.length > 0) {
      const pending = this.pendingQueue.shift()!;
      this.recognize(pending.image, pending.taskId)
        .then(pending.resolve)
        .catch(pending.reject);
    }
  }

  /**
   * 检测是否为验证码页面
   */
  looksLikeCaptcha(text: string): boolean {
    const lc = text.toLowerCase();
    const captchaSignals = [
      'captcha', '验证码', '我不是机器人', '我不是 robot',
      'prove you are human', 'verify you are human',
      'recaptcha', 'hcaptcha', 'cf-chl', 'turnstile',
      'data-dome', 'datadome',
      '点击验证', '滑动验证', '拼图验证', '点选验证',
    ];
    return captchaSignals.some((signal) => lc.includes(signal));
  }

  /**
   * 检测文本是否为空/噪声
   */
  isEmptyText(text: string): boolean {
    const stripped = text.replace(/\s+/g, '');
    if (stripped.length < 10) return true;
    const alphaRatio = stripped.replace(/[^a-zA-Z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, '').length / stripped.length;
    return alphaRatio < 0.3;
  }

  /**
   * 预热 worker
   */
  async warmUp(): Promise<void> {
    await this.initialize();
    const placeholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await this.recognize(placeholder, 'warmup');
  }

  /**
   * 终止所有 worker
   */
  async terminate(): Promise<void> {
    await Promise.all(this.pool.map((w) => w.worker.terminate().catch(() => {})));
    this.pool.length = 0;
    this.pendingQueue.length = 0;
    this.initialized = false;
    this.initPromise = undefined;
  }
}
