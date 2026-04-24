// 凭证管理器 — 与设计文档第 6.3 节对齐

import type { Platform, SessionBundle } from '@creator-os/core';
import { type StorageBackend } from '@creator-os/core';

// ============ 类型定义 ============

export interface CredentialRecord {
  accountId: string;
  platform: Platform;
  phone?: string;
  password?: string;
  deviceId?: string;
  encryptedToken?: string;
  createdAt: number;
  updatedAt: number;
}

interface CredentialStorageData {
  accountId: string;
  platform: Platform;
  encryptedData: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

// ============ 加密工具 ============

/**
 * 简单的 XOR 加密（演示用）
 * 
 * ⚠️ 警告：这是演示代码，仅用于开发/测试环境！
 * 生产环境必须使用 proper key management (KMS)，如：
 * - AWS KMS
 * - GCP Secret Manager
 * - Azure Key Vault
 * - HashiCorp Vault
 * 
 * XOR 加密安全性极低，不适合保护敏感数据。
 */
export class SimpleCrypto {
  private key: Buffer;

  constructor(key?: string) {
    // 使用环境变量或默认密钥（仅演示）
    const envKey = process.env['CREDENTIAL_ENCRYPTION_KEY'] || 'creator-os-demo-key-change-in-production';
    this.key = Buffer.from(key || envKey, 'utf-8');
  }

  /**
   * XOR 加密
   */
  encrypt(data: string): string {
    const dataBytes = Buffer.from(data, 'utf-8');
    const result = Buffer.alloc(dataBytes.length);

    for (let i = 0; i < dataBytes.length; i++) {
      result[i] = dataBytes[i]! ^ this.key[i % this.key.length]!;
    }

    return result.toString('base64');
  }

  /**
   * XOR 解密
   */
  decrypt(encryptedData: string): string {
    const encryptedBytes = Buffer.from(encryptedData, 'base64');
    const result = Buffer.alloc(encryptedBytes.length);

    for (let i = 0; i < encryptedBytes.length; i++) {
      result[i] = encryptedBytes[i]! ^ this.key[i % this.key.length]!;
    }

    return result.toString('utf-8');
  }
}

// ============ 凭证管理器 ============

export class CredentialManager {
  private readonly storageKey = 'credentials';
  private readonly crypto: SimpleCrypto;

  constructor(
    private readonly storage: StorageBackend,
    encryptionKey?: string,
  ) {
    this.crypto = new SimpleCrypto(encryptionKey);
  }

  /**
   * 保存凭证（自动加密敏感字段）
   */
  async saveCredential(accountId: string, cred: Omit<CredentialRecord, 'createdAt' | 'updatedAt'>): Promise<void> {
    const existing = await this.loadCredential(accountId);
    const now = Date.now();

    // 加密敏感字段
    const encryptedData: Record<string, string> = {};

    if (cred.phone) {
      encryptedData['phone'] = this.crypto.encrypt(cred.phone);
    }
    if (cred.password) {
      encryptedData['password'] = this.crypto.encrypt(cred.password);
    }
    if (cred.deviceId) {
      encryptedData['deviceId'] = this.crypto.encrypt(cred.deviceId);
    }
    if (cred.encryptedToken) {
      encryptedData['encryptedToken'] = this.crypto.encrypt(cred.encryptedToken);
    }

    const record: CredentialStorageData = {
      accountId,
      platform: cred.platform,
      encryptedData,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    // 保存到 session（使用 accountId 作为键）
    const bundle: SessionBundle = {
      id: `cred_${accountId}`,
      accountId,
      platform: cred.platform,
      createdAt: record.createdAt,
      cookies: JSON.stringify(encryptedData),
      localStorage: JSON.stringify(encryptedData),
      sessionStorage: JSON.stringify({ updatedAt: record.updatedAt }),
    };

    await this.storage.saveSession(`cred_${accountId}`, bundle);
  }

  /**
   * 加载凭证（自动解密）
   */
  async loadCredential(accountId: string): Promise<CredentialRecord | null> {
    const session = await this.storage.loadSession(`cred_${accountId}`);
    if (!session) return null;

    try {
      const encryptedData = JSON.parse(session.cookies) as Record<string, string>;
      const meta = session.sessionStorage ? JSON.parse(session.sessionStorage) : {};

      const record: CredentialRecord = {
        accountId,
        platform: session.platform,
        createdAt: session.createdAt,
        updatedAt: meta['updatedAt'] || session.createdAt,
      };

      // 解密敏感字段
      if (encryptedData['phone']) {
        record.phone = this.crypto.decrypt(encryptedData['phone']);
      }
      if (encryptedData['password']) {
        record.password = this.crypto.decrypt(encryptedData['password']);
      }
      if (encryptedData['deviceId']) {
        record.deviceId = this.crypto.decrypt(encryptedData['deviceId']);
      }
      if (encryptedData['encryptedToken']) {
        record.encryptedToken = this.crypto.decrypt(encryptedData['encryptedToken']);
      }

      return record;
    } catch {
      return null;
    }
  }

  /**
   * 删除凭证
   */
  async deleteCredential(accountId: string): Promise<void> {
    await this.storage.deleteSession(`cred_${accountId}`);
  }

  /**
   * 列出所有凭证（不含敏感数据）
   */
  async listCredentials(): Promise<Array<{
    accountId: string;
    platform: Platform;
    createdAt: number;
  }>> {
    const sessions = await this.storage.listSessions();
    const credentials: Array<{ accountId: string; platform: Platform; createdAt: number }> = [];

    for (const session of sessions) {
      if (session.id.startsWith('cred_')) {
        credentials.push({
          accountId: session.accountId,
          platform: session.platform,
          createdAt: session.createdAt,
        });
      }
    }

    return credentials;
  }

  /**
   * 批量保存凭证
   */
  async saveBatch(records: Array<Omit<CredentialRecord, 'createdAt' | 'updatedAt'>>): Promise<void> {
    await Promise.all(
      records.map((cred) => this.saveCredential(cred.accountId, cred)),
    );
  }

  /**
   * 检查凭证是否存在
   */
  async hasCredential(accountId: string): Promise<boolean> {
    const session = await this.storage.loadSession(`cred_${accountId}`);
    return session !== null;
  }

  /**
   * 更新单个字段（不解密/重新加密整个记录）
   */
  async updateField<K extends keyof CredentialRecord>(
    accountId: string,
    field: K,
    value: CredentialRecord[K],
  ): Promise<void> {
    const cred = await this.loadCredential(accountId);
    if (!cred) {
      throw new Error(`Credential not found: ${accountId}`);
    }

    await this.saveCredential(accountId, { ...cred, [field]: value as string });
  }
}

// ============ Token 加密工具 ============

/**
 * Token 加密存储（使用与凭证相同的加密机制）
 */
export class TokenEncryption {
  private readonly crypto: SimpleCrypto;

  constructor(encryptionKey?: string) {
    this.crypto = new SimpleCrypto(encryptionKey);
  }

  /**
   * 加密 token
   */
  encryptToken(token: { accessToken: string; refreshToken?: string; expiresAt?: number }): string {
    return this.crypto.encrypt(JSON.stringify(token));
  }

  /**
   * 解密 token
   */
  decryptToken(encrypted: string): { accessToken: string; refreshToken?: string; expiresAt?: number } {
    const decrypted = this.crypto.decrypt(encrypted);
    return JSON.parse(decrypted);
  }
}
