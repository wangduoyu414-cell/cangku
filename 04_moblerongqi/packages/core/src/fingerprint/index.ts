// 浏览器指纹注入 — 与设计文档第 4.3 节完全对齐
// 所有 override 函数均有完整实现，无悬挂引用

import type { DeviceProfile, ConnectionInfo } from '../types/index.js';
import { CANVAS_NOISE_SEED } from '../constants.js';

// ============ Navigator 指纹 ============

export function navigatorOverride(profile: DeviceProfile): string {
  const p = profile;
  return `
    Object.defineProperty(navigator, 'platform', { get: () => '${p.platform}', configurable: true });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${p.hardwareConcurrency}, configurable: true });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => ${p.deviceMemory}, configurable: true });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => ${p.maxTouchPoints}, configurable: true });
    Object.defineProperty(navigator, 'vendor', { get: () => '${p.vendor}', configurable: true });
    Object.defineProperty(navigator, 'language', { get: () => '${p.locale}', configurable: true });
    Object.defineProperty(navigator, 'languages', { get: () => ['${p.locale}', 'zh', 'en-US', 'en'], configurable: true });
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
  `;
}

// ============ WebGL 指纹 ============

export function webglOverride(profile: DeviceProfile): string {
  const vendor = profile.webgl?.vendor ?? 'Google Inc. (ANGLE)';
  const renderer = profile.webgl?.renderer ?? 'Mali-G78';
  const vendor2 = profile.webgl?.vendor2 ?? vendor;
  const renderer2 = profile.webgl?.renderer2 ?? renderer;

  return `
    (function() {
      var _getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(param) {
        if (param === 37445) return '${vendor}';
        if (param === 37446) return '${renderer}';
        return _getParameter.call(this, param);
      };
      var _getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(param) {
        if (param === 37445) return '${vendor2}';
        if (param === 37446) return '${renderer2}';
        return _getParameter2.call(this, param);
      };
    })();
  `;
}

// ============ Canvas 指纹 ============

export function canvasOverride(): string {
  const noise = CANVAS_NOISE_SEED;
  return `
    (function() {
      var _toDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type, encoderOptions) {
        var ctx = this.getContext('2d');
        if (ctx) {
          try {
            var imageData = ctx.getImageData(0, 0, this.width, this.height);
            var n = ${noise};
            for (var i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] = Math.min(255, imageData.data[i] + (Math.random() - 0.5) * n * 255);
            }
            ctx.putImageData(imageData, 0, 0);
          } catch(e) {}
        }
        return _toDataURL.call(this, type, encoderOptions);
      };
      var _toBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
        var ctx = this.getContext('2d');
        if (ctx) {
          try {
            var imageData = ctx.getImageData(0, 0, this.width, this.height);
            var n = ${noise};
            for (var i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] = Math.min(255, imageData.data[i] + (Math.random() - 0.5) * n * 255);
            }
            ctx.putImageData(imageData, 0, 0);
          } catch(e) {}
        }
        return _toBlob.call(this, callback, type, quality);
      };
    })();
  `;
}

// ============ Timezone 指纹 ============

export function timezoneOverride(timezone: string): string {
  const offsetMinutes = getTimezoneOffset(timezone);
  return `
    (function() {
      var _getTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function() { return ${offsetMinutes}; };
      var _DateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = new Proxy(_DateTimeFormat, {
        construct: function(target, args, zone) {
          var instance = Reflect.construct(target, args);
          instance.resolvedOptions = function() {
            var opts = Reflect.apply(target.prototype.resolvedOptions, instance, []) || {};
            opts.timeZone = opts.timeZone || '${timezone}';
            return opts;
          };
          return instance;
        }
      });
    })();
  `;
}

function getTimezoneOffset(timezone: string): number {
  const map: Record<string, number> = {
    'Asia/Shanghai': -480,
    'Asia/Hong_Kong': -480,
    'Asia/Tokyo': -540,
    'Asia/Seoul': -540,
    'America/New_York': 300,
    'America/Los_Angeles': 480,
    'Europe/London': 0,
    'Europe/Paris': -60,
  };
  return map[timezone] ?? -480;
}

// ============ Permissions 指纹 ============

export function permissionsOverride(): string {
  return `
    (function() {
      var _query = navigator.permissions.query;
      navigator.permissions.query = function(params) {
        if (params.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission, addEventListener: function(){}, removeEventListener: function(){}, dispatchEvent: function(){} });
        }
        return _query.call(navigator.permissions, params);
      };
    })();
  `;
}

// ============ Connection 指纹 ============

export function connectionOverride(conn?: ConnectionInfo): string {
  const { effectiveType = '4g', downlink = 10, rtt = 50 } = conn ?? {};
  return `
    Object.defineProperty(navigator, 'connection', {
      value: {
        effectiveType: '${effectiveType}',
        downlink: ${downlink},
        rtt: ${rtt},
        saveData: false,
        addEventListener: function() {},
        removeEventListener: function() {},
        onchange: null,
      },
      configurable: true,
    });
  `;
}

// ============ Battery 指纹 ============

export function batteryOverride(): string {
  return `
    Object.defineProperty(navigator, 'getBattery', {
      value: function() {
        return Promise.resolve({
          charging: true,
          level: 0.85,
          chargingTime: 0,
          dischargingTime: Infinity,
          addEventListener: function() {},
          removeEventListener: function() {},
        });
      },
      configurable: true,
    });
  `;
}

// ============ Audio 指纹 ============

export function audioOverride(): string {
  return `
    (function() {
      var _addEventListener = AudioContext.prototype.addEventListener;
      AudioContext.prototype.addEventListener = function(type, listener, options) {
        if (type === 'statechange') return;
        return _addEventListener.call(this, type, listener, options);
      };
    })();
  `;
}

// ============ WebRTC 泄露防护 ============

export function webRTCBlockScript(): string {
  return `
    (function() {
      var _RTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = function(config, options) {
        var pc = new _RTCPeerConnection(config, options);
        var _createOffer = pc.createOffer.bind(pc);
        pc.createOffer = function() {
          return _createOffer.apply(pc, arguments).then(function(offer) {
            var sdp = offer.sdp.replace(/a=candidate:.*?\\r\\n/g, '');
            return new RTCSessionDescription({ type: offer.type, sdp: sdp });
          });
        };
        var _createAnswer = pc.createAnswer.bind(pc);
        pc.createAnswer = function() {
          return _createAnswer.apply(pc, arguments).then(function(answer) {
            var sdp = answer.sdp.replace(/a=candidate:.*?\\r\\n/g, '');
            return new RTCSessionDescription({ type: answer.type, sdp: sdp });
          });
        };
        return pc;
      };
      window.RTCPeerConnection.prototype = _RTCPeerConnection.prototype;
      window.RTCPeerConnection.toString = function() { return _RTCPeerConnection.toString(); };
    })();
  `;
}

// ============ 完整脚本生成 ============

export function buildInitScript(profile: DeviceProfile): string {
  // 根据 locale 推断时区
  const tz = profile.locale ? inferTimezone(profile) : 'Asia/Shanghai';
  return [
    navigatorOverride(profile),
    webglOverride(profile),
    canvasOverride(),
    timezoneOverride(tz),
    permissionsOverride(),
    connectionOverride(profile.connection),
    batteryOverride(),
    audioOverride(),
    webRTCBlockScript(),
  ].join('\n');
}

function inferTimezone(profile: DeviceProfile): string {
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
