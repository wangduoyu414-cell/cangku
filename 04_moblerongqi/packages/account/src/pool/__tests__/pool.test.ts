import { describe, it, expect } from 'vitest';
import {
  AccountStateMachine,
  VALID_TRANSITIONS,
  canTransition,
} from '@creator-os/account';
import type { Account } from '@creator-os/core';

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc_001',
    platform: 'douyin',
    state: 'active',
    stateChangedAt: Date.now(),
    dailyRequestCount: 0,
    ...overrides,
  };
}

describe('AccountStateMachine', () => {
  describe('VALID_TRANSITIONS', () => {
    it('should allow active -> rate_limited', () => {
      expect(canTransition('active', 'rate_limited')).toBe(true);
    });

    it('should allow active -> manual_intervention', () => {
      expect(canTransition('active', 'manual_intervention')).toBe(true);
    });

    it('should allow rate_limited -> active (resolve)', () => {
      expect(canTransition('rate_limited', 'active')).toBe(true);
    });

    it('should allow manual_intervention -> active (resolve)', () => {
      expect(canTransition('manual_intervention', 'active')).toBe(true);
    });

    it('should NOT allow new -> rate_limited', () => {
      expect(canTransition('new', 'rate_limited')).toBe(false);
    });

    it('should NOT allow banned -> anything', () => {
      expect(canTransition('banned', 'active')).toBe(false);
      expect(canTransition('banned', 'rate_limited')).toBe(false);
    });
  });

  describe('markRateLimited()', () => {
    it('should transition account to rate_limited state', () => {
      const account = makeAccount({ state: 'active' });
      const sm = new AccountStateMachine(account);
      const result = sm.markRateLimited();
      expect(result.state).toBe('rate_limited');
    });

    it('should optionally set cooldownUntil', () => {
      const account = makeAccount({ state: 'active' });
      const sm = new AccountStateMachine(account);
      sm.markRateLimited(60_000);
      expect(account.cooldownUntil).toBeGreaterThan(Date.now());
    });

    it('should NOT transition from banned', () => {
      const account = makeAccount({ state: 'banned' });
      const sm = new AccountStateMachine(account);
      expect(() => sm.markRateLimited()).toThrow();
    });
  });

  describe('markManualIntervention()', () => {
    it('should transition account to manual_intervention state', () => {
      const account = makeAccount({ state: 'active' });
      const sm = new AccountStateMachine(account);
      const result = sm.markManualIntervention('Account flagged by system');
      expect(result.state).toBe('manual_intervention');
    });

    it('should NOT transition from new state', () => {
      const account = makeAccount({ state: 'new' });
      const sm = new AccountStateMachine(account);
      expect(() => sm.markManualIntervention('reason')).toThrow();
    });
  });

  describe('resolve()', () => {
    it('should restore cooling account to active when cooldown expires', () => {
      const account = makeAccount({
        state: 'cooling',
        cooldownUntil: Date.now() - 1000,
      });
      const sm = new AccountStateMachine(account);
      sm.resolve();
      expect(account.state).toBe('active');
      expect(account.cooldownUntil).toBeUndefined();
    });

    it('should NOT restore cooling account before cooldown expires', () => {
      const account = makeAccount({
        state: 'cooling',
        cooldownUntil: Date.now() + 60_000,
      });
      const sm = new AccountStateMachine(account);
      const result = sm.resolve();
      expect(result.state).toBe('cooling');
    });
  });

  describe('markBanned()', () => {
    it('should transition to banned from any non-banned state', () => {
      const states = ['new', 'active', 'cooling', 'rate_limited', 'captcha', 'manual_intervention'] as const;
      for (const state of states) {
        const account = makeAccount({ state });
        const sm = new AccountStateMachine(account);
        const result = sm.markBanned('Policy violation');
        expect(result.state).toBe('banned');
      }
    });
  });

  describe('getAccount()', () => {
    it('should return a copy of the account', () => {
      const account = makeAccount();
      const sm = new AccountStateMachine(account);
      const copy = sm.getAccount();
      copy.state = 'banned';
      expect(account.state).toBe('active');
    });
  });
});
