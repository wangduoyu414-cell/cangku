// CreatorOS Core Types
// 所有跨模块共享的类型定义，禁止在模块内重复声明

// ============ 平台与身份 ============

export type Platform = 'douyin' | 'xiaohongshu' | 'weibo' | 'bilibili' | 'taobao' | 'jd' | 'pinduoduo' | 'tiktok';

export type BrowserEngine = 'chromium' | 'firefox' | 'webkit';

export type ContainerMode = 'browser' | 'app';

// ============ 设备档案 ============

export interface ScreenConfig {
  width: number;
  height: number;
  colorDepth: number;
  devicePixelRatio: number;
}

export interface ViewportConfig {
  width: number;
  height: number;
  isMobile: boolean;
  hasTouch: boolean;
  deviceScaleFactor?: number;
}

export interface ConnectionInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData?: boolean;
}

export interface WebGLConfig {
  vendor: string;
  renderer: string;
  vendor2: string;
  renderer2: string;
}

export interface DeviceProfile {
  id: string;
  name: string;
  userAgent: string;
  platform: string;
  screen: ScreenConfig;
  viewport: ViewportConfig;
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  vendor: string;
  locale: string;
  webgl?: WebGLConfig;
  connection?: ConnectionInfo;
}

// ============ 代理配置 ============

export type ProxyType = 'mobile_4g' | 'residential' | 'datacenter';

export interface ProxyConfig {
  ip: string;
  port: number;
  protocol?: 'http' | 'socks5';
  type: ProxyType;
  auth?: {
    username: string;
    password: string;
  };
  region?: string;
  asn?: string; // Autonomous System Number，必须与 IP 地理位置匹配
}

// ============ 容器状态 ============

export type ContainerState = 'created' | 'running' | 'paused' | 'stopped' | 'error';

export type AccountState =
  | 'new'
  | 'active'
  | 'cooling'
  | 'rate_limited'
  | 'captcha'
  | 'manual_intervention'
  | 'banned';

export interface ContainerSnapshot {
  id: string;
  state: ContainerState;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastAction: string;
  lastActionTime: number;
}

export interface ContainerMetrics {
  state: ContainerState;
  uptime: number;
  memoryUsage: number;
  actionCount: number;
  lastAction: string;
  lastError?: string;
}

// ============ 账号 ============

export interface Account {
  id: string;
  platform: Platform;
  phone?: string;
  email?: string;
  state: AccountState;
  stateChangedAt: number;
  cooldownUntil?: number;
  dailyRequestCount: number;
  lastError?: string;
}

export interface AccountGroup {
  id: string;
  name: string;
  platform: Platform;
  accounts: string[];
  proxy: ProxyConfig;
  concurrency: number;
  dailyLimit: number;
}

// ============ 运营策略 ============

export interface BehaviorStrategy {
  dailyActions: number;
  actionInterval: number;
  likeRatio: number;
  followRatio: number;
  commentRatio: number;
  randomThinkTime: [number, number]; // [min ms, max ms]
}

export interface ContentStrategy {
  publishEnabled: boolean;
  maxDailyPublish: number;
  preferredTags: string[];
  avoidTopics: string[];
}

export interface RiskStrategy {
  maxCaptchaPerDay: number;
  cooldownOnCaptcha: number;
  autoQuarantine: boolean;
}

export interface OperationStrategy {
  id: string;
  name: string;
  platform: Platform;
  behavior: BehaviorStrategy;
  content: ContentStrategy;
  risk: RiskStrategy;
}

// ============ 容器配置 ============

export interface ContainerConfig {
  id: string;
  platform: Platform;
  mode: ContainerMode;
  profile: DeviceProfile;
  proxy: ProxyConfig;
  account: Account;
  strategy: OperationStrategy;
}

export interface SessionBundle {
  id: string;
  accountId: string;
  platform: Platform;
  createdAt: number;
  expiresAt?: number;
  cookies: string;
  localStorage: string;
  sessionStorage: string;
  indexedDB?: string;
  token?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

// ============ 行为执行 ============

export type ActionType =
  | 'scrape_posts'
  | 'scrape_comments'
  | 'scrape_profile'
  | 'publish_video'
  | 'publish_image'
  | 'like'
  | 'follow'
  | 'comment'
  | 'bookmark'
  | 'share'
  | 'send_dm';

export interface Action {
  type: ActionType;
  params: Record<string, unknown>;
  priority?: number;
  retryable?: boolean;
  maxRetries?: number;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  retryable?: boolean;
  captchaDetected?: boolean;
}

// ============ 浏览器 / App 操作 ============

export interface BrowserAction {
  type: 'goto' | 'click' | 'type' | 'scroll' | 'screenshot' | 'evaluate' | 'waitForSelector';
  params: Record<string, unknown>;
}

export interface BrowserResult {
  success: boolean;
  data?: unknown;
  error?: string;
  pageHtml?: string;
}

export interface AppAction {
  type: 'tap' | 'swipe' | 'input' | 'press' | 'deep_link' | 'screenshot';
  params: Record<string, unknown>;
}

export interface AppResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============ 网络流量 ============

export interface HTTPExchange {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

export interface APISchema {
  endpoint: string;
  method: string;
  params: Record<string, string>;
  responseSchema?: unknown;
}

export interface DBDiff {
  added: Record<string, unknown[]>;
  removed: Record<string, unknown[]>;
  modified: Record<string, { before: unknown; after: unknown }[]>;
}

// ============ 监控指标 ============

export interface PlatformMetrics {
  successRate: number;
  captchaRate: number;
  avgResponseTime: number;
}

export interface AccountMetrics {
  state: AccountState;
  todayRequests: number;
  dailyLimit: number;
  cooldownUntil?: number;
  lastError?: string;
}

export interface ProxyMetrics {
  successRate: number;
  banCount: number;
  avgLatency: number;
}

// ============ 任务 ============

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Task {
  id: string;
  type: ActionType;
  params: Record<string, unknown>;
  containerId?: string;
  accountId?: string;
  status: TaskStatus;
  priority: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: ActionResult;
}

// ============ 内容发布 ============

export interface ContentItem {
  title?: string;
  text?: string;
  mediaPaths?: string[];
  hashtags?: string[];
  location?: string;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
}

export interface MediaId {
  id: string;
  url: string;
}

export interface Metadata {
  title?: string;
  description?: string;
  hashtags?: string[];
  location?: string;
  visibility?: 'public' | 'private';
}

export type PublishStatus = 'draft' | 'published' | 'failed' | 'reviewing';

// ============ 创作者经济 ============

export type RevenueType = 'ad_revenue' | 'affiliate' | 'tips' | 'sponsorship' | 'product_sales';
export type Currency = 'CNY' | 'USD' | 'HKD';

export interface RevenueEntry {
  platform: Platform;
  date: string;
  type: RevenueType;
  amount: number;
  currency: Currency;
  contentId?: string;
}

// ============ 短信 / 通知 ============

export interface SMSMessage {
  from: string;
  to: string;
  body: string;
  timestamp: number;
  read: boolean;
}

// ============ 存储后端 ============

export interface SessionMeta {
  id: string;
  accountId: string;
  platform: Platform;
  createdAt: number;
  lastAccessedAt: number;
  size: number;
}
