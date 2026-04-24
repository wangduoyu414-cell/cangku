// Daemon mode - starts REST API + WebSocket + container pool

import chalk from 'chalk';
import { ContainerPool } from '@creator-os/container';
import { TaskScheduler } from '@creator-os/scheduler';
import { AccountGroupManager } from '@creator-os/account';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { loadEnv } from './env.js';
import { formatSuccess, formatInfo, formatError } from './formatter.js';

export interface DaemonConfig {
  port: number;
  host: string;
  mcpPort: number;
  mcpHost: string;
}

const DEFAULT_CONFIG: DaemonConfig = {
  port: 3000,
  host: '0.0.0.0',
  mcpPort: 3001,
  mcpHost: '0.0.0.0',
};

export async function startDaemon(config: Partial<DaemonConfig> = {}): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  console.log(chalk.bold('\n🚀 CreatorOS Daemon Starting...\n'));

  // Load environment
  loadEnv();
  console.log(formatInfo('Environment loaded'));

  // Initialize components
  const containerPool = new ContainerPool({ maxContainers: 10 });
  const accountPool = new AccountGroupManager();
  const scheduler = new TaskScheduler({ maxConcurrent: 5 });

  console.log(formatSuccess('Container pool initialized'));
  console.log(formatSuccess('Account pool initialized'));
  console.log(formatSuccess('Task scheduler initialized'));

  // Start REST API server
  const apiServer = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: Date.now(),
        containerPool: 'initialized',
        accountPool: 'initialized',
        scheduler: 'initialized',
      }));
      return;
    }

    if (url.pathname === '/containers') {
      if (req.method === 'GET') {
        const containers = containerPool.listContainers();
        const data = containers.map((c) => ({
          id: c.id,
          snapshot: c.snapshot,
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ containers: data }));
        return;
      }
    }

    if (url.pathname === '/tasks') {
      if (req.method === 'GET') {
        const tasks = scheduler.listTasks();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tasks }));
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  // Start WebSocket server
  const wss = new WebSocketServer({ server: apiServer });

  wss.on('connection', (ws: WebSocket) => {
    console.log(formatInfo('WebSocket client connected'));

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }

        if (msg.type === 'container_metrics') {
          const containerId = msg.containerId;
          const container = containerPool.getContainer(containerId);
          if (container) {
            const metrics = container.getMetrics();
            ws.send(JSON.stringify({ type: 'metrics', data: metrics }));
          }
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      console.log(formatInfo('WebSocket client disconnected'));
    });
  });

  // Start servers
  await new Promise<void>((resolve, reject) => {
    apiServer.listen(cfg.port, cfg.host, () => {
      console.log(formatSuccess(`REST API listening on http://${cfg.host}:${cfg.port}`));
      resolve();
    });
    apiServer.on('error', reject);
  });

  // Start MCP server on separate port
  const mcpServer = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (url.pathname === '/tools') {
      res.writeHead(200);
      res.end(JSON.stringify({ tools: [] }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  await new Promise<void>((resolve, reject) => {
    mcpServer.listen(cfg.mcpPort, cfg.mcpHost, () => {
      console.log(formatSuccess(`MCP Server listening on http://${cfg.mcpHost}:${cfg.mcpPort}`));
      resolve();
    });
    mcpServer.on('error', reject);
  });

  console.log(chalk.bold('\n📋 Daemon Endpoints:'));
  console.log(`   REST API:  http://${cfg.host}:${cfg.port}`);
  console.log(`   MCP:       http://${cfg.mcpHost}:${cfg.mcpPort}`);
  console.log(`   WebSocket: ws://${cfg.host}:${cfg.port}\n`);

  console.log(chalk.green('✓ Daemon is running. Press Ctrl+C to stop.\n'));

  // Graceful shutdown
  const shutdown = () => {
    console.log(chalk.yellow('\n⚠ Shutting down daemon...'));

    wss.close();
    apiServer.close();
    mcpServer.close();

    console.log(formatSuccess('Daemon stopped'));
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
