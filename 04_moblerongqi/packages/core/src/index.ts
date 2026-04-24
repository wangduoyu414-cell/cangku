// Core package barrel export

// 导出 BrowserEngine（不能用通配符，因为 types 也导出了同名类型）
export { BrowserEngine, type BrowserEngineOptions } from './browser/index.js';
export * from './types/index.js';
export * from './constants.js';
export * from './fingerprint/index.js';
export * from './behavior/index.js';
export * from './session/storage.js';
export * from './browser/index.js';

// OCR 引擎导出
export { TesseractPool, type TesseractPoolConfig, type TesseractResult } from './browser/ocr/index.js';

// 反爬检测导出
export { detectBlock, isRetryableBlock, type BlockDetection } from './browser/antidetect/index.js';

export {
  deviceProfiles,
  getDeviceProfile,
  getAvailableProfiles,
} from './config/profiles.js';
export { platformConfigs, getPlatformConfig } from './config/platform.js';
