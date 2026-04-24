// 存储后端抽象 — 与设计文档第 21.3 节对齐

import type { SessionBundle, SessionMeta } from '../types/index.js';

export interface CredentialEntry {
  platform: string;
  phone: string;
  password: string;
  token?: string;
  createdAt: number;
}

export interface StorageBackend {
  saveSession(id: string, data: SessionBundle): Promise<void>;
  loadSession(id: string): Promise<SessionBundle | null>;
  listSessions(): Promise<SessionMeta[]>;
  deleteSession(id: string): Promise<void>;
  saveCredential(platform: string, phone: string, password: string, token?: string): Promise<void>;
  loadCredential(platform: string): Promise<CredentialEntry | null>;
  deleteCredential(platform: string): Promise<void>;
}

// ============ LocalFS 适配器 ============

import { readFile, writeFile, readdir, unlink, mkdir, stat } from 'fs/promises';
import { join, basename } from 'path';

export class LocalFSStorage implements StorageBackend {
  constructor(private baseDir: string) {}

  private sessionPath(id: string): string {
    return join(this.baseDir, `${id}.json`);
  }

  private metaPath(id: string): string {
    return join(this.baseDir, `${id}.meta.json`);
  }

  async saveSession(id: string, data: SessionBundle): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
    await writeFile(this.sessionPath(id), JSON.stringify(data, null, 2), 'utf-8');
    await writeFile(
      this.metaPath(id),
      JSON.stringify(
        {
          id,
          accountId: data.accountId,
          platform: data.platform,
          createdAt: data.createdAt,
          lastAccessedAt: Date.now(),
          size: 0,
        },
        null,
        2,
      ),
      'utf-8',
    );
  }

  async loadSession(id: string): Promise<SessionBundle | null> {
    try {
      const raw = await readFile(this.sessionPath(id), 'utf-8');
      return JSON.parse(raw) as SessionBundle;
    } catch {
      return null;
    }
  }

  async listSessions(): Promise<SessionMeta[]> {
    try {
      const files = await readdir(this.baseDir);
      const metas = await Promise.all(
        files
          .filter((f) => f.endsWith('.meta.json'))
          .map(async (f) => {
            const raw = await readFile(join(this.baseDir, f), 'utf-8');
            return JSON.parse(raw) as SessionMeta;
          }),
      );
      return metas;
    } catch {
      return [];
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      await unlink(this.sessionPath(id));
      await unlink(this.metaPath(id));
    } catch {
      // ignore
    }
  }

  private credPath(platform: string): string {
    return join(this.baseDir, '..', 'credentials', `${platform}.json`);
  }

  async saveCredential(platform: string, phone: string, password: string, token?: string): Promise<void> {
    const credDir = join(this.baseDir, '..', 'credentials');
    await mkdir(credDir, { recursive: true });
    await writeFile(
      this.credPath(platform),
      JSON.stringify({ platform, phone, password, token, createdAt: Date.now() }, null, 2),
      'utf-8',
    );
  }

  async loadCredential(platform: string): Promise<CredentialEntry | null> {
    try {
      const raw = await readFile(this.credPath(platform), 'utf-8');
      return JSON.parse(raw) as CredentialEntry;
    } catch {
      return null;
    }
  }

  async deleteCredential(platform: string): Promise<void> {
    try {
      await unlink(this.credPath(platform));
    } catch {
      // ignore
    }
  }
}
