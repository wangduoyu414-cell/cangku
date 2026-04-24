// REST API — Express-based HTTP layer for CreatorOS
// Aligns with design doc §10.1

import express, { type Request, type Response, type NextFunction } from 'express';
import 'dotenv/config';

import type {
  ContainerConfig,
  ContainerSnapshot,
  BrowserAction,
  AppAction,
  BrowserResult,
  AppResult,
  Account,
  AccountState,
  Task,
  TaskStatus,
  ActionType,
  Action,
} from '@creator-os/core';

// Import container abstractions (BrowserContainer used as a stub for the in-memory store)
import { BrowserContainer } from '@creator-os/container';
// Import account state machine
import { AccountStateMachine } from '@creator-os/account';
// Import creator economic layer
import { RevenueAggregator, GrowthAnalyzer } from '@creator-os/platform';
// Import scheduler
import { TaskScheduler } from '@creator-os/scheduler';
// Import audit logger
import { AuditLogger, type AuditEvent } from '@creator-os/monitor';

// ============ In-memory stores (replace with DB/persistence in production) ============

const containerStore = new Map<string, BrowserContainer>();
const accountStore = new Map<string, Account>();
const taskStore = new Map<string, Task>();

let containerCounter = 0;
let accountCounter = 0;
let taskCounter = 0;

// Shared instances for creator economic layer
const revenueAggregator = new RevenueAggregator();
const growthAnalyzer = new GrowthAnalyzer();
const scheduler = new TaskScheduler();
const auditLogger = new AuditLogger();
scheduler.setAccountStore(accountStore);

// ============ Router factory ============

export function createRestRouter(): express.Router {
  const router = express.Router();

  // ---------- Audit logging middleware ----------
  router.use((req: Request, _res: Response, next: NextFunction) => {
    const start = Date.now();
    _res.on('finish', () => {
      auditLogger.log({
        type: 'api_request',
        method: req.method,
        path: req.path,
        statusCode: _res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  });

  // ---------- Audit endpoint ----------
  router.get('/audit', (req: Request, res: Response) => {
    const type = req.query['type'] as AuditEvent['type'] | undefined;
    const accountId = req.query['accountId'] as string | undefined;
    const containerId = req.query['containerId'] as string | undefined;
    const since = req.query['since'] ? Number(req.query['since']) : undefined;
    const until = req.query['until'] ? Number(req.query['until']) : undefined;
    const limit = req.query['limit'] ? Number(req.query['limit']) : 100;

    const entries = auditLogger.query({ type, accountId, containerId, since, until, limit });
    res.json({ entries, count: entries.length });
  });

  // ---------- Health ----------
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // ---------- Containers ----------

  // POST /containers — create a container
  router.post('/containers', async (req: Request, res: Response) => {
    try {
      const config = req.body as ContainerConfig;
      if (!config?.id) {
        config.id = `container-${++containerCounter}`;
      }
      const container = new BrowserContainer(config.id, config);
      await container.start();
      containerStore.set(config.id, container);

      auditLogger.log({
        type: 'container_started',
        containerId: config.id,
        platform: config.platform,
      });

      const snapshot = container.getSnapshot();
      res.status(201).json(snapshot);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to create container', detail: message });
    }
  });

  // GET /containers — list all containers
  router.get('/containers', (_req: Request, res: Response) => {
    const snapshots: ContainerSnapshot[] = [];
    for (const container of containerStore.values()) {
      snapshots.push(container.getSnapshot());
    }
    res.json(snapshots);
  });

  // GET /containers/:id — get container snapshot
  router.get('/containers/:id', (req: Request, res: Response) => {
    const container = containerStore.get(req.params.id);
    if (!container) {
      res.status(404).json({ error: 'Container not found' });
      return;
    }
    res.json(container.getSnapshot());
  });

  // DELETE /containers/:id — stop and release container
  router.delete('/containers/:id', async (req: Request, res: Response) => {
    const container = containerStore.get(req.params.id);
    if (!container) {
      res.status(404).json({ error: 'Container not found' });
      return;
    }
    await container.stop();
    const id = req.params.id;
    containerStore.delete(id);
    auditLogger.log({ type: 'container_stopped', containerId: id });
    res.json({ id, deleted: true });
  });

  // POST /containers/:id/actions — execute a BrowserAction or AppAction
  router.post('/containers/:id/actions', async (req: Request, res: Response) => {
    const container = containerStore.get(req.params.id);
    if (!container) {
      res.status(404).json({ error: 'Container not found' });
      return;
    }

    const action = req.body;
    if (!action || !action['type']) {
      res.status(400).json({ error: 'Missing action type in request body' });
      return;
    }

    const browserActionTypes = ['goto', 'click', 'type', 'scroll', 'screenshot', 'evaluate', 'waitForSelector'];
    const appActionTypes = ['tap', 'swipe', 'input', 'press', 'deep_link'];

    let result: BrowserResult | AppResult;

    if (browserActionTypes.includes(action['type'] as string)) {
      result = await container.execute(action as BrowserAction);
    } else if (appActionTypes.includes(action['type'] as string)) {
      result = await container.executeApp(action as AppAction);
    } else {
      res.status(400).json({ error: `Unknown action type: ${action['type']}` });
      return;
    }

    res.json(result);
  });

  // ---------- Accounts ----------

  // GET /accounts — list accounts
  router.get('/accounts', (_req: Request, res: Response) => {
    res.json(Array.from(accountStore.values()));
  });

  // POST /accounts — register an account
  router.post('/accounts', (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<Account>;
      if (!body.id) {
        body.id = `account-${++accountCounter}`;
      }
      if (!body.state) {
        body.state = 'new';
      }
      if (!body.stateChangedAt) {
        body.stateChangedAt = Date.now();
      }
      const account = body as Account;
      accountStore.set(account.id, account);
      res.status(201).json(account);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to register account', detail: message });
    }
  });

  // PATCH /accounts/:id — update account state
  router.patch('/accounts/:id', (req: Request, res: Response) => {
    const account = accountStore.get(req.params.id);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const body = req.body as Partial<Account>;
    const sm = new AccountStateMachine(account);

    if (body.state) {
      try {
        const from = account.state;
        sm.transition(body.state as AccountState, (req.body as { reason?: string })['reason']);
        auditLogger.log({
          type: 'account_state_change',
          accountId: account.id,
          from,
          to: account.state,
          reason: (req.body as { reason?: string })['reason'],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(400).json({ error: 'Invalid state transition', detail: message });
        return;
      }
    }

    if (body.dailyRequestCount !== undefined) {
      account.dailyRequestCount = body.dailyRequestCount;
    }
    if (body.lastError !== undefined) {
      account.lastError = body.lastError;
    }
    if (body.cooldownUntil !== undefined) {
      account.cooldownUntil = body.cooldownUntil;
    }

    accountStore.set(account.id, account);
    res.json(account);
  });

  // ---------- Tasks ----------

  // GET /tasks — list tasks
  router.get('/tasks', (req: Request, res: Response) => {
    const status = req.query['status'] as TaskStatus | undefined;
    const tasks = Array.from(taskStore.values()).filter((t) => !status || t.status === status);
    res.json(tasks);
  });

  // POST /tasks — enqueue a task via the scheduler (rate-limit aware)
  router.post('/tasks', (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<Task>;
      const accountId = body.accountId;
      const action: Action = {
        type: body.type ?? 'scrape_posts',
        params: body.params ?? {},
        priority: body.priority ?? 0,
        maxRetries: body.maxRetries,
        retryable: body.retryable,
      };
      const task = scheduler.enqueue(action, accountId, body.containerId, body.priority);
      taskStore.set(task.id, task);
      res.status(201).json(task);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('rate limit')) {
        res.status(429).json({ error: 'Rate limit exceeded', detail: message });
      } else {
        res.status(500).json({ error: 'Failed to enqueue task', detail: message });
      }
    }
  });

  // DELETE /tasks/:id — cancel a task
  router.delete('/tasks/:id', (req: Request, res: Response) => {
    const task = taskStore.get(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    if (task.status === 'completed' || task.status === 'failed') {
      res.status(409).json({ error: `Cannot cancel a task that is already ${task.status}` });
      return;
    }
    task.status = 'cancelled';
    task.completedAt = Date.now();
    taskStore.set(task.id, task);
    res.json({ id: task.id, status: 'cancelled' });
  });

  // GET /results — fetch completed task results (design §10.1)
  router.get('/results', (req: Request, res: Response) => {
    const accountId = req.query['accountId'] as string | undefined;
    const containerId = req.query['containerId'] as string | undefined;

    const results = Array.from(taskStore.values())
      .filter((t) => t.status === 'completed' && !!t.result)
      .filter((t) => !accountId || t.accountId === accountId)
      .filter((t) => !containerId || t.containerId === containerId)
      .map((t) => ({
        id: t.id,
        type: t.type,
        accountId: t.accountId,
        containerId: t.containerId,
        result: t.result,
        completedAt: t.completedAt,
      }));

    res.json({ results, count: results.length });
  });

  // GET /revenue — cross-platform revenue aggregation (design §10.1, §17)
  router.get('/revenue', (req: Request, res: Response) => {
    const accountIds = (req.query['accountIds'] as string | undefined)
      ?.split(',')
      .filter(Boolean) ?? [];

    const aggregated = revenueAggregator.aggregate(accountIds);
    res.json(aggregated);
  });

  // GET /analytics — content performance analytics (design §10.1, §17)
  router.get('/analytics', (req: Request, res: Response) => {
    const platform = req.query['platform'] as string | undefined;
    const accountId = req.query['accountId'] as string | undefined;

    // Aggregate task statistics by platform
    const taskStats: Record<string, { total: number; completed: number; failed: number }> = {};
    for (const task of taskStore.values()) {
      const key = platform ? `${task.type}_${platform}` : task.type;
      if (!taskStats[key]) {
        taskStats[key] = { total: 0, completed: 0, failed: 0 };
      }
      taskStats[key].total++;
      if (task.status === 'completed') taskStats[key].completed++;
      if (task.status === 'failed') taskStats[key].failed++;
    }

    // Scheduler stats
    const schedulerStats = scheduler.getStats();

    // ROI score if accountId provided
    let roiScore = null;
    if (accountId) {
      roiScore = growthAnalyzer.computeROI(accountId, 0);
    }

    res.json({
      taskStats,
      scheduler: schedulerStats,
      roi: roiScore,
    });
  });

  // POST /containers/:id/exec — generic action array execution (design §10.1)
  router.post('/containers/:id/exec', async (req: Request, res: Response) => {
    const container = containerStore.get(req.params.id);
    if (!container) {
      res.status(404).json({ error: 'Container not found' });
      return;
    }

    const actions = req.body['actions'] as BrowserAction[] | undefined;
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      res.status(400).json({ error: 'Request body must contain a non-empty actions array' });
      return;
    }

    const results: BrowserResult[] = [];
    for (const action of actions) {
      const result = await container.execute(action);
      results.push(result);
      if (!result.success) break; // Stop on first failure
    }

    res.json({
      actionCount: actions.length,
      executed: results.length,
      results,
    });
  });

  // POST /accounts/:id/login — trigger account login (design §10.1)
  router.post('/accounts/:id/login', async (req: Request, res: Response) => {
    const account = accountStore.get(req.params.id);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    // Login requires a running container bound to this account
    const containerId = req.body['containerId'] as string | undefined;
    if (!containerId) {
      res.status(400).json({ error: 'containerId is required in request body' });
      return;
    }

    const container = containerStore.get(containerId);
    if (!container) {
      res.status(404).json({ error: 'Container not found' });
      return;
    }

    // TODO: Wire in LoginManager.ensureLoggedIn() with actual browser page
    // For now, transition the account to active state
    try {
      const sm = new AccountStateMachine(account);
      sm.transition('active');
      accountStore.set(account.id, account);
      res.json({ id: account.id, state: account.state, loggedIn: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: 'Login failed', detail: message });
    }
  });

  return router;
}

// Re-export types for consumers
export type { BrowserAction, AppAction, BrowserResult, AppResult };
