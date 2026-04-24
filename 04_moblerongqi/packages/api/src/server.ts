// Server entry point — starts both REST and WebSocket servers

import { createServer as createHttpServer } from 'http';
import type { Server as HttpServer } from 'http';
import type { RequestListener } from 'http';
import { WebSocketServer, type WebSocket as WSType } from 'ws';
import { createRestRouter } from './rest/index.js';
import { createWebSocketServer } from './websocket/index.js';
import { executeTool, listTools } from './mcp/execute.js';
import 'dotenv/config';

const REST_PORT = Number(process.env['REST_PORT'] ?? 3000);
const WS_PORT = Number(process.env['WS_PORT'] ?? 3001);

/** Create and start the combined REST + WebSocket server */
export function createServer(restPort = REST_PORT, wsPort = WS_PORT) {
  const app = createRestRouter();

  // MCP tool execution endpoint (design §10.2)
  app.post('/mcp/v1/tools', async (req, res) => {
    const { name, params } = req.body as { name?: string; params?: Record<string, unknown> };
    if (!name) {
      res.status(400).json({ error: 'tool name is required' });
      return;
    }
    const result = await executeTool(name, params ?? {});
    res.json(result);
  });

  // MCP tool listing endpoint
  app.get('/mcp/v1/tools', (_req, res) => {
    res.json({ tools: listTools() });
  });

  // HTTP server — cast the Express 5 router to RequestListener for compatibility
  const httpServer = createHttpServer(app as unknown as RequestListener);

  // WebSocket server sharing the same HTTP server
  const wss = createWebSocketServer(httpServer);

  httpServer.listen(restPort, () => {
    console.log(`[REST]  Listening on http://localhost:${restPort}`);
  });

  // If REST and WS ports differ, bind a second HTTP server for WS
  if (wsPort !== restPort) {
    const wsHttpServer = createHttpServer();
    wsHttpServer.listen(wsPort, () => {
      console.log(`[WS]    Listening on ws://localhost:${wsPort}`);
    });

    // The second HTTP server needs its own WebSocketServer attached.
    // createWebSocketServer calls start() which sets up the 'connection' listener,
    // so we create a fresh instance bound to wsHttpServer.
    const wsServer2 = new WebSocketServer({ server: wsHttpServer });
    wsServer2.on('connection', (ws: WSType) => {
      wsServer2.clients.forEach((client) => {
        if (client.readyState === 1 /* OPEN */) {
          client.send(JSON.stringify({ type: 'task_queued', payload: { message: 'Connected via WS port' }, timestamp: Date.now() }));
        }
      });
    });
  } else {
    console.log(`[WS]    Sharing http://localhost:${restPort}`);
  }

  return { httpServer, wss, app };
}

// Self-start when run directly
createServer();
