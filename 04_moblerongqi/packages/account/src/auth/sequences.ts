// 平台登录序列定义 — 与设计文档第 6.3 节对齐

import type { Platform } from '@creator-os/core';

// ============ 类型定义 ============

export interface LoginStep {
  /** 操作类型 */
  action: 'goto' | 'waitForSelector' | 'click' | 'type' | 'waitForNavigation' | 'screenshot' | 'waitForTimeout' | 'evaluate' | 'checkElement';
  /** 操作参数 */
  params: Record<string, unknown>;
  /** 是否可选（失败不中断） */
  optional?: boolean;
  /** 重试次数 */
  retry?: number;
  /** 操作描述 */
  description?: string;
}

export interface LoginSequence {
  /** 平台 */
  platform: Platform;
  /** 登录页面 URL */
  loginUrl: string;
  /** 登录步骤 */
  steps: LoginStep[];
  /** 成功检测选择器 */
  successSelectors: string[];
  /** 失败检测选择器 */
  failureSelectors?: string[];
  /** 是否支持短信登录 */
  supportsSMS?: boolean;
  /** 是否支持密码登录 */
  supportsPassword?: boolean;
}

// ============ 辅助函数 ============

function goto(url: string, description?: string): LoginStep {
  return { action: 'goto', params: { url }, description };
}

function waitForSelector(selector: string, options?: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' }, description?: string): LoginStep {
  return {
    action: 'waitForSelector',
    params: { selector, ...options },
    description: description ?? `Wait for ${selector}`,
  };
}

function click(selector: string, options?: { force?: boolean }, description?: string): LoginStep {
  return {
    action: 'click',
    params: { selector, ...options },
    description: description ?? `Click ${selector}`,
  };
}

function type(selector: string, value: string, options?: { delay?: number }, description?: string): LoginStep {
  return {
    action: 'type',
    params: { selector, value, ...options },
    description: description ?? `Type into ${selector}`,
  };
}

function waitForNavigation(options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }, description?: string): LoginStep {
  return {
    action: 'waitForNavigation',
    params: options ?? {},
    description: description ?? 'Wait for navigation',
  };
}

function waitForTimeout(ms: number, description?: string): LoginStep {
  return {
    action: 'waitForTimeout',
    params: { ms },
    description: description ?? `Wait ${ms}ms`,
  };
}

function checkElement(selector: string, exists: boolean, description?: string): LoginStep {
  return {
    action: 'checkElement',
    params: { selector, exists },
    description: description ?? `Check ${selector} ${exists ? 'exists' : 'not exists'}`,
  };
}

function screenshot(name?: string): LoginStep {
  return {
    action: 'screenshot',
    params: { name },
    description: name ? `Screenshot: ${name}` : 'Take screenshot',
  };
}

// ============ 抖音登录序列 ============

export const douyinLoginSequence: LoginSequence = {
  platform: 'douyin',
  loginUrl: 'https://www.douyin.com/login/',
  supportsSMS: true,
  supportsPassword: true,
  steps: [
    // 1. 访问登录页
    goto('https://www.douyin.com/login/'),

    // 2. 等待页面加载
    waitForSelector('body', { timeout: 15_000 }),

    // 3. 检测是否已登录
    checkElement('.login-header, .header-user-avatar, [data-e2e="user-avatar"]', true, 'Check if already logged in'),

    // 4. 如果未登录，点击"密码登录"或"短信登录"切换
    waitForSelector('.login-way-switch, .login-type-tabs', { state: 'visible' }, 'Wait for login type tabs'),
    click('[data-e2e="sms-login"]', { force: true }, 'Switch to SMS login'),

    // 5. 等待手机号输入框
    waitForSelector('input[placeholder*="手机"]', { timeout: 10_000 }),

    // 6. 输入手机号
    type('input[type="tel"], input[placeholder*="手机"]', '{{phone}}', { delay: 100 }),

    // 7. 点击获取验证码
    waitForSelector('.send-code-btn, [data-e2e="send-code"]', { timeout: 5000 }, 'Wait for send code button'),
    click('.send-code-btn, [data-e2e="send-code"]', {}, 'Click send code'),

    // 8. 等待验证码输入框
    waitForSelector('input[maxlength="6"], input[placeholder*="验证码"]', { timeout: 10_000 }),

    // 9. 输入验证码（由调用方填写，这里只等待）
    waitForTimeout(2000),

    // 10. 点击登录按钮
    waitForSelector('button[type="submit"]', { timeout: 5000 }),
    click('button[type="submit"]', {}, 'Submit login'),

    // 11. 等待导航到主页
    waitForNavigation({ timeout: 30_000, waitUntil: 'domcontentloaded' }),

    // 12. 验证登录成功
    waitForSelector('.header-user-avatar, [data-e2e="user-avatar"]', { timeout: 15_000 }, 'Verify login success'),
  ],
  successSelectors: [
    '.header-user-avatar',
    '[data-e2e="user-avatar"]',
    '.profile-avatar',
    'a[href*="/user/"]',
  ],
  failureSelectors: [
    '.login-error',
    '.error-tip',
    '.captcha-modal',
  ],
};

// ============ 小红书登录序列 ============

export const xiaohongshuLoginSequence: LoginSequence = {
  platform: 'xiaohongshu',
  loginUrl: 'https://www.xiaohongshu.com/explore/login',
  supportsSMS: true,
  supportsPassword: true,
  steps: [
    // 1. 访问登录页
    goto('https://www.xiaohongshu.com/explore/login'),

    // 2. 等待页面加载
    waitForSelector('body', { timeout: 15_000 }),

    // 3. 检测是否已登录（通过用户信息是否存在）
    checkElement('.user-info, .avatar', true, 'Check if already logged in'),

    // 4. 点击同意协议（如果需要）
    waitForSelector('.agree-checkbox, #agree-checkbox', { timeout: 5000 }, 'Wait for agree checkbox'),
    click('.agree-checkbox, #agree-checkbox', { force: true }, 'Agree to terms'),

    // 5. 等待手机号输入框
    waitForSelector('input[type="tel"], .login-phone-input input', { timeout: 10_000 }),

    // 6. 输入手机号
    type('input[type="tel"], .login-phone-input input', '{{phone}}', { delay: 100 }),

    // 7. 点击获取验证码
    waitForSelector('.send-code-btn, .code-btn', { timeout: 5000 }),
    click('.send-code-btn, .code-btn', {}, 'Click send code'),

    // 8. 等待验证码输入框
    waitForSelector('input[maxlength="6"], .code-input input', { timeout: 10_000 }),

    // 9. 等待验证码输入
    waitForTimeout(2000),

    // 10. 点击登录
    waitForSelector('.login-btn, button[type="submit"]', { timeout: 5000 }),
    click('.login-btn, button[type="submit"]', {}, 'Submit login'),

    // 11. 等待导航
    waitForNavigation({ timeout: 30_000, waitUntil: 'domcontentloaded' }),

    // 12. 验证登录成功
    waitForSelector('.user-info, .avatar, .profile-avatar', { timeout: 15_000 }, 'Verify login success'),
  ],
  successSelectors: [
    '.user-info',
    '.avatar',
    '.profile-avatar',
    'a[href*="/user/profile"]',
  ],
  failureSelectors: [
    '.login-error',
    '.error-tip',
    '.toast-message',
  ],
};

// ============ 微博登录序列 ============

export const weiboLoginSequence: LoginSequence = {
  platform: 'weibo',
  loginUrl: 'https://login.sina.com.cn/signup/signin.php',
  supportsSMS: true,
  supportsPassword: true,
  steps: [
    // 1. 访问登录页
    goto('https://login.sina.com.cn/signup/signin.php'),

    // 2. 等待页面加载
    waitForSelector('body', { timeout: 15_000 }),

    // 3. 检测是否已登录
    checkElement('.userinfo, .user-avatar, #username', true, 'Check if already logged in'),

    // 4. 切换到短信登录（如果有）
    waitForSelector('.loginType, .tab_nav', { timeout: 5000 }, 'Wait for login tabs'),
    click('.tab_nav:has-text("短信登录"), .loginType:has-text("短信")', { force: true }, 'Switch to SMS login'),

    // 5. 等待手机号输入框
    waitForSelector('input[name="phone_num"], input[type="tel"]', { timeout: 10_000 }),

    // 6. 输入手机号
    type('input[name="phone_num"], input[type="tel"]', '{{phone}}', { delay: 100 }),

    // 7. 点击获取验证码
    waitForSelector('.W_btn_a, .send_btn, input[value="获取验证码"]', { timeout: 5000 }),
    click('.W_btn_a:has-text("获取验证码"), .send_btn', {}, 'Click send code'),

    // 8. 等待验证码输入框
    waitForSelector('input[name="code"], input[placeholder*="验证码"]', { timeout: 10_000 }),

    // 9. 等待验证码输入
    waitForTimeout(2000),

    // 10. 点击登录
    waitForSelector('.W_btn_a[type="submit"], button[type="submit"]', { timeout: 5000 }),
    click('.W_btn_a[type="submit"], button[type="submit"]', {}, 'Submit login'),

    // 11. 等待导航
    waitForNavigation({ timeout: 30_000, waitUntil: 'domcontentloaded' }),

    // 12. 验证登录成功
    waitForSelector('.userinfo, .user-avatar, #plc_top', { timeout: 15_000 }, 'Verify login success'),
  ],
  successSelectors: [
    '.userinfo',
    '.user-avatar',
    '#plc_top',
    'a[href*="/u/"]',
  ],
  failureSelectors: [
    '.error_box',
    '.login-error',
  ],
};

// ============ B站登录序列 ============

export const bilibiliLoginSequence: LoginSequence = {
  platform: 'bilibili',
  loginUrl: 'https://passport.bilibili.com/login',
  supportsSMS: true,
  supportsPassword: true,
  steps: [
    // 1. 访问登录页
    goto('https://passport.bilibili.com/login'),

    // 2. 等待页面加载
    waitForSelector('body', { timeout: 15_000 }),

    // 3. 检测是否已登录
    checkElement('.user-info, .header-user', true, 'Check if already logged in'),

    // 4. 切换到短信登录
    waitForSelector('.login-tab, .login-tabs', { timeout: 5000 }, 'Wait for login tabs'),
    click('.login-tab:has-text("短信登录"), .login-tabs span:last-child', { force: true }, 'Switch to SMS login'),

    // 5. 等待手机号输入框
    waitForSelector('input[placeholder*="手机"], input[type="tel"]', { timeout: 10_000 }),

    // 6. 输入手机号
    type('input[placeholder*="手机"], input[type="tel"]', '{{phone}}', { delay: 100 }),

    // 7. 点击获取验证码
    waitForSelector('.send-btn, .btn-send, button:has-text("获取验证码")', { timeout: 5000 }),
    click('.send-btn, .btn-send, button:has-text("获取验证码")', {}, 'Click send code'),

    // 8. 等待验证码输入框
    waitForSelector('input[maxlength="6"], .code-input input', { timeout: 10_000 }),

    // 9. 等待验证码输入
    waitForTimeout(2000),

    // 10. 点击登录
    waitForSelector('.btn-login, button[type="submit"]', { timeout: 5000 }),
    click('.btn-login, button[type="submit"]', {}, 'Submit login'),

    // 11. 等待导航
    waitForNavigation({ timeout: 30_000, waitUntil: 'domcontentloaded' }),

    // 12. 验证登录成功
    waitForSelector('.user-info, .header-user, .avatar', { timeout: 15_000 }, 'Verify login success'),
  ],
  successSelectors: [
    '.user-info',
    '.header-user',
    '.avatar',
    '.mini-avatar',
  ],
  failureSelectors: [
    '.error-messages',
    '.login-error',
  ],
};

// ============ 淘宝登录序列 ============

export const taobaoLoginSequence: LoginSequence = {
  platform: 'taobao',
  loginUrl: 'https://login.taobao.com/member/login',
  supportsSMS: true,
  supportsPassword: true,
  steps: [
    // 1. 访问登录页
    goto('https://login.taobao.com/member/login'),

    // 2. 等待页面加载
    waitForSelector('body', { timeout: 15_000 }),

    // 3. 检测是否已登录
    checkElement('.site-nav-user, .logout', true, 'Check if already logged in'),

    // 4. 切换到账号登录（默认是二维码）
    waitForSelector('.login-switch, .login-type', { timeout: 5000 }, 'Wait for login switch'),
    click('.login-switch, .login-type:has-text("账户登录")', { force: true }, 'Switch to account login'),

    // 5. 等待用户名输入框
    waitForSelector('input#fm-login-id, input[name="loginId"]', { timeout: 10_000 }),

    // 6. 输入用户名/手机号
    type('#fm-login-id, input[name="loginId"]', '{{phone}}', { delay: 100 }),

    // 7. 输入密码
    waitForSelector('input#fm-login-password, input[name="loginPwd"]', { timeout: 5000 }),
    type('#fm-login-password, input[name="loginPwd"]', '{{password}}', { delay: 50 }),

    // 8. 点击登录
    waitForSelector('button[type="submit"], .fm-button', { timeout: 5000 }),
    click('button[type="submit"], .fm-button', {}, 'Submit login'),

    // 9. 等待滑块验证码处理（如果有）
    waitForTimeout(2000),

    // 10. 等待导航
    waitForNavigation({ timeout: 30_000, waitUntil: 'domcontentloaded' }),

    // 11. 验证登录成功
    waitForSelector('.site-nav-user, .logout, #J_SiteNavLogin', { timeout: 15_000 }, 'Verify login success'),
  ],
  successSelectors: [
    '.site-nav-user',
    '.logout',
    '#J_SiteNavLogin',
  ],
  failureSelectors: [
    '.error-wrapper',
    '.login-error',
    '.captcha-container',
  ],
};

// ============ 京东登录序列 ============

export const jdLoginSequence: LoginSequence = {
  platform: 'jd',
  loginUrl: 'https://passport.jd.com/new/login.aspx',
  supportsSMS: true,
  supportsPassword: true,
  steps: [
    // 1. 访问登录页
    goto('https://passport.jd.com/new/login.aspx'),

    // 2. 等待页面加载
    waitForSelector('body', { timeout: 15_000 }),

    // 3. 检测是否已登录
    checkElement('.user-info, .nickname', true, 'Check if already logged in'),

    // 4. 切换到账户登录
    waitForSelector('.login-tab, .login-type', { timeout: 5000 }, 'Wait for login tabs'),
    click('.login-tab:has-text("账户登录"), .login-type:has-text("账户")', { force: true }, 'Switch to account login'),

    // 5. 等待用户名输入框
    waitForSelector('#loginname, input[name="loginname"]', { timeout: 10_000 }),

    // 6. 输入用户名
    type('#loginname, input[name="loginname"]', '{{phone}}', { delay: 100 }),

    // 7. 输入密码
    waitForSelector('#nloginpwd, input[name="nloginpwd"]', { timeout: 5000 }),
    type('#nloginpwd, input[name="nloginpwd"]', '{{password}}', { delay: 50 }),

    // 8. 点击登录
    waitForSelector('#loginsubmit, button[type="submit"]', { timeout: 5000 }),
    click('#loginsubmit, button[type="submit"]', {}, 'Submit login'),

    // 9. 等待导航
    waitForNavigation({ timeout: 30_000, waitUntil: 'domcontentloaded' }),

    // 10. 验证登录成功
    waitForSelector('.user-info, .nickname, .header-user', { timeout: 15_000 }, 'Verify login success'),
  ],
  successSelectors: [
    '.user-info',
    '.nickname',
    '.header-user',
    '.jd-header-user',
  ],
  failureSelectors: [
    '.form-error',
    '.login-error',
  ],
};

// ============ 拼多多登录序列 ============

export const pinduoduoLoginSequence: LoginSequence = {
  platform: 'pinduoduo',
  loginUrl: 'https://mobile.yangkunsoft.com/mockapi/pdd/login',
  supportsSMS: true,
  supportsPassword: false,
  steps: [
    // 1. 访问登录页
    goto('https://mobile.yangkunsoft.com/mockapi/pdd/login'),

    // 2. 等待页面加载
    waitForSelector('body', { timeout: 15_000 }),

    // 3. 检测是否已登录
    checkElement('.user-info, .profile-avatar', true, 'Check if already logged in'),

    // 4. 等待手机号输入框
    waitForSelector('input[type="tel"], input[placeholder*="手机"]', { timeout: 10_000 }),

    // 5. 输入手机号
    type('input[type="tel"], input[placeholder*="手机"]', '{{phone}}', { delay: 100 }),

    // 6. 点击获取验证码
    waitForSelector('.get-code-btn, button:has-text("获取验证码")', { timeout: 5000 }),
    click('.get-code-btn, button:has-text("获取验证码")', {}, 'Click send code'),

    // 7. 等待验证码输入框
    waitForSelector('input[maxlength="6"], input[placeholder*="验证码"]', { timeout: 10_000 }),

    // 8. 等待验证码输入
    waitForTimeout(2000),

    // 9. 点击登录
    waitForSelector('button[type="submit"], .login-btn', { timeout: 5000 }),
    click('button[type="submit"], .login-btn', {}, 'Submit login'),

    // 10. 等待导航
    waitForNavigation({ timeout: 30_000, waitUntil: 'domcontentloaded' }),

    // 11. 验证登录成功
    waitForSelector('.user-info, .profile-avatar', { timeout: 15_000 }, 'Verify login success'),
  ],
  successSelectors: [
    '.user-info',
    '.profile-avatar',
    '.pdd-header-user',
  ],
  failureSelectors: [
    '.error-tip',
    '.login-error',
  ],
};

// ============ TikTok 登录序列 ============

export const tiktokLoginSequence: LoginSequence = {
  platform: 'tiktok',
  loginUrl: 'https://www.tiktok.com/login',
  supportsSMS: true,
  supportsPassword: true,
  steps: [
    // 1. 访问登录页
    goto('https://www.tiktok.com/login'),

    // 2. 等待页面加载
    waitForSelector('body', { timeout: 15_000 }),

    // 3. 检测是否已登录
    checkElement('[data-e2e="profile-icon"], .profile-icon', true, 'Check if already logged in'),

    // 4. 选择登录方式（手机号）
    waitForSelector('.login-select-method', { timeout: 5000 }, 'Wait for login method selection'),
    click('.login-select-method:has-text("Phone"), [data-e2e="login-phone-method"]', { force: true }, 'Select phone login'),

    // 5. 等待手机号输入框
    waitForSelector('input[type="tel"], .phone-input input', { timeout: 10_000 }),

    // 6. 输入手机号
    type('input[type="tel"], .phone-input input', '{{phone}}', { delay: 100 }),

    // 7. 点击获取验证码
    waitForSelector('.send-code-btn, button:has-text("Send Code")', { timeout: 5000 }),
    click('.send-code-btn, button:has-text("Send Code")', {}, 'Click send code'),

    // 8. 等待验证码输入框
    waitForSelector('input[maxlength="6"], .code-input input', { timeout: 10_000 }),

    // 9. 等待验证码输入
    waitForTimeout(2000),

    // 10. 点击登录
    waitForSelector('button[type="submit"], .login-btn', { timeout: 5000 }),
    click('button[type="submit"], .login-btn', {}, 'Submit login'),

    // 11. 等待导航
    waitForNavigation({ timeout: 30_000, waitUntil: 'domcontentloaded' }),

    // 12. 验证登录成功
    waitForSelector('[data-e2e="profile-icon"], .profile-icon', { timeout: 15_000 }, 'Verify login success'),
  ],
  successSelectors: [
    '[data-e2e="profile-icon"]',
    '.profile-icon',
    '[data-e2e="upload-icon"]',
  ],
  failureSelectors: [
    '.error-message',
    '.login-error',
  ],
};

// ============ 序列映射表 ============

export const loginSequences: Record<Platform, LoginSequence> = {
  douyin: douyinLoginSequence,
  xiaohongshu: xiaohongshuLoginSequence,
  weibo: weiboLoginSequence,
  bilibili: bilibiliLoginSequence,
  taobao: taobaoLoginSequence,
  jd: jdLoginSequence,
  pinduoduo: pinduoduoLoginSequence,
  tiktok: tiktokLoginSequence,
};

/**
 * 获取指定平台的登录序列
 */
export function getLoginSequence(platform: Platform): LoginSequence {
  return loginSequences[platform];
}

/**
 * 替换序列中的占位符
 */
export function interpolateSequence(sequence: LoginSequence, vars: Record<string, string>): LoginSequence {
  const interpolated = JSON.stringify(sequence);
  let result = interpolated;

  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  return JSON.parse(result) as LoginSequence;
}
