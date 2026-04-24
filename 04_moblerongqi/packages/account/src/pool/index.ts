// 账号池与状态机 — 与设计文档第 6.1-6.2 节对齐

import type { Account, AccountGroup, AccountState } from '@creator-os/core';

export type StateTransition = {
  from: AccountState;
  to: AccountState;
  reason?: string;
};

export const VALID_TRANSITIONS: Record<AccountState, AccountState[]> = {
  new: ['active', 'banned'],
  active: ['cooling', 'rate_limited', 'captcha', 'manual_intervention', 'banned'],
  cooling: ['active', 'banned'],
  rate_limited: ['active', 'banned'],
  captcha: ['active', 'manual_intervention', 'banned'],
  manual_intervention: ['active', 'banned'],
  banned: [], // 终态
};

export function canTransition(from: AccountState, to: AccountState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export class AccountStateMachine {
  private account: Account;

  constructor(account: Account) {
    this.account = account;
  }

  get state(): AccountState {
    return this.account.state;
  }

  transition(to: AccountState, reason?: string): Account {
    if (!canTransition(this.account.state, to)) {
      throw new Error(
        `Invalid transition: ${this.account.state} -> ${to} (reason: ${reason ?? 'none'})`,
      );
    }
    this.account.state = to;
    this.account.stateChangedAt = Date.now();
    return this.account;
  }

  markCooling(cooldownMs: number): Account {
    this.account.cooldownUntil = Date.now() + cooldownMs;
    return this.transition('cooling', 'Rate limit exceeded');
  }

  markRateLimited(cooldownMs?: number): Account {
    this.transition('rate_limited', 'Rate limited by platform');
    if (cooldownMs) {
      this.account.cooldownUntil = Date.now() + cooldownMs;
    }
    return this.account;
  }

  markManualIntervention(reason: string): Account {
    return this.transition('manual_intervention', reason);
  }

  markCaptcha(): Account {
    return this.transition('captcha', 'CAPTCHA triggered');
  }

  markBanned(reason: string): Account {
    return this.transition('banned', reason);
  }

  resolve(): Account {
    if (this.account.state === 'cooling' && this.account.cooldownUntil) {
      if (Date.now() >= this.account.cooldownUntil) {
        this.account.cooldownUntil = undefined;
        return this.transition('active', 'Cooldown complete');
      }
    }
    return this.account;
  }

  getAccount(): Account {
    return { ...this.account };
  }
}

// 账号分组
export class AccountGroupManager {
  private readonly groups = new Map<string, AccountGroup>();

  addGroup(group: AccountGroup): void {
    this.groups.set(group.id, group);
  }

  getGroup(id: string): AccountGroup | undefined {
    return this.groups.get(id);
  }

  listGroups(): AccountGroup[] {
    return Array.from(this.groups.values());
  }

  getAccountGroup(accountId: string): AccountGroup | undefined {
    for (const group of this.groups.values()) {
      if (group.accounts.includes(accountId)) return group;
    }
    return undefined;
  }
}
