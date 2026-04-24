import { describe, it, expect, beforeEach } from 'vitest';
import {
  navigatorOverride,
  webglOverride,
  canvasOverride,
  timezoneOverride,
  permissionsOverride,
  connectionOverride,
  batteryOverride,
  audioOverride,
  webRTCBlockScript,
  buildInitScript,
} from '../index.js';
import { deviceProfiles } from '../config/profiles.js';

describe('core/fingerprint', () => {
  describe('navigatorOverride', () => {
    it('应注入 platform 属性', () => {
      const script = navigatorOverride(deviceProfiles.pixel_8);
      expect(script).toContain("'Linux armv8l'");
    });

    it('应注入 hardwareConcurrency', () => {
      const script = navigatorOverride(deviceProfiles.pixel_8);
      expect(script).toContain('hardwareConcurrency');
      expect(script).toContain('8'); // pixel_8 has 8 cores
    });

    it('应注入 webdriver = undefined', () => {
      const script = navigatorOverride(deviceProfiles.pixel_8);
      expect(script).toContain('webdriver');
      expect(script).toContain('undefined');
    });

    it('不同档案应生成不同 platform', () => {
      const androidScript = navigatorOverride(deviceProfiles.pixel_8);
      const iosScript = navigatorOverride(deviceProfiles.iphone_15);
      expect(androidScript).toContain("'Linux armv8l'");
      expect(iosScript).toContain("'iPhone'");
    });
  });

  describe('webglOverride', () => {
    it('应注入 UNMASKED_VENDOR_WEBGL (37445)', () => {
      const script = webglOverride(deviceProfiles.pixel_8);
      expect(script).toContain('37445');
      expect(script).toContain('Google Inc. (ANGLE)');
    });

    it('应注入 UNMASKED_RENDERER_WEBGL (37446)', () => {
      const script = webglOverride(deviceProfiles.pixel_8);
      expect(script).toContain('37446');
      expect(script).toContain('Mali-G78');
    });

    it('iPhone 应使用 Apple GPU', () => {
      const script = webglOverride(deviceProfiles.iphone_15);
      expect(script).toContain('Apple GPU');
    });

    it('Galaxy S24 应使用 Mali-G715', () => {
      const script = webglOverride(deviceProfiles.galaxy_s24);
      expect(script).toContain('Mali-G715');
    });

    it('应覆盖 WebGL1 和 WebGL2', () => {
      const script = webglOverride(deviceProfiles.pixel_8);
      expect(script).toContain('WebGLRenderingContext');
      expect(script).toContain('WebGL2RenderingContext');
    });
  });

  describe('canvasOverride', () => {
    it('应注入 toDataURL override', () => {
      const script = canvasOverride();
      expect(script).toContain('toDataURL');
      expect(script).toContain('putImageData');
    });

    it('应注入 toBlob override', () => {
      const script = canvasOverride();
      expect(script).toContain('toBlob');
    });

    it('噪声值应为 0.00005', () => {
      const script = canvasOverride();
      expect(script).toContain('0.00005');
    });
  });

  describe('timezoneOverride', () => {
    it('应覆盖 getTimezoneOffset', () => {
      const script = timezoneOverride('Asia/Shanghai');
      expect(script).toContain('getTimezoneOffset');
      expect(script).toContain('-480'); // Asia/Shanghai is UTC+8
    });

    it('Asia/Hong_Kong 应为 -480 分钟', () => {
      const script = timezoneOverride('Asia/Hong_Kong');
      expect(script).toContain('-480');
    });

    it('Asia/Tokyo 应为 -540 分钟', () => {
      const script = timezoneOverride('Asia/Tokyo');
      expect(script).toContain('-540');
    });

    it('America/New_York 应为 +300 分钟', () => {
      const script = timezoneOverride('America/New_York');
      expect(script).toContain('300');
    });

    it('应覆盖 Intl.DateTimeFormat', () => {
      const script = timezoneOverride('Asia/Shanghai');
      expect(script).toContain('DateTimeFormat');
    });
  });

  describe('permissionsOverride', () => {
    it('应覆盖 notifications query', () => {
      const script = permissionsOverride();
      expect(script).toContain('notifications');
      expect(script).toContain('state');
    });
  });

  describe('connectionOverride', () => {
    it('应注入默认 4g 参数', () => {
      const script = connectionOverride();
      expect(script).toContain("'4g'");
      expect(script).toContain('downlink');
    });

    it('应支持自定义连接参数', () => {
      const script = connectionOverride({ effectiveType: '3g', downlink: 5, rtt: 200 });
      expect(script).toContain("'3g'");
      expect(script).toContain('5');
      expect(script).toContain('200');
    });
  });

  describe('batteryOverride', () => {
    it('应覆盖 getBattery', () => {
      const script = batteryOverride();
      expect(script).toContain('getBattery');
      expect(script).toContain('0.85');
      expect(script).toContain('charging');
    });
  });

  describe('audioOverride', () => {
    it('应过滤 statechange 事件', () => {
      const script = audioOverride();
      expect(script).toContain('statechange');
    });
  });

  describe('webRTCBlockScript', () => {
    it('应拦截 ICE candidates', () => {
      const script = webRTCBlockScript();
      expect(script).toContain('RTCPeerConnection');
      expect(script).toContain('a=candidate');
    });

    it('应同时处理 createOffer 和 createAnswer', () => {
      const script = webRTCBlockScript();
      expect(script).toContain('createOffer');
      expect(script).toContain('createAnswer');
    });
  });

  describe('buildInitScript', () => {
    it('应组合所有 override 函数', () => {
      const script = buildInitScript(deviceProfiles.pixel_8);
      expect(script).toContain('platform');
      expect(script).toContain('37445'); // WebGL
      expect(script).toContain('toDataURL'); // Canvas
      expect(script).toContain('getTimezoneOffset'); // Timezone
      expect(script).toContain('RTCPeerConnection'); // WebRTC
    });

    it('pixel_8 档案应包含正确的时区推断', () => {
      const script = buildInitScript(deviceProfiles.pixel_8);
      // zh-CN locale -> Asia/Shanghai -> -480
      expect(script).toContain('-480');
    });

    it('应支持无 connection 的 profile', () => {
      const minimal = {
        ...deviceProfiles.pixel_8,
        connection: undefined,
      };
      const script = buildInitScript(minimal);
      expect(script).toContain('platform');
    });

    it('每个 override 都应在脚本中出现', () => {
      const allOverrides = [
        'navigator',
        'WebGLRenderingContext',
        'HTMLCanvasElement',
        'DateTimeFormat',
        'permissions',
        'connection',
        'getBattery',
        'AudioContext',
        'RTCPeerConnection',
      ];
      const script = buildInitScript(deviceProfiles.pixel_8);
      for (const key of allOverrides) {
        expect(script).toContain(key);
      }
    });
  });
});
