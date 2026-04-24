// 设备档案 — 与设计文档第 4.2 节完全对齐

import type { DeviceProfile } from '../types/index.js';

export const deviceProfiles: Record<string, DeviceProfile> = {
  // ============ Windows 桌面 ============
  desktop_win10_chrome: {
    id: 'desktop_win10_chrome',
    name: 'Windows 10 Chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    platform: 'Win32',
    screen: { width: 1920, height: 1080, colorDepth: 24, devicePixelRatio: 1 },
    viewport: { width: 1920, height: 1080, isMobile: false, hasTouch: false },
    hardwareConcurrency: 8,
    deviceMemory: 16,
    maxTouchPoints: 0,
    vendor: 'Google Inc.',
    locale: 'en-US',
    webgl: {
      vendor: 'Google Inc. (NVIDIA)',
      renderer: 'ANGLE (NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
      vendor2: 'Google Inc.',
      renderer2: 'ANGLE (NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
    },
    connection: { effectiveType: '4g', downlink: 10, rtt: 50 },
  },

  // ============ Mac ============
  macbook_pro_14: {
    id: 'macbook_pro_14',
    name: 'MacBook Pro 14',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    platform: 'MacIntel',
    screen: { width: 3024, height: 1964, colorDepth: 24, devicePixelRatio: 2 },
    viewport: { width: 1512, height: 982, isMobile: false, hasTouch: false },
    hardwareConcurrency: 10,
    deviceMemory: 16,
    maxTouchPoints: 0,
    vendor: 'Google Inc.',
    locale: 'en-US',
    webgl: {
      vendor: 'Google Inc. (Apple)',
      renderer: 'Apple GPU',
      vendor2: 'Google Inc.',
      renderer2: 'ANGLE (Apple GPU)',
    },
    connection: { effectiveType: '4g', downlink: 10, rtt: 50 },
  },

  // ============ 移动设备 ============
  pixel_8: {
    id: 'pixel_8',
    name: 'Google Pixel 8',
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
    screen: { width: 393, height: 852, colorDepth: 24, devicePixelRatio: 2.625 },
    viewport: { width: 393, height: 852, isMobile: true, hasTouch: true },
    hardwareConcurrency: 8,
    deviceMemory: 4,
    maxTouchPoints: 5,
    vendor: 'Google Inc.',
    locale: 'zh-CN',
    webgl: {
      vendor: 'Google Inc. (ANGLE)',
      renderer: 'Mali-G78',
      vendor2: 'Google Inc.',
      renderer2: 'ANGLE (Mali-G78)',
    },
    connection: { effectiveType: '4g', downlink: 10, rtt: 50 },
  },

  iphone_15: {
    id: 'iphone_15',
    name: 'Apple iPhone 15',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
    screen: { width: 430, height: 932, colorDepth: 24, devicePixelRatio: 3 },
    viewport: { width: 430, height: 932, isMobile: true, hasTouch: true },
    hardwareConcurrency: 6,
    deviceMemory: 6,
    maxTouchPoints: 5,
    vendor: 'Apple Inc.',
    locale: 'zh-CN',
    webgl: {
      vendor: 'Apple Inc.',
      renderer: 'Apple GPU',
      vendor2: 'Apple Inc.',
      renderer2: 'Apple GPU',
    },
    connection: { effectiveType: '4g', downlink: 10, rtt: 50 },
  },

  pixel_7: {
    id: 'pixel_7',
    name: 'Google Pixel 7',
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
    screen: { width: 412, height: 915, colorDepth: 24, devicePixelRatio: 2.625 },
    viewport: { width: 412, height: 915, isMobile: true, hasTouch: true },
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 5,
    vendor: 'Google Inc.',
    locale: 'zh-CN',
    webgl: {
      vendor: 'Google Inc. (ANGLE)',
      renderer: 'Mali-G710',
      vendor2: 'Google Inc.',
      renderer2: 'ANGLE (Mali-G710)',
    },
    connection: { effectiveType: '4g', downlink: 10, rtt: 50 },
  },

  iphone_15_pro: {
    id: 'iphone_15_pro',
    name: 'Apple iPhone 15 Pro',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
    screen: { width: 393, height: 852, colorDepth: 24, devicePixelRatio: 3 },
    viewport: { width: 393, height: 852, isMobile: true, hasTouch: true },
    hardwareConcurrency: 6,
    deviceMemory: 6,
    maxTouchPoints: 5,
    vendor: 'Apple Inc.',
    locale: 'zh-CN',
    webgl: {
      vendor: 'Apple Inc.',
      renderer: 'Apple A17 Pro GPU',
      vendor2: 'Apple Inc.',
      renderer2: 'Apple A17 Pro GPU',
    },
    connection: { effectiveType: '4g', downlink: 10, rtt: 50 },
  },

  galaxy_s24: {
    id: 'galaxy_s24',
    name: 'Samsung Galaxy S24',
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
    screen: { width: 360, height: 780, colorDepth: 24, devicePixelRatio: 3 },
    viewport: { width: 360, height: 780, isMobile: true, hasTouch: true },
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 5,
    vendor: 'Google',
    locale: 'zh-CN',
    webgl: {
      vendor: 'ARM',
      renderer: 'Mali-G715',
      vendor2: 'ARM',
      renderer2: 'Mali-G715',
    },
    connection: { effectiveType: '4g', downlink: 10, rtt: 50 },
  },
};

export function getDeviceProfile(id: string): DeviceProfile | undefined {
  return deviceProfiles[id];
}

export function getAvailableProfiles(): string[] {
  return Object.keys(deviceProfiles);
}
