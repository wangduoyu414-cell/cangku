import { describe, it, expect, afterEach } from 'vitest';
import { LocalFSStorage } from '@creator-os/core';
import { rm, mkdir } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'test-storage-temp');

async function cleanDir() {
  try {
    await rm(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

describe('LocalFSStorage — credential methods', () => {
  let storage: LocalFSStorage;

  afterEach(async () => {
    await cleanDir();
  });

  describe('saveCredential / loadCredential', () => {
    it('should save and load a credential', async () => {
      storage = new LocalFSStorage(TEST_DIR);
      await mkdir(TEST_DIR, { recursive: true });

      await storage.saveCredential('douyin', '13800138000', 'password123', 'access_token_xyz');
      const cred = await storage.loadCredential('douyin');

      expect(cred).not.toBeNull();
      expect(cred!.platform).toBe('douyin');
      expect(cred!.phone).toBe('13800138000');
      expect(cred!.password).toBe('password123');
      expect(cred!.token).toBe('access_token_xyz');
    });

    it('should return null for non-existent credential', async () => {
      storage = new LocalFSStorage(TEST_DIR);
      await mkdir(TEST_DIR, { recursive: true });

      const cred = await storage.loadCredential('nonexistent');
      expect(cred).toBeNull();
    });

    it('should overwrite existing credential', async () => {
      storage = new LocalFSStorage(TEST_DIR);
      await mkdir(TEST_DIR, { recursive: true });

      await storage.saveCredential('douyin', '13800138000', 'pw1');
      await storage.saveCredential('douyin', '13900139000', 'pw2');

      const cred = await storage.loadCredential('douyin');
      expect(cred!.phone).toBe('13900139000');
      expect(cred!.password).toBe('pw2');
    });
  });

  describe('deleteCredential', () => {
    it('should delete a credential', async () => {
      storage = new LocalFSStorage(TEST_DIR);
      await mkdir(TEST_DIR, { recursive: true });

      await storage.saveCredential('douyin', '13800138000', 'pw');
      await storage.deleteCredential('douyin');

      const cred = await storage.loadCredential('douyin');
      expect(cred).toBeNull();
    });

    it('should not throw when deleting non-existent credential', async () => {
      storage = new LocalFSStorage(TEST_DIR);
      await mkdir(TEST_DIR, { recursive: true });

      await expect(storage.deleteCredential('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('credential and session isolation', () => {
    it('should store credentials separately from sessions', async () => {
      storage = new LocalFSStorage(TEST_DIR);
      await mkdir(TEST_DIR, { recursive: true });

      await storage.saveCredential('douyin', '13800138000', 'pw');
      await storage.saveSession('session_001', {
        id: 'session_001',
        accountId: 'acc_001',
        platform: 'douyin',
        createdAt: Date.now(),
        cookies: '[]',
        localStorage: '{}',
        sessionStorage: '{}',
      });

      const cred = await storage.loadCredential('douyin');
      const session = await storage.loadSession('session_001');

      expect(cred).not.toBeNull();
      expect(session).not.toBeNull();
      expect(cred!.phone).toBe('13800138000');
    });
  });
});

describe('LocalFSStorage — session methods', () => {
  let storage: LocalFSStorage;

  afterEach(async () => {
    await cleanDir();
  });

  describe('saveSession / loadSession', () => {
    it('should save and load a session', async () => {
      storage = new LocalFSStorage(TEST_DIR);
      await mkdir(TEST_DIR, { recursive: true });

      const bundle = {
        id: 'sess_001',
        accountId: 'acc_001',
        platform: 'douyin' as const,
        createdAt: Date.now(),
        cookies: '[]',
        localStorage: '{}',
        sessionStorage: '{}',
      };

      await storage.saveSession('sess_001', bundle);
      const loaded = await storage.loadSession('sess_001');

      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe('sess_001');
    });

    it('should return null for non-existent session', async () => {
      storage = new LocalFSStorage(TEST_DIR);
      await mkdir(TEST_DIR, { recursive: true });

      const loaded = await storage.loadSession('nonexistent');
      expect(loaded).toBeNull();
    });

    it('should write a meta file alongside session', async () => {
      storage = new LocalFSStorage(TEST_DIR);
      await mkdir(TEST_DIR, { recursive: true });

      const bundle = {
        id: 'sess_002',
        accountId: 'acc_002',
        platform: 'xiaohongshu' as const,
        createdAt: Date.now(),
        cookies: '[]',
        localStorage: '{}',
        sessionStorage: '{}',
      };

      await storage.saveSession('sess_002', bundle);
      const metas = await storage.listSessions();

      expect(metas.some((m) => m.id === 'sess_002')).toBe(true);
    });
  });

  describe('listSessions', () => {
    it('should list all sessions', async () => {
      storage = new LocalFSStorage(TEST_DIR);
      await mkdir(TEST_DIR, { recursive: true });

      for (let i = 1; i <= 3; i++) {
        await storage.saveSession(`sess_${i}`, {
          id: `sess_${i}`,
          accountId: `acc_${i}`,
          platform: 'douyin',
          createdAt: Date.now(),
          cookies: '[]',
          localStorage: '{}',
          sessionStorage: '{}',
        });
      }

      const sessions = await storage.listSessions();
      expect(sessions.length).toBe(3);
    });
  });

  describe('deleteSession', () => {
    it('should delete session and meta file', async () => {
      storage = new LocalFSStorage(TEST_DIR);
      await mkdir(TEST_DIR, { recursive: true });

      await storage.saveSession('sess_del', {
        id: 'sess_del',
        accountId: 'acc_del',
        platform: 'douyin',
        createdAt: Date.now(),
        cookies: '[]',
        localStorage: '{}',
        sessionStorage: '{}',
      });

      await storage.deleteSession('sess_del');
      const loaded = await storage.loadSession('sess_del');
      expect(loaded).toBeNull();
    });
  });
});
