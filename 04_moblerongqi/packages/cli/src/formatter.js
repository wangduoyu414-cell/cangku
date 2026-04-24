// Output formatting utilities with ANSI colors
import chalk from 'chalk';
export function formatTable(rows, columns) {
    if (rows.length === 0) {
        return chalk.yellow('(no data)');
    }
    const colWidths = columns.map((col) => {
        const headerLen = col.header.length;
        const maxDataLen = Math.max(headerLen, ...rows.map((row) => String(row[col.key] ?? '').length));
        return Math.min(col.width ?? maxDataLen + 2, maxDataLen + 2);
    });
    const headerRow = columns
        .map((col, i) => chalk.bold(col.header.padEnd(colWidths[i] ?? col.header.length)))
        .join(' │ ');
    const separator = colWidths.map((w) => '─'.repeat(w)).join('─┼─');
    const dataRows = rows.map((row) => columns
        .map((col, i) => {
        const value = String(row[col.key] ?? '');
        return value.substring(0, colWidths[i] ?? value.length).padEnd(colWidths[i] ?? value.length);
    })
        .join(' │ '));
    return [headerRow, separator, ...dataRows].join('\n');
}
// ============ JSON Formatting ============
export function formatJSON(data) {
    const json = JSON.stringify(data, null, 2);
    return json
        .replace(/"([^"]+)":/g, (_, key) => chalk.cyan(`"${key}":`))
        .replace(/: "([^"]*)"/g, (_, value) => `: ${chalk.green(`"${value}"`)}`)
        .replace(/: (true|false)/g, (_, value) => value === 'true' ? `: ${chalk.blue(value)}` : `: ${chalk.red(value)}`)
        .replace(/: (null)/g, (_, value) => `: ${chalk.gray(value)}`)
        .replace(/: (-?\d+\.?\d*)/g, (_, value) => `: ${chalk.yellow(value)}`);
}
// ============ Container Formatting ============
export function formatContainer(c) {
    const stateColors = {
        running: chalk.green,
        paused: chalk.yellow,
        stopped: chalk.red,
        error: chalk.red.bold,
        created: chalk.blue,
    };
    const snapshot = c.getSnapshot();
    const stateColor = stateColors[snapshot.state] ?? chalk.white;
    return [
        chalk.bold(`Container: ${c.id}`),
        `  State:    ${stateColor(snapshot.state)}`,
        `  Uptime:   ${formatDuration(snapshot.uptime)}`,
        `  Last:     ${snapshot.lastAction || '-'}`,
    ].join('\n');
}
// ============ Account Formatting ============
export function formatAccount(a) {
    const stateColors = {
        new: chalk.blue,
        active: chalk.green,
        cooling: chalk.yellow,
        rate_limited: chalk.red,
        captcha: chalk.red.bold,
        manual_intervention: chalk.magenta,
        banned: chalk.red.bold.underline,
    };
    const stateColor = stateColors[a.state] ?? chalk.white;
    const lines = [
        chalk.bold(`Account: ${a.id}`),
        `  Platform:      ${a.platform}`,
        `  Phone:         ${a.phone ?? 'N/A'}`,
        `  Email:         ${a.email ?? 'N/A'}`,
        `  State:         ${stateColor(a.state)}`,
        `  State Changed: ${new Date(a.stateChangedAt).toLocaleString()}`,
        `  Daily Reqs:    ${a.dailyRequestCount}`,
    ];
    if (a.cooldownUntil) {
        lines.push(`  Cooldown:     ${new Date(a.cooldownUntil).toLocaleString()}`);
    }
    if (a.lastError) {
        lines.push(`  Last Error:    ${chalk.red(a.lastError)}`);
    }
    return lines.join('\n');
}
// ============ Metrics Formatting ============
export function formatMetrics(m) {
    const uptimeStr = formatDuration(m.uptime);
    const memMB = (m.memoryUsage / 1024 / 1024).toFixed(1);
    const lines = [
        chalk.bold('Container Metrics'),
        `  State:       ${m.state}`,
        `  Uptime:      ${uptimeStr}`,
        `  Memory:      ${chalk.cyan(`${memMB} MB`)}`,
        `  Actions:     ${m.actionCount}`,
        `  Last Action: ${m.lastAction}`,
    ];
    if (m.lastError) {
        lines.push(`  ${chalk.red('⚠ Last Error:')} ${m.lastError}`);
    }
    return lines.join('\n');
}
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0)
        return `${days}d ${hours % 24}h`;
    if (hours > 0)
        return `${hours}h ${minutes % 60}m`;
    if (minutes > 0)
        return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
// ============ Message Formatting ============
export function formatError(error) {
    const msg = error instanceof Error ? error.message : error;
    return `${chalk.red('✗ Error:')} ${msg}`;
}
export function formatSuccess(message) {
    return `${chalk.green('✓')} ${message}`;
}
export function formatWarning(message) {
    return `${chalk.yellow('⚠ Warning:')} ${message}`;
}
export function formatInfo(message) {
    return `${chalk.blue('ℹ')} ${message}`;
}
// ============ Task Formatting ============
export function formatTask(task) {
    const statusColors = {
        pending: chalk.blue,
        running: chalk.yellow,
        completed: chalk.green,
        failed: chalk.red,
        cancelled: chalk.gray,
    };
    const statusColor = statusColors[task.status] ?? chalk.white;
    return [
        chalk.bold(`Task: ${task.id}`),
        `  Type:     ${task.type}`,
        `  Status:   ${statusColor(task.status)}`,
        `  Priority: ${task.priority}`,
        `  Created:  ${new Date(task.createdAt).toLocaleString()}`,
        task.startedAt ? `  Started:  ${new Date(task.startedAt).toLocaleString()}` : null,
        task.completedAt ? `  Completed: ${new Date(task.completedAt).toLocaleString()}` : null,
    ]
        .filter(Boolean)
        .join('\n');
}
// ============ MCP Tool Formatting ============
export function formatMCPTool(tool) {
    const props = tool.inputSchema.properties;
    const required = tool.inputSchema.required ?? [];
    const propLines = Object.entries(props).map(([key, prop]) => {
        const isRequired = required.includes(key);
        const type = prop.type ?? 'any';
        return `      ${isRequired ? chalk.red('*') : ' '} ${chalk.cyan(key)}: ${chalk.yellow(type)}`;
    });
    return [
        chalk.bold.green(tool.name),
        `  ${tool.description}`,
        propLines.length > 0 ? `  Parameters:\n${propLines.join('\n')}` : '',
    ]
        .filter(Boolean)
        .join('\n');
}
//# sourceMappingURL=formatter.js.map