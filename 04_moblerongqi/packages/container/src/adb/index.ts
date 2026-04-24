// ADB 控制 — 与设计文档第 18.4-18.10 节对齐
// 提供系统级输入、传感器伪造、短信拦截、媒体注入等能力

import type {
  AppAction,
  AppResult,
  SMSMessage,
  DBDiff,
  HTTPExchange,
} from '@creator-os/core';
import { KEYCODE } from '@creator-os/core';

// ============ ADB 连接管理 ============

export class ADBConnectionPool {
  private readonly connections = new Map<string, ADBClient>();

  async connect(deviceId: string, config: ADBConfig): Promise<ADBClient> {
    if (this.connections.has(deviceId)) {
      const adb = this.connections.get(deviceId)!;
      if (await adb.isConnected()) return adb;
    }
    const adb = await this.establishConnection(config);
    this.connections.set(deviceId, adb);
    adb.onDisconnect(() => this.handleDisconnect(deviceId));
    return adb;
  }

  private async establishConnection(config: ADBConfig): Promise<ADBClient> {
    // USB 本地连接、TCP 直连（云手机）、WebSocket 代理（远程云手机）
    return new ADBClient(config);
  }

  private async handleDisconnect(deviceId: string): Promise<void> {
    let delay = 1_000;
    for (let attempt = 0; attempt < 5; attempt++) {
      await sleep(delay);
      try {
        const adb = this.connections.get(deviceId);
        if (adb && await adb.isConnected()) return;
        delay *= 2;
      } catch {
        delay *= 2;
      }
    }
    this.connections.delete(deviceId);
  }

  async disconnect(deviceId: string): Promise<void> {
    const adb = this.connections.get(deviceId);
    if (adb) {
      await adb.close();
      this.connections.delete(deviceId);
    }
  }
}

export interface ADBConfig {
  type: 'usb' | 'tcp' | 'websocket';
  host?: string;
  port?: number;
  serial?: string;
  wsUrl?: string;
}

export class ADBClient {
  private socket: unknown = null;

  constructor(private readonly config: ADBConfig) {}

  async isConnected(): Promise<boolean> {
    return this.socket !== null;
  }

  async shell(deviceId: string, cmd: string): Promise<string> {
    // 实现 ADB shell 命令
    // 实际应通过 TCP/WebSocket 与 adb server 通信
    throw new Error(`ADB shell not implemented: ${cmd}`);
  }

  async install(deviceId: string, apkPath: string): Promise<void> {
    await this.shell(deviceId, `pm install -r "${apkPath}"`);
  }

  onDisconnect(handler: () => void): void {
    // 注册断开回调
  }

  async close(): Promise<void> {
    this.socket = null;
  }
}

// ============ 输入系统 ============

export class InputSystem {
  constructor(private readonly adbPool: ADBConnectionPool) {}

  async touch(deviceId: string, x: number, y: number): Promise<void> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    await adb.shell(deviceId, `input tap ${x} ${y}`);
  }

  async swipe(
    deviceId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    durationMs: number,
  ): Promise<void> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    await adb.shell(deviceId, `input swipe ${x1} ${y1} ${x2} ${y2} ${durationMs}`);
  }

  async pressButton(
    deviceId: string,
    button: 'home' | 'back' | 'power' | 'volumeup' | 'volumedown',
  ): Promise<void> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    await adb.shell(deviceId, `input keyevent ${KEYCODE[button]}`);
  }

  async inputText(deviceId: string, text: string): Promise<void> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    const escaped = escapeAdbText(text);
    await adb.shell(deviceId, `input text "${escaped}"`);
  }

  async sendKeyseq(deviceId: string, sequence: number[]): Promise<void> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    for (const key of sequence) {
      await adb.shell(deviceId, `input keyevent ${key}`);
    }
  }

  async longPress(deviceId: string, x: number, y: number, durationMs = 1_000): Promise<void> {
    await this.swipe(deviceId, x, y, x, y, durationMs);
  }

  async setClipboard(deviceId: string, text: string): Promise<void> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    await adb.shell(deviceId, `am broadcast -a clipper.set -e text "${escapeAdbText(text)}"`);
  }

  async getClipboard(deviceId: string): Promise<string> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    // 需要通过 Accessibility Service 或 clipper app 实现
    return '';
  }
}

// ============ 传感器伪造 ============

export class SensorSpoofer {
  constructor(private readonly adbPool: ADBConnectionPool) {}

  async setLocation(
    deviceId: string,
    lat: number,
    lon: number,
    alt?: number,
  ): Promise<void> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    await adb.shell(deviceId, 'settings put secure mock_location 1');
    await adb.shell(deviceId, `geo fix ${lon} ${lat}`);
  }

  async setBattery(deviceId: string, level: number, charging: boolean): Promise<void> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    await adb.shell(deviceId, `dumpsys battery set level ${level}`);
    await adb.shell(deviceId, `dumpsys battery set ac ${charging ? 1 : 0}`);
  }
}

// ============ 短信拦截 ============

export class SMSInterceptor {
  constructor(private readonly adbPool: ADBConnectionPool) {}

  async readSMS(
    deviceId: string,
    filter?: { from?: string; after?: Date },
  ): Promise<SMSMessage[]> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    let query = 'content query --uri content://sms --projection _id,address,body,date,read';
    if (filter?.from) query += ` --where "address='${filter.from}'"`;
    if (filter?.after) {
      const ts = filter.after.getTime();
      query += ` --where "date>${ts}"`;
    }
    const output = await adb.shell(deviceId, query);
    return this.parseSMS(output);
  }

  async waitForCode(
    deviceId: string,
    phone: string,
    timeoutMs = 60_000,
  ): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const msgs = await this.readSMS(deviceId, { after: new Date(Date.now() - 60_000) });
      const code = extractCode(msgs, phone);
      if (code) return code;
      await sleep(3_000);
    }
    throw new Error('SMS timeout');
  }

  private parseSMS(output: string): SMSMessage[] {
    // 解析 content query 输出
    return [];
  }
}

// ============ 媒体注入 ============

export class MediaInjector {
  constructor(private readonly adbPool: ADBConnectionPool) {}

  async injectMedia(
    deviceId: string,
    localPath: string,
    destFolder: 'DCIM' | 'Pictures' = 'DCIM',
  ): Promise<string> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    const fileName = localPath.replace(/\\/g, '/').split('/').pop() ?? 'file';
    const remotePath = `/sdcard/${destFolder}/${fileName}`;
    await adb.shell(deviceId, `mkdir -p /sdcard/${destFolder}`);
    // 推送文件到云手机
    await adb.shell(deviceId, `push "${localPath}" "${remotePath}"`);
    // 触发媒体扫描
    await adb.shell(
      deviceId,
      `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://${remotePath}"`,
    );
    return remotePath;
  }

  async prepareMedia(deviceId: string, files: string[]): Promise<string[]> {
    return Promise.all(files.map((f) => this.injectMedia(deviceId, f)));
  }
}

// ============ App 数据访问 ============

export class AppDataAccessor {
  constructor(private readonly adbPool: ADBConnectionPool) {}

  async listPackages(deviceId: string): Promise<string[]> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    const output = await adb.shell(deviceId, 'pm list packages');
    return output
      .split('\n')
      .map((l) => l.replace('package:', '').trim())
      .filter(Boolean);
  }

  async readSharedPrefs(
    deviceId: string,
    packageName: string,
    name: string,
  ): Promise<Record<string, unknown>> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    const xml = await adb.shell(
      deviceId,
      `run-as ${packageName} cat shared_prefs/${name}.xml`,
    );
    return this.parsePrefsXML(xml);
  }

  private parsePrefsXML(xml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    // 简单 XML 解析（可扩展）
    const matches = xml.matchAll(/<string name="([^"]+)">([^<]+)<\/string>/g);
    for (const match of matches) {
      result[match[1]!] = match[2];
    }
    return result;
  }
}

// ============ 系统控制 ============

export class SystemController {
  constructor(private readonly adbPool: ADBConnectionPool) {}

  async grantPermission(
    deviceId: string,
    packageName: string,
    permission: string,
  ): Promise<void> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    await adb.shell(deviceId, `pm grant ${packageName} ${permission}`);
  }

  async setSystemSetting(
    deviceId: string,
    namespace: 'global' | 'secure' | 'system',
    key: string,
    value: string | number,
  ): Promise<void> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    await adb.shell(deviceId, `settings put ${namespace} ${key} ${value}`);
  }

  async setNetworkMode(
    deviceId: string,
    mode: 'wifi' | 'mobile' | 'none',
  ): Promise<void> {
    const adb = await this.adbPool.connect(deviceId, { type: 'tcp' });
    if (mode === 'wifi') {
      await adb.shell(deviceId, 'svc wifi enable');
    } else if (mode === 'mobile') {
      await adb.shell(deviceId, 'svc data enable');
    }
  }
}

// ============ 辅助函数 ============

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeAdbText(text: string): string {
  return text.replace(/[;|`$(){}[\]]/g, '\\$&').replace(/ /g, '%s');
}

function extractCode(messages: SMSMessage[], phone: string): string | null {
  for (const msg of messages) {
    if (msg.from !== phone) continue;
    const match = msg.body.match(/\d{4,6}/);
    if (match) return match[0] ?? null;
  }
  return null;
}
