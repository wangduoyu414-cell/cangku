// Monitor package — metrics collection, alerting, and observability
// Aligns with design doc §12.1 and §12.2

import type {
  ContainerMetrics,
  AccountMetrics,
  PlatformMetrics,
  ContainerSnapshot,
  Account,
  Task,
  ProxyConfig,
} from '@creator-os/core';

// ============ Health Status ============

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

// ============ Alert Types ============

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  source: 'platform' | 'account' | 'container' | 'proxy' | 'system';
  message: string;
  timestamp: number;
  resolved: boolean;
}

// ============ Metrics Collector ============

export interface MetricsSnapshot {
  timestamp: number;
  containers: ContainerMetricsSummary[];
  accounts: AccountMetricsSummary[];
  scheduler: SchedulerSnapshot;
  alerts: Alert[];
  health: HealthStatus;
}

export interface ContainerMetricsSummary {
  id: string;
  state: string;
  uptime: number;
  actionCount: number;
  lastError?: string;
}

export interface AccountMetricsSummary {
  id: string;
  platform: string;
  state: string;
  todayRequests: number;
  dailyLimit: number;
}

export interface SchedulerSnapshot {
  pending: number;
  running: number;
  completed: number;
}

export class MetricsCollector {
  private readonly containerSnapshots = new Map<string, ContainerSnapshot>();
  private readonly accountSnapshots = new Map<string, Account>();
  private readonly taskSnapshots: Task[] = [];
  private readonly alerts: Alert[] = [];
  private alertIdCounter = 0;

  /** Record a container snapshot from the container pool */
  recordContainer(snapshot: ContainerSnapshot): void {
    this.containerSnapshots.set(snapshot.id, snapshot);
  }

  /** Record an account snapshot */
  recordAccount(account: Account): void {
    this.accountSnapshots.set(account.id, account);
  }

  /** Record completed/failed tasks for analytics */
  recordTask(task: Task): void {
    if (task.status === 'completed' || task.status === 'failed') {
      this.taskSnapshots.push(task);
      // Keep last 1000 tasks in memory
      if (this.taskSnapshots.length > 1000) {
        this.taskSnapshots.shift();
      }
    }
  }

  /** Collect a full metrics snapshot */
  snapshot(): MetricsSnapshot {
    const containerList = Array.from(this.containerSnapshots.values());
    const accountList = Array.from(this.accountSnapshots.values());

    const containerSummaries: ContainerMetricsSummary[] = containerList.map((c) => ({
      id: c.id,
      state: c.state,
      uptime: c.uptime,
      actionCount: 0, // Populated by getSnapshot() call in container
      lastError: undefined,
    }));

    const accountSummaries: AccountMetricsSummary[] = accountList.map((a) => ({
      id: a.id,
      platform: a.platform,
      state: a.state,
      todayRequests: a.dailyRequestCount,
      dailyLimit: 1000, // Default; actual from AccountGroup
    }));

    // Compute scheduler stats from tasks
    const pending = this.taskSnapshots.filter((t) => t.status === 'pending').length;
    const running = this.taskSnapshots.filter((t) => t.status === 'running').length;
    const completed = this.taskSnapshots.filter((t) => t.status === 'completed').length;

    const scheduler: SchedulerSnapshot = { pending, running, completed };

    const activeAlerts = this.alerts.filter((a) => !a.resolved);

    return {
      timestamp: Date.now(),
      containers: containerSummaries,
      accounts: accountSummaries,
      scheduler,
      alerts: activeAlerts,
      health: this.computeHealth(activeAlerts),
    };
  }

  /** Get per-platform metrics from completed tasks */
  platformMetrics(platform: string): PlatformMetrics {
    const platformTasks = this.taskSnapshots.filter(
      (t) => (t.params['platform'] as string) === platform || platform === 'all'
    );

    const total = platformTasks.length;
    if (total === 0) {
      return { successRate: 1, captchaRate: 0, avgResponseTime: 0 };
    }

    const completed = platformTasks.filter((t) => t.status === 'completed').length;
    const captchaDetected = platformTasks.filter(
      (t) => t.result?.captchaDetected === true
    ).length;

    return {
      successRate: completed / total,
      captchaRate: captchaDetected / total,
      avgResponseTime: 0, // Would need latency tracking in task metadata
    };
  }

  /** Get per-account metrics */
  accountMetrics(accountId: string): AccountMetrics | null {
    const account = this.accountSnapshots.get(accountId);
    if (!account) return null;

    return {
      state: account.state,
      todayRequests: account.dailyRequestCount,
      dailyLimit: 1000,
      cooldownUntil: account.cooldownUntil,
      lastError: account.lastError,
    };
  }

  /** Raise an alert */
  raiseAlert(severity: AlertSeverity, source: Alert['source'], message: string): Alert {
    const alert: Alert = {
      id: `alert_${++this.alertIdCounter}`,
      severity,
      source,
      message,
      timestamp: Date.now(),
      resolved: false,
    };
    this.alerts.push(alert);
    if (this.alerts.length > 500) {
      this.alerts.shift();
    }
    return alert;
  }

  /** Resolve an alert by ID */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  private computeHealth(activeAlerts: Alert[]): HealthStatus {
    if (activeAlerts.some((a) => a.severity === 'critical')) return 'unhealthy';
    if (activeAlerts.some((a) => a.severity === 'warning')) return 'degraded';
    return 'healthy';
  }
}

// ============ Alert Manager ============

export interface AlertThresholds {
  captchaRateWarning: number;    // Default 0.05 (5%)
  captchaRateCritical: number;   // Default 0.15 (15%)
  successRateWarning: number;     // Default 0.90 (90%)
  banCountCritical: number;       // Default 1
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  captchaRateWarning: 0.05,
  captchaRateCritical: 0.15,
  successRateWarning: 0.90,
  banCountCritical: 1,
};

export class AlertManager {
  private readonly collector: MetricsCollector;
  private readonly thresholds: AlertThresholds;
  private readonly cooldowns = new Map<string, number>();

  constructor(collector: MetricsCollector, thresholds: Partial<AlertThresholds> = {}) {
    this.collector = collector;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /** Check thresholds and fire alerts based on current metrics */
  check(): Alert[] {
    const fired: Alert[] = [];

    for (const [platform] of Object.entries({})) {
      const metrics = this.collector.platformMetrics(platform);
      if (!metrics) continue;

      // Check captcha rate
      if (metrics.captchaRate >= this.thresholds.captchaRateCritical) {
        fired.push(
          this.collector.raiseAlert(
            'critical',
            'platform',
            `Platform ${platform}: captcha rate ${(metrics.captchaRate * 100).toFixed(1)}% exceeds critical threshold`
          )
        );
      } else if (metrics.captchaRate >= this.thresholds.captchaRateWarning) {
        if (!this.isInCooldown(`captcha_warn_${platform}`)) {
          fired.push(
            this.collector.raiseAlert(
              'warning',
              'platform',
              `Platform ${platform}: captcha rate ${(metrics.captchaRate * 100).toFixed(1)}% exceeds warning threshold`
            )
          );
          this.setCooldown(`captcha_warn_${platform}`, 300_000); // 5 min
        }
      }

      // Check success rate
      if (metrics.successRate < this.thresholds.successRateWarning) {
        if (!this.isInCooldown(`success_${platform}`)) {
          fired.push(
            this.collector.raiseAlert(
              'warning',
              'platform',
              `Platform ${platform}: success rate ${(metrics.successRate * 100).toFixed(1)}% below threshold`
            )
          );
          this.setCooldown(`success_${platform}`, 300_000);
        }
      }
    }

    return fired;
  }

  private isInCooldown(key: string): boolean {
    const until = this.cooldowns.get(key) ?? 0;
    return Date.now() < until;
  }

  private setCooldown(key: string, ms: number): void {
    this.cooldowns.set(key, Date.now() + ms);
  }
}

// ============ Prometheus Exporter ============

/** Format metrics snapshot in Prometheus text format */
export function toPrometheusFormat(snapshot: MetricsSnapshot): string {
  const lines: string[] = [
    `# HELP creatoros_health_status System health status (1=healthy, 0.5=degraded, 0=unhealthy)`,
    `# TYPE creatoros_health_status gauge`,
    `creatoros_health_status ${snapshot.health === 'healthy' ? 1 : snapshot.health === 'degraded' ? 0.5 : 0}`,
    ``,
    `# HELP creatoros_scheduler_pending_pending Pending tasks in scheduler queue`,
    `# TYPE creatoros_scheduler_pending_pending gauge`,
    `creatoros_scheduler_pending_pending ${snapshot.scheduler.pending}`,
    ``,
    `# HELP creatoros_scheduler_running_tasks Currently running tasks`,
    `# TYPE creatoros_scheduler_running_tasks gauge`,
    `creatoros_scheduler_running_tasks ${snapshot.scheduler.running}`,
    ``,
    `# HELP creatoros_scheduler_completed_tasks Total completed tasks`,
    `# TYPE creatoros_scheduler_completed_tasks counter`,
    `creatoros_scheduler_completed_tasks ${snapshot.scheduler.completed}`,
    ``,
    `# HELP creatoros_containers_active Number of active containers`,
    `# TYPE creatoros_containers_active gauge`,
    `creatoros_containers_active ${snapshot.containers.filter((c) => c.state === 'running').length}`,
    ``,
    `# HELP creatoros_accounts_active Number of active accounts`,
    `# TYPE creatoros_accounts_active gauge`,
    `creatoros_accounts_active ${snapshot.accounts.filter((a) => a.state === 'active').length}`,
    ``,
    `# HELP creatoros_alerts_active Number of active alerts`,
    `# TYPE creatoros_alerts_active gauge`,
    `creatoros_alerts_active ${snapshot.alerts.length}`,
  ];

  // Per-container metrics
  for (const c of snapshot.containers) {
    lines.push(
      ``,
      `# HELP creatoros_container_uptime_seconds Container uptime in seconds`,
      `# TYPE creatoros_container_uptime_seconds gauge`,
      `creatoros_container_uptime_seconds{container="${c.id}"} ${(c.uptime / 1000).toFixed(2)}`,
    );
  }

  // Per-account metrics
  for (const a of snapshot.accounts) {
    lines.push(
      ``,
      `# HELP creatoros_account_requests_today Today's request count for account`,
      `# TYPE creatoros_account_requests_today counter`,
      `creatoros_account_requests_today{account="${a.id}",platform="${a.platform}"} ${a.todayRequests}`,
    );
  }

  return lines.join('\n');
}

// ============ Health Checker ============

export interface HealthCheckResult {
  status: HealthStatus;
  checks: HealthCheck[];
  timestamp: number;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
}

export class HealthChecker {
  private readonly collector: MetricsCollector;

  constructor(collector: MetricsCollector) {
    this.collector = collector;
  }

  /** Run all health checks */
  check(): HealthCheckResult {
    const checks: HealthCheck[] = [];

    // Check system health
    const snapshot = this.collector.snapshot();
    checks.push({
      name: 'system_overall',
      status: snapshot.health === 'unhealthy' ? 'fail' : snapshot.health === 'degraded' ? 'warn' : 'pass',
      message: `${snapshot.containers.length} containers, ${snapshot.accounts.length} accounts`,
    });

    // Check container health
    const errorContainers = snapshot.containers.filter((c) => c.state === 'error');
    checks.push({
      name: 'containers_error',
      status: errorContainers.length > 0 ? 'fail' : 'pass',
      message: errorContainers.length > 0
        ? `${errorContainers.length} containers in error state: ${errorContainers.map((c) => c.id).join(', ')}`
        : undefined,
    });

    // Check account health
    const bannedAccounts = snapshot.accounts.filter((a) => a.state === 'banned');
    const coolingAccounts = snapshot.accounts.filter((a) => a.state === 'cooling');
    checks.push({
      name: 'accounts_banned',
      status: bannedAccounts.length > 0 ? 'warn' : 'pass',
      message: bannedAccounts.length > 0
        ? `${bannedAccounts.length} banned accounts`
        : undefined,
    });

    // Check active alerts
    checks.push({
      name: 'alerts_critical',
      status: snapshot.alerts.some((a) => a.severity === 'critical') ? 'fail' : 'pass',
      message: `${snapshot.alerts.length} active alerts`,
    });

    // Scheduler health
    checks.push({
      name: 'scheduler_queue',
      status: snapshot.scheduler.pending > 1000 ? 'warn' : 'pass',
      message: `${snapshot.scheduler.pending} pending tasks`,
    });

    const overallStatus: HealthStatus =
      checks.some((c) => c.status === 'fail')
        ? 'unhealthy'
        : checks.some((c) => c.status === 'warn')
        ? 'degraded'
        : 'healthy';

    return { status: overallStatus, checks, timestamp: Date.now() };
  }
}

// ============ Audit Logger ============

export type AuditEvent =
  | { type: 'account_state_change'; accountId: string; from: string; to: string; reason?: string }
  | { type: 'task_enqueued'; taskId: string; taskType: string; accountId?: string }
  | { type: 'task_completed'; taskId: string; success: boolean; durationMs?: number }
  | { type: 'task_failed'; taskId: string; error: string; retryable?: boolean }
  | { type: 'container_started'; containerId: string; platform: string }
  | { type: 'container_stopped'; containerId: string }
  | { type: 'container_error'; containerId: string; error: string }
  | { type: 'proxy_selected'; proxyIp: string; proxyPort: number }
  | { type: 'proxy_failed'; proxyIp: string; proxyPort: number }
  | { type: 'api_request'; method: string; path: string; statusCode: number; durationMs: number };

export interface AuditEntry {
  id: string;
  timestamp: number;
  event: AuditEvent;
}

export class AuditLogger {
  private readonly entries: AuditEntry[] = [];
  private readonly maxEntries: number;
  private idCounter = 0;

  constructor(maxEntries = 10_000) {
    this.maxEntries = maxEntries;
  }

  log(event: AuditEvent): AuditEntry {
    const entry: AuditEntry = {
      id: `audit_${++this.idCounter}`,
      timestamp: Date.now(),
      event,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    return entry;
  }

  query(opts?: {
    type?: AuditEvent['type'];
    accountId?: string;
    containerId?: string;
    since?: number;
    until?: number;
    limit?: number;
  }): AuditEntry[] {
    let results = this.entries;

    if (opts?.type) {
      results = results.filter((e) => e.event['type'] === opts.type);
    }
    if (opts?.accountId) {
      results = results.filter((e) => {
        const ev = e.event as Record<string, unknown>;
        return ev['accountId'] === opts.accountId;
      });
    }
    if (opts?.containerId) {
      results = results.filter((e) => {
        const ev = e.event as Record<string, unknown>;
        return ev['containerId'] === opts.containerId;
      });
    }
    if (opts?.since) {
      results = results.filter((e) => e.timestamp >= opts.since!);
    }
    if (opts?.until) {
      results = results.filter((e) => e.timestamp <= opts.until!);
    }

    const limit = opts?.limit ?? results.length;
    return results.slice(-limit);
  }

  exportJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}

// ============ Re-exports ============

export { DEFAULT_THRESHOLDS };
