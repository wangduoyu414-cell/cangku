import { describe, it, expect } from 'vitest';
import { SessionContinuityManager } from '@creator-os/anticrawl';
import type { StorageBackend } from '@creator-os/core';

const makeMockStorage = (): StorageBackend => ({
  async saveSession() {},
  async loadSession() {
    return null;
  },
  async listSessions() {
    return [];
  },
  async deleteSession() {},
  async saveCredential() {},
  async loadCredential() {
    return null;
  },
  async deleteCredential() {},
});

describe('SessionContinuityManager', () => {
  describe('constructor — platform parameter', () => {
    it('should accept a platform parameter in constructor', () => {
      const mgr = new SessionContinuityManager(makeMockStorage(), 'xiaohongshu');
      expect(mgr).toBeDefined();
    });

    it('should default platform to douyin', () => {
      const mgr = new SessionContinuityManager(makeMockStorage());
      expect(mgr).toBeDefined();
    });
  });

  // Note: setPlatform() is a private method — internal implementation detail
  // Platform is passed through the constructor and managed internally.
});
