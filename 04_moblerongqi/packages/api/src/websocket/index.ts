// WebSocket Server — real-time event stream for CreatorOS
// Aligns with design doc §10.3

import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'node:stream';

// ============ Event types ============

export type ContainerEventType = 'container_started' | 'container_stopped' | 'container_error';
export type TaskEventType = 'task_queued' | 'task_completed' | 'task_failed';
export type WsEventType = ContainerEventType | TaskEventType;

export interface WsEvent {
  type: WsEventType;
  payload: unknown;
  timestamp: number;
}

// Client → Server commands
export interface WsCommand {
  cmd: 'subscribe' | 'unsubscribe';
  stream?: WsEventType | 'all';
}

// ============ Per-client subscription state ============

interface ClientState {
  ws: WebSocket;
  subscriptions: Set<WsEventType | 'all'>;
}

// ============ WebSocketServer ============

export class CreatorOSWebSocketServer {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientState>();

  constructor(server?: HttpServer, options?: ConstructorParameters<typeof WebSocketServer>[0]) {
    this.wss = new WebSocketServer(options ?? { server });
  }

  /**
   * Delegate emit to the underlying WebSocketServer so callers (like the HTTP
   * server's 'upgrade' handler in server.ts) can re-emit events through this
   * instance's wss.
   */
  emit(event: string, ...args: unknown[]): boolean {
    return this.wss.emit(event, ...args);
  }

  /** Register a new client connection */
  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      // WebSocketServer will emit 'connection' automatically; no need to emit again.
      // If you need to intercept, do so in start() via wss.on('connection', ...).
    });
  }

  /** Start accepting connections and wire up event handling */
  start(): void {
    this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
      this.clients.set(ws, { ws, subscriptions: new Set(['all']) });
      this.send(ws, { type: 'task_queued', payload: { message: 'Connected to CreatorOS WebSocket' }, timestamp: Date.now() });

      ws.on('message', (data: RawData) => {
        try {
          const msg = JSON.parse(data.toString()) as WsCommand;
          this.handleCommand(ws, msg);
        } catch {
          this.send(ws, { type: 'task_failed', payload: { error: 'Invalid JSON' }, timestamp: Date.now() });
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (err: Error) => {
        console.error('[WS] Client error:', err.message);
        this.clients.delete(ws);
      });
    });
  }

  /** Handle incoming client commands */
  private handleCommand(ws: WebSocket, cmd: WsCommand): void {
    const state = this.clients.get(ws);
    if (!state) return;

    switch (cmd.cmd) {
      case 'subscribe':
        if (cmd.stream) {
          state.subscriptions.add(cmd.stream);
        }
        this.send(ws, {
          type: 'task_queued',
          payload: { message: `Subscribed to ${cmd.stream ?? 'all'}` },
          timestamp: Date.now(),
        });
        break;

      case 'unsubscribe':
        if (cmd.stream) {
          state.subscriptions.delete(cmd.stream);
        }
        this.send(ws, {
          type: 'task_queued',
          payload: { message: `Unsubscribed from ${cmd.stream ?? 'all'}` },
          timestamp: Date.now(),
        });
        break;
    }
  }

  /** Send a JSON message to a single client */
  private send(ws: WebSocket, event: WsEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  /** Broadcast an event to all subscribed clients */
  broadcast(event: WsEvent): void {
    for (const state of this.clients.values()) {
      if (state.subscriptions.has('all') || state.subscriptions.has(event.type)) {
        this.send(state.ws, event);
      }
    }
  }

  /** Emit a container lifecycle event */
  emitContainerEvent(type: ContainerEventType, payload: unknown): void {
    this.broadcast({ type, payload, timestamp: Date.now() });
  }

  /** Emit a task lifecycle event */
  emitTaskEvent(type: TaskEventType, payload: unknown): void {
    this.broadcast({ type, payload, timestamp: Date.now() });
  }

  /** Convenience: emit container_started */
  emitContainerStarted(containerId: string): void {
    this.emitContainerEvent('container_started', { containerId });
  }

  /** Convenience: emit container_stopped */
  emitContainerStopped(containerId: string): void {
    this.emitContainerEvent('container_stopped', { containerId });
  }

  /** Convenience: emit container_error */
  emitContainerError(containerId: string, error: string): void {
    this.emitContainerEvent('container_error', { containerId, error });
  }

  /** Convenience: emit task_queued */
  emitTaskQueued(taskId: string): void {
    this.emitTaskEvent('task_queued', { taskId });
  }

  /** Convenience: emit task_completed */
  emitTaskCompleted(taskId: string, result: unknown): void {
    this.emitTaskEvent('task_completed', { taskId, result });
  }

  /** Convenience: emit task_failed */
  emitTaskFailed(taskId: string, error: string): void {
    this.emitTaskEvent('task_failed', { taskId, error });
  }

  /** Number of connected clients */
  get clientCount(): number {
    return this.clients.size;
  }

  /** Close all connections and shut down */
  close(): void {
    for (const state of this.clients.values()) {
      state.ws.close();
    }
    this.wss.close();
  }
}

// ============ Factory helper ============

export function createWebSocketServer(server?: HttpServer): CreatorOSWebSocketServer {
  const wss = new CreatorOSWebSocketServer(server);
  wss.start();
  return wss;
}
