/**
 * 反爬检测模块
 * 
 * 识别 30+ 种反爬拦截模式
 * 支持：Cloudflare、Akamai、DataDome、Kasada、Turnstile 等
 */

// ─── 检测结果 ────────────────────────────────────────────────────────────────

export interface BlockDetection {
  blocked: boolean;
  reason?: string;
  type?: string;
}

// ─── 拦截模式定义 ────────────────────────────────────────────────────────────

interface BlockPattern {
  pattern: RegExp | string;
  type: string;
  reason: string;
}

const BLOCK_PATTERNS: BlockPattern[] = [
  // Cloudflare
  { pattern: /cf-chl-container/i, type: 'cloudflare', reason: 'Cloudflare challenge container' },
  { pattern: /data-sitekey="[^"]*cloudflare/i, type: 'cloudflare', reason: 'Cloudflare Turnstile' },
  { pattern: /Cloudflare/i, type: 'cloudflare', reason: 'Cloudflare detected' },
  { pattern: /ray id: [A-Z0-9]{16}/i, type: 'cloudflare', reason: 'Cloudflare Ray ID' },
  { pattern: /Attention required/i, type: 'cloudflare', reason: 'Cloudflare Challenge page' },
  { pattern: /Please wait while we check/i, type: 'cloudflare', reason: 'Cloudflare checking' },
  { pattern: /jschl-vc/i, type: 'cloudflare', reason: 'Cloudflare JS Challenge' },

  // Akamai
  { pattern: /Reference #\.\w+/i, type: 'akamai', reason: 'Akamai block (Reference #)' },
  { pattern: /akamai-sci/i, type: 'akamai', reason: 'Akamai Bot Manager' },
  { pattern: /blocked due to (?:security|antibot)/i, type: 'akamai', reason: 'Akamai blocking' },

  // DataDome
  { pattern: /datadome/i, type: 'datadome', reason: 'DataDome protection' },
  { pattern: /data-dome/i, type: 'datadome', reason: 'DataDome protection' },
  { pattern: /dd-sdk/i, type: 'datadome', reason: 'DataDome SDK detected' },

  // reCAPTCHA / hCaptcha
  { pattern: /recaptcha/i, type: 'captcha', reason: 'reCAPTCHA detected' },
  { pattern: /hcaptcha/i, type: 'captcha', reason: 'hCaptcha detected' },
  { pattern: /g-recaptcha/i, type: 'captcha', reason: 'Google reCAPTCHA' },
  { pattern: /hcaptcha\.com/i, type: 'captcha', reason: 'hCaptcha challenge' },

  // Turnstile
  { pattern: /turnstile/i, type: 'captcha', reason: 'Cloudflare Turnstile' },
  { pattern: /cf-turnstile/i, type: 'captcha', reason: 'Cloudflare Turnstile challenge' },

  // 通用验证码
  { pattern: /captcha/i, type: 'captcha', reason: 'CAPTCHA challenge' },
  { pattern: /验证码/i, type: 'captcha', reason: 'Chinese CAPTCHA' },
  { pattern: /我不是机器人/i, type: 'captcha', reason: '我不是机器人 challenge' },
  { pattern: /点击验证/i, type: 'captcha', reason: 'Click verification' },
  { pattern: /滑动验证/i, type: 'captcha', reason: 'Slide verification' },
  { pattern: /拼图验证/i, type: 'captcha', reason: 'Puzzle verification' },

  // PerimeterX / Shadow
  { pattern: /perimeterx/i, type: 'perimeterx', reason: 'PerimeterX / Shadow' },
  { pattern: /_px2/i, type: 'perimeterx', reason: 'PerimeterX cookie detected' },

  // F5 / Shape
  { pattern: /f5_captcha/i, type: 'f5', reason: 'F5 BIG-IP CAPTCHA' },
  { pattern: /asmaca/i, type: 'f5', reason: 'F5 Bot detection' },

  // 通用拦截
  { pattern: /access denied/i, type: 'denied', reason: 'Access denied' },
  { pattern: /forbidden/i, type: 'denied', reason: '403 Forbidden' },
  { pattern: /blocked/i, type: 'denied', reason: 'Request blocked' },
  { pattern: /403/i, type: 'denied', reason: 'HTTP 403 error' },
  { pattern: /your ip has been/i, type: 'denied', reason: 'IP blocked' },

  // 结构异常
  { pattern: /<html[^>]*><head><\/head><body><\/body><\/html>/i, type: 'empty', reason: 'Empty HTML body' },
  { pattern: /<body><\/body>/i, type: 'empty', reason: 'Empty body tag' },

  // 异常状态码
  { pattern: /status code is 403/i, type: 'denied', reason: '403 Forbidden detected' },
  { pattern: /status code is 451/i, type: 'denied', reason: '451 Unavailable For Legal Reasons' },

  // 其他反爬服务
  { pattern: /imperva/i, type: 'imperva', reason: 'Imperva Incapsula' },
  { pattern: /incapsula/i, type: 'imperva', reason: 'Imperva Incapsula' },
  { pattern: /fastly/i, type: 'fastly', reason: 'Fastly protection' },
  { pattern: /composite/i, type: 'composite', reason: 'Composite blocking' },
];

// ─── 检测函数 ────────────────────────────────────────────────────────────────

/**
 * 检测是否为反爬拦截
 * @param statusCode HTTP 状态码
 * @param html 页面 HTML 内容
 * @param error 可选的错误信息
 */
export function detectBlock(
  statusCode: number,
  html: string,
  error?: string
): BlockDetection {
  // 状态码检测
  if (statusCode === 403) {
    const reason = extractBlockReason(html, error);
    if (reason) {
      return { blocked: true, reason, type: 'http_403' };
    }
  }

  if (statusCode === 451) {
    return { blocked: true, reason: '451 Unavailable For Legal Reasons', type: 'http_451' };
  }

  if (statusCode === 429) {
    return { blocked: true, reason: 'Rate limited (429)', type: 'rate_limit' };
  }

  if (statusCode === 503) {
    return { blocked: true, reason: 'Service unavailable (503)', type: 'unavailable' };
  }

  // HTML 内容检测
  const content = html + (error ?? '');

  for (const { pattern, type, reason } of BLOCK_PATTERNS) {
    if (typeof pattern === 'string') {
      if (content.includes(pattern)) {
        return { blocked: true, reason, type };
      }
    } else {
      if (pattern.test(content)) {
        return { blocked: true, reason, type };
      }
    }
  }

  // 空页面检测
  if (isEmptyPage(html)) {
    return { blocked: true, reason: 'Empty page detected', type: 'empty' };
  }

  return { blocked: false };
}

/**
 * 提取具体的拦截原因
 */
function extractBlockReason(html: string, error?: string): string | undefined {
  const content = html + (error ?? '');

  for (const { pattern, reason } of BLOCK_PATTERNS) {
    if (typeof pattern === 'string') {
      if (content.includes(pattern)) {
        return reason;
      }
    } else {
      const match = content.match(pattern);
      if (match) {
        return match[0].length > 100 ? reason : match[0];
      }
    }
  }

  return undefined;
}

/**
 * 检测是否为空页面
 */
function isEmptyPage(html: string): boolean {
  const stripped = html.replace(/\s+/g, '');
  if (stripped.length < 200) return true;

  // 检查是否有实质内容
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) return true;

  const body = bodyMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  return body.length < 50;
}

/**
 * 判断是否为可重试的错误
 */
export function isRetryableBlock(detection: BlockDetection): boolean {
  const nonRetryable = ['captcha', 'perimeterx', 'datadome', 'empty'];
  return !nonRetryable.includes(detection.type ?? '');
}
