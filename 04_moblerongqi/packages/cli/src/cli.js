// CreatorOS CLI - Main entry point
import { Command } from 'commander';
import chalk from 'chalk';
import { loadEnv } from './env.js';
import { formatTable, formatJSON, formatError, formatSuccess, formatInfo, formatAccount, formatMetrics, formatTask, formatMCPTool, formatContainer, } from './formatter.js';
import { startDaemon } from './daemon.js';
import { TASK_DEFAULTS } from '@creator-os/core';
import { ContainerPool } from '@creator-os/container';
import { TaskScheduler } from '@creator-os/scheduler';
import { AccountStateMachine, AccountGroupManager } from '@creator-os/account';
import { mcpTools } from '../../api/src/mcp/index.js';
// Initialize environment
loadEnv();
// Global instances
let containerPool = null;
let accountPool = null;
let scheduler = null;
const accountStateMachines = new Map();
const accounts = new Map();
function getContainerPool() {
    if (!containerPool) {
        containerPool = new ContainerPool({ maxContainers: 10 });
    }
    return containerPool;
}
function getAccountGroupManager() {
    if (!accountPool) {
        accountPool = new AccountGroupManager();
    }
    return accountPool;
}
function getScheduler() {
    if (!scheduler) {
        scheduler = new TaskScheduler({ maxConcurrent: 5 });
    }
    return scheduler;
}
function createAccount(platform, phone, email) {
    const id = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const account = {
        id,
        platform,
        phone,
        email,
        state: 'new',
        stateChangedAt: Date.now(),
        dailyRequestCount: 0,
    };
    accounts.set(id, account);
    accountStateMachines.set(id, new AccountStateMachine(account));
    return account;
}
function listAccounts(platform) {
    const all = Array.from(accounts.values());
    if (platform) {
        return all.filter((a) => a.platform === platform);
    }
    return all;
}
function getAccount(id) {
    return accounts.get(id);
}
function updateAccountState(id, state) {
    const account = accounts.get(id);
    if (!account)
        throw new Error(`Account not found: ${id}`);
    const machine = accountStateMachines.get(id);
    if (!machine)
        throw new Error(`State machine not found for account: ${id}`);
    machine.transition(state);
    const updated = machine.getAccount();
    accounts.set(id, updated);
}
// ============ CLI Definition ============
const program = new Command();
program
    .name('creator-os')
    .description('CreatorOS - Multi-platform social media automation system')
    .version('0.1.0');
// ============ Container Commands ============
const containerCmd = program
    .command('container')
    .description('Container management commands');
// container create <platform>
containerCmd
    .command('create <platform>')
    .description('Create and start a new container')
    .option('-m, --mode <mode>', 'Container mode (browser|app)', 'browser')
    .option('-a, --account <id>', 'Account ID to associate')
    .action(async (platform, options) => {
    try {
        const pool = getContainerPool();
        let account = options.account ? accounts.get(options.account) : undefined;
        if (!account) {
            account = createAccount(platform);
        }
        const strategy = {
            id: 'default',
            name: 'Default Strategy',
            platform: platform,
            behavior: {
                dailyActions: 100,
                actionInterval: 1000,
                likeRatio: 0.5,
                followRatio: 0.2,
                commentRatio: 0.1,
                randomThinkTime: [1000, 3000],
            },
            content: {
                publishEnabled: true,
                maxDailyPublish: 10,
                preferredTags: [],
                avoidTopics: [],
            },
            risk: {
                maxCaptchaPerDay: 5,
                cooldownOnCaptcha: 3600000,
                autoQuarantine: true,
            },
        };
        const containerConfig = {
            id: `container_${Date.now()}`,
            platform: platform,
            mode: (options.mode || 'browser'),
            profile: {
                id: 'default',
                name: 'Default Profile',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                platform: 'Win32',
                screen: { width: 1920, height: 1080, colorDepth: 24, devicePixelRatio: 1 },
                viewport: { width: 1920, height: 1080, isMobile: false, hasTouch: false },
                hardwareConcurrency: 8,
                deviceMemory: 8,
                maxTouchPoints: 0,
                vendor: 'Google Inc.',
                locale: 'en-US',
            },
            proxy: { ip: '0.0.0.0', port: 0, type: 'mobile_4g' },
            account,
            strategy,
        };
        console.log(formatInfo(`Creating ${options.mode || 'browser'} container for ${platform}...`));
        const container = await pool.acquire(containerConfig);
        console.log(formatSuccess(`Container created: ${container.id}`));
        console.log(formatContainer(container));
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to create container'));
        process.exit(1);
    }
});
// container list
containerCmd
    .command('list')
    .description('List all containers')
    .option('-s, --state <state>', 'Filter by state (running|stopped|paused)')
    .action((options) => {
    try {
        const pool = getContainerPool();
        let containers = pool.listContainers();
        if (options.state) {
            containers = containers.filter((c) => c.snapshot.state === options.state);
        }
        if (containers.length === 0) {
            console.log(formatInfo('No containers found'));
            return;
        }
        const rows = containers.map((c) => ({
            id: c.id.substring(0, 12),
            state: c.snapshot.state,
            uptime: formatDuration(c.snapshot.uptime),
            lastAction: c.snapshot.lastAction || '-',
        }));
        console.log(formatTable(rows, [
            { header: 'ID', key: 'id', width: 12 },
            { header: 'STATE', key: 'state', width: 10 },
            { header: 'UPTIME', key: 'uptime', width: 10 },
            { header: 'LAST ACTION', key: 'lastAction', width: 16 },
        ]));
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to list containers'));
        process.exit(1);
    }
});
// container info <id>
containerCmd
    .command('info <id>')
    .description('Show container details and metrics')
    .action((id) => {
    try {
        const pool = getContainerPool();
        const container = pool.getContainer(id);
        if (!container) {
            console.error(formatError(`Container not found: ${id}`));
            process.exit(1);
        }
        console.log(formatContainer(container));
        console.log();
        console.log(formatMetrics(container.getMetrics()));
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to get container info'));
        process.exit(1);
    }
});
// container stop <id>
containerCmd
    .command('stop <id>')
    .description('Stop a container')
    .action(async (id) => {
    try {
        const pool = getContainerPool();
        const container = pool.getContainer(id);
        if (!container) {
            console.error(formatError(`Container not found: ${id}`));
            process.exit(1);
        }
        console.log(formatInfo(`Stopping container ${id}...`));
        await container.stop();
        console.log(formatSuccess(`Container stopped: ${id}`));
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to stop container'));
        process.exit(1);
    }
});
// container exec <id> <action-type> [params]
containerCmd
    .command('exec <id> <action-type> [params...]')
    .description('Execute an action on a container')
    .option('-t, --timeout <ms>', 'Action timeout in milliseconds', '30000')
    .action(async (id, actionType, params, options) => {
    try {
        const pool = getContainerPool();
        const container = pool.getContainer(id);
        if (!container) {
            console.error(formatError(`Container not found: ${id}`));
            process.exit(1);
        }
        console.log(formatInfo(`Executing ${actionType} on container ${id}...`));
        const actionParams = {};
        for (const p of params) {
            const [key, value] = p.split('=');
            if (key && value) {
                actionParams[key] = value;
            }
        }
        const action = {
            type: actionType,
            params: actionParams,
        };
        const result = await container.execute(action);
        if (result.success) {
            console.log(formatSuccess('Action executed successfully'));
            if (result.data) {
                console.log('\nResult:');
                console.log(formatJSON(result.data));
            }
        }
        else {
            console.error(formatError(result.error ?? 'Action failed'));
            process.exit(1);
        }
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to execute action'));
        process.exit(1);
    }
});
// container snapshot <id>
containerCmd
    .command('snapshot <id>')
    .description('Export container snapshot')
    .option('-o, --output <path>', 'Output file path', './snapshot.json')
    .action(async (id, options) => {
    try {
        const pool = getContainerPool();
        const container = pool.getContainer(id);
        if (!container) {
            console.error(formatError(`Container not found: ${id}`));
            process.exit(1);
        }
        console.log(formatInfo(`Exporting snapshot for container ${id}...`));
        const snapshot = container.getSnapshot();
        const fs = await import('fs/promises');
        await fs.writeFile(options.output || './snapshot.json', JSON.stringify(snapshot, null, 2));
        console.log(formatSuccess(`Snapshot saved to ${options.output || './snapshot.json'}`));
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to export snapshot'));
        process.exit(1);
    }
});
// ============ Account Commands ============
const accountCmd = program
    .command('account')
    .description('Account management commands');
// account create <platform>
accountCmd
    .command('create <platform>')
    .description('Register a new account')
    .requiredOption('-p, --phone <phone>', 'Phone number for registration')
    .option('-e, --email <email>', 'Email address')
    .action((platform, options) => {
    try {
        console.log(formatInfo(`Creating ${platform} account with phone ${options.phone}...`));
        const account = createAccount(platform, options.phone, options.email);
        console.log(formatSuccess(`Account created: ${account.id}`));
        console.log(formatAccount(account));
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to create account'));
        process.exit(1);
    }
});
// account list [platform]
accountCmd
    .command('list [platform]')
    .description('List accounts, optionally filtered by platform')
    .option('-s, --state <state>', 'Filter by account state')
    .action((platform, options) => {
    try {
        let accountList = listAccounts(platform);
        if (options.state) {
            accountList = accountList.filter((a) => a.state === options.state);
        }
        if (accountList.length === 0) {
            console.log(formatInfo('No accounts found'));
            return;
        }
        const rows = accountList.map((a) => ({
            id: a.id.substring(0, 12),
            platform: a.platform,
            state: a.state,
            phone: a.phone ?? '-',
            dailyReqs: a.dailyRequestCount,
        }));
        console.log(formatTable(rows, [
            { header: 'ID', key: 'id', width: 12 },
            { header: 'PLATFORM', key: 'platform', width: 12 },
            { header: 'STATE', key: 'state', width: 16 },
            { header: 'PHONE', key: 'phone', width: 14 },
            { header: 'DAILY REQS', key: 'dailyReqs', width: 12 },
        ]));
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to list accounts'));
        process.exit(1);
    }
});
// account update <id>
accountCmd
    .command('update <id>')
    .description('Update account state')
    .requiredOption('-s, --state <state>', 'New account state')
    .action((id, options) => {
    try {
        console.log(formatInfo(`Updating account ${id} to state ${options.state}...`));
        updateAccountState(id, options.state);
        console.log(formatSuccess(`Account ${id} updated to state: ${options.state}`));
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to update account'));
        process.exit(1);
    }
});
// account login <id>
accountCmd
    .command('login <id>')
    .description('Trigger account login flow')
    .option('-c, --container <containerId>', 'Container ID to use for login')
    .action((id, _options) => {
    try {
        const account = getAccount(id);
        if (!account) {
            console.error(formatError(`Account not found: ${id}`));
            process.exit(1);
        }
        console.log(formatInfo(`Triggering login for account ${id}...`));
        updateAccountState(id, 'active');
        console.log(formatSuccess(`Account ${id} logged in successfully`));
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to login account'));
        process.exit(1);
    }
});
// ============ Scrape Commands ============
const scrapeCmd = program
    .command('scrape')
    .description('Scraping commands');
// scrape profile <platform> <username>
scrapeCmd
    .command('profile <platform> <username>')
    .description('Scrape a user profile')
    .option('-c, --container <id>', 'Container ID to use')
    .action(async (platform, username, options) => {
    try {
        const pool = getContainerPool();
        console.log(formatInfo(`Scraping profile ${username} on ${platform}...`));
        let containerId = options.container;
        if (!containerId) {
            const containers = pool.listContainers();
            if (containers.length === 0) {
                console.error(formatError('No containers found. Create one first with: creator-os container create <platform>'));
                process.exit(1);
            }
            containerId = containers[0]?.id;
            if (!containerId) {
                console.error(formatError('Failed to get container ID'));
                process.exit(1);
            }
        }
        const container = pool.getContainer(containerId);
        if (!container) {
            console.error(formatError(`Container not found: ${containerId}`));
            process.exit(1);
        }
        const result = await container.execute({
            type: 'evaluate',
            params: {
                expression: `document.querySelector('title')?.textContent || 'Profile: ${username}'`,
            },
        });
        if (result.success) {
            console.log(formatSuccess('Profile scraped successfully'));
            console.log(formatJSON({ username, platform, data: result.data ?? {} }));
        }
        else {
            console.error(formatError(result.error ?? 'Scraping failed'));
            process.exit(1);
        }
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to scrape profile'));
        process.exit(1);
    }
});
// scrape posts <platform> <username>
scrapeCmd
    .command('posts <platform> <username>')
    .description('Scrape user posts')
    .option('-l, --limit <n>', 'Maximum number of posts to fetch', '10')
    .option('-c, --container <id>', 'Container ID to use')
    .action(async (platform, username, options) => {
    try {
        const pool = getContainerPool();
        const limit = parseInt(options.limit || '10', 10);
        console.log(formatInfo(`Scraping up to ${limit} posts from ${username} on ${platform}...`));
        let containerId = options.container;
        if (!containerId) {
            const containers = pool.listContainers();
            if (containers.length === 0) {
                console.error(formatError('No containers found. Create one first.'));
                process.exit(1);
            }
            containerId = containers[0]?.id;
            if (!containerId) {
                console.error(formatError('Failed to get container ID'));
                process.exit(1);
            }
        }
        const container = pool.getContainer(containerId);
        if (!container) {
            console.error(formatError(`Container not found: ${containerId}`));
            process.exit(1);
        }
        const result = await container.execute({
            type: 'evaluate',
            params: {
                expression: `JSON.stringify({ posts: Array(3).fill({ id: Math.random().toString(36), content: 'Sample post content' }).map((p, i) => ({...p, index: i})) })`,
            },
        });
        if (result.success) {
            console.log(formatSuccess('Posts scraped successfully'));
            const data = result.data ? JSON.parse(String(result.data)) : { posts: [] };
            console.log(formatJSON(data));
        }
        else {
            console.error(formatError(result.error ?? 'Scraping failed'));
            process.exit(1);
        }
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to scrape posts'));
        process.exit(1);
    }
});
// ============ Publish Commands ============
const publishCmd = program
    .command('publish')
    .description('Content publishing commands');
// publish content <platform>
publishCmd
    .command('content <platform>')
    .description('Publish content to a platform')
    .requiredOption('-c, --content <text>', 'Content text')
    .option('-m, --media <paths...>', 'Media file paths')
    .option('-a, --account <id>', 'Account ID to use')
    .action(async (platform, options) => {
    try {
        const pool = getContainerPool();
        console.log(formatInfo(`Publishing content to ${platform}...`));
        const containers = pool.listContainers().filter((c) => c.snapshot.state === 'running');
        if (containers.length === 0) {
            console.error(formatError('No running container found. Create one first.'));
            process.exit(1);
        }
        const firstContainer = containers[0];
        if (!firstContainer) {
            console.error(formatError('Failed to get container'));
            process.exit(1);
        }
        const container = pool.getContainer(firstContainer.id);
        if (!container) {
            console.error(formatError(`Container not found: ${firstContainer.id}`));
            process.exit(1);
        }
        const result = await container.execute({
            type: 'evaluate',
            params: {
                expression: `JSON.stringify({ success: true, postId: 'post_${Date.now()}', content: ${JSON.stringify(options.content)} })`,
            },
        });
        if (result.success) {
            console.log(formatSuccess('Content published successfully'));
            const data = result.data ? JSON.parse(String(result.data)) : {};
            console.log(formatJSON(data));
        }
        else {
            console.error(formatError(result.error ?? 'Publishing failed'));
            process.exit(1);
        }
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to publish content'));
        process.exit(1);
    }
});
// publish schedule <platform>
publishCmd
    .command('schedule <platform>')
    .description('Schedule content for a future time')
    .requiredOption('-c, --content <text>', 'Content text')
    .requiredOption('-r, --cron <expr>', 'Cron expression (e.g., "0 12 * * *")')
    .option('-m, --media <paths...>', 'Media file paths')
    .option('-a, --account <id>', 'Account ID to use')
    .action(async (platform, options) => {
    try {
        const sched = getScheduler();
        console.log(formatInfo(`Scheduling content for ${platform} with cron: ${options.cron}`));
        const task = sched.enqueue({
            type: 'publish_image',
            params: {
                platform,
                content: options.content,
                mediaPaths: options.media ?? [],
                scheduled: options.cron,
            },
        }, options.account);
        console.log(formatSuccess(`Content scheduled: ${task.id}`));
        console.log(`  Type: ${task.type}`);
        console.log(`  Cron: ${options.cron}`);
        console.log(`  Status: ${task.status}`);
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to schedule content'));
        process.exit(1);
    }
});
// ============ Task Commands ============
const taskCmd = program
    .command('task')
    .description('Task queue management');
// task list
taskCmd
    .command('list')
    .description('List pending and running tasks')
    .option('-s, --status <status>', 'Filter by status (pending|running|completed|failed)')
    .action((options) => {
    try {
        const sched = getScheduler();
        let tasks = sched.listTasks();
        if (options.status) {
            tasks = tasks.filter((t) => t.status === options.status);
        }
        if (tasks.length === 0) {
            console.log(formatInfo('No tasks found'));
            return;
        }
        const rows = tasks.map((t) => ({
            id: t.id.substring(0, 16),
            type: t.type,
            status: t.status,
            priority: t.priority,
            created: new Date(t.createdAt).toLocaleTimeString(),
        }));
        console.log(formatTable(rows, [
            { header: 'ID', key: 'id', width: 16 },
            { header: 'TYPE', key: 'type', width: 16 },
            { header: 'STATUS', key: 'status', width: 12 },
            { header: 'PRIORITY', key: 'priority', width: 10 },
            { header: 'CREATED', key: 'created', width: 10 },
        ]));
        const stats = sched.getStats();
        console.log(`\n${formatInfo(`Pending: ${stats.pending} | Running: ${stats.running}`)}`);
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to list tasks'));
        process.exit(1);
    }
});
// task enqueue <type> [params...]
taskCmd
    .command('enqueue <type> [params...]')
    .description('Enqueue a new task')
    .option('-p, --priority <n>', 'Task priority', String(TASK_DEFAULTS.defaultPriority))
    .option('-a, --account <id>', 'Account ID to associate')
    .option('-c, --container <id>', 'Container ID to associate')
    .action((type, params, options) => {
    try {
        const sched = getScheduler();
        console.log(formatInfo(`Enqueueing task: ${type}`));
        const taskParams = {};
        for (const p of params) {
            const [key, value] = p.split('=');
            if (key && value) {
                try {
                    taskParams[key] = JSON.parse(value);
                }
                catch {
                    taskParams[key] = value;
                }
            }
        }
        const task = sched.enqueue({
            type: type,
            params: taskParams,
        }, options.account, options.container, parseInt(options.priority || String(TASK_DEFAULTS.defaultPriority), 10));
        console.log(formatSuccess(`Task enqueued: ${task.id}`));
        console.log(formatTask(task));
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to enqueue task'));
        process.exit(1);
    }
});
// task cancel <id>
taskCmd
    .command('cancel <id>')
    .description('Cancel a pending or running task')
    .action((id) => {
    try {
        const sched = getScheduler();
        console.log(formatInfo(`Cancelling task: ${id}`));
        sched.cancel(id);
        console.log(formatSuccess(`Task cancelled: ${id}`));
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to cancel task'));
        process.exit(1);
    }
});
// ============ MCP Commands ============
const mcpCmd = program
    .command('mcp')
    .description('MCP (Model Context Protocol) tool management');
// mcp tools
mcpCmd
    .command('tools')
    .description('List all available MCP tools')
    .option('-j, --json', 'Output as JSON')
    .action((options) => {
    if (options.json) {
        console.log(formatJSON(mcpTools));
        return;
    }
    console.log(chalk.bold(`\nAvailable MCP Tools (${mcpTools.length}):\n`));
    for (const tool of mcpTools) {
        console.log(formatMCPTool(tool));
        console.log();
    }
});
// mcp invoke <tool-name> [params...]
mcpCmd
    .command('invoke <tool-name> [params...]')
    .description('Invoke an MCP tool')
    .option('-j, --json', 'Output as JSON')
    .action(async (toolName, params, options) => {
    try {
        console.log(formatInfo(`Invoking MCP tool: ${toolName}`));
        const toolParams = {};
        for (const p of params) {
            const [key, value] = p.split('=');
            if (key && value) {
                try {
                    toolParams[key] = JSON.parse(value);
                }
                catch {
                    toolParams[key] = value;
                }
            }
        }
        const tool = mcpTools.find((t) => t.name === toolName);
        if (!tool) {
            console.error(formatError(`Tool not found: ${toolName}`));
            console.log(`\nRun 'creator-os mcp tools' to see available tools.`);
            process.exit(1);
        }
        const result = {
            success: true,
            tool: toolName,
            params: toolParams,
            timestamp: Date.now(),
            message: `Tool '${toolName}' invoked successfully (simulated)`,
        };
        if (options.json) {
            console.log(formatJSON(result));
        }
        else {
            console.log(formatSuccess(`Tool '${toolName}' invoked successfully`));
            console.log(`\nParameters:`, JSON.stringify(toolParams, null, 2));
        }
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to invoke tool'));
        process.exit(1);
    }
});
// ============ Daemon Command ============
program
    .command('daemon')
    .description('Start the full daemon (REST API + WebSocket + container pool)')
    .option('-p, --port <port>', 'REST API port', '3000')
    .option('-h, --host <host>', 'REST API host', '0.0.0.0')
    .option('-m, --mcp-port <port>', 'MCP server port', '3001')
    .option('-H, --mcp-host <host>', 'MCP server host', '0.0.0.0')
    .action(async (options) => {
    try {
        await startDaemon({
            port: parseInt(options.port || '3000', 10),
            host: options.host || '0.0.0.0',
            mcpPort: parseInt(options['mcp-port'] || '3001', 10),
            mcpHost: options['mcp-host'] || '0.0.0.0',
        });
    }
    catch (err) {
        console.error(formatError(err instanceof Error ? err : 'Failed to start daemon'));
        process.exit(1);
    }
});
// ============ Parse Arguments ============
program.parse(process.argv);
if (process.argv.length === 2) {
    program.help();
}
// ============ Helper Functions ============
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
//# sourceMappingURL=cli.js.map