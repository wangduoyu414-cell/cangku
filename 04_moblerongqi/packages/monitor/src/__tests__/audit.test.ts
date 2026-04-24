import { describe, it, expect } from 'vitest';
import { AuditLogger } from '@creator-os/monitor';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger(100);
  });

  describe('log()', () => {
    it('should create an audit entry with id and timestamp', () => {
      const entry = logger.log({ type: 'api_request', method: 'GET', path: '/health', statusCode: 200, durationMs: 5 });
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it('should increment entry id', () => {
      const e1 = logger.log({ type: 'api_request', method: 'GET', path: '/a', statusCode: 200, durationMs: 1 });
      const e2 = logger.log({ type: 'api_request', method: 'GET', path: '/b', statusCode: 200, durationMs: 1 });
      expect(e1.id).not.toBe(e2.id);
    });
  });

  describe('query()', () => {
    it('should return all entries by default', () => {
      logger.log({ type: 'api_request', method: 'GET', path: '/a', statusCode: 200, durationMs: 1 });
      logger.log({ type: 'task_enqueued', taskId: 't1', taskType: 'scrape_posts' });
      const results = logger.query();
      expect(results.length).toBe(2);
    });

    it('should filter by type', () => {
      logger.log({ type: 'api_request', method: 'GET', path: '/a', statusCode: 200, durationMs: 1 });
      logger.log({ type: 'task_enqueued', taskId: 't1', taskType: 'scrape_posts' });
      const results = logger.query({ type: 'task_enqueued' });
      expect(results.length).toBe(1);
      expect(results[0]!.event.type).toBe('task_enqueued');
    });

    it('should filter by accountId', () => {
      logger.log({ type: 'account_state_change', accountId: 'acc_001', from: 'active', to: 'cooling' });
      logger.log({ type: 'account_state_change', accountId: 'acc_002', from: 'active', to: 'rate_limited' });
      const results = logger.query({ accountId: 'acc_001' });
      expect(results.length).toBe(1);
    });

    it('should filter by containerId', () => {
      logger.log({ type: 'container_started', containerId: 'c1', platform: 'douyin' });
      logger.log({ type: 'container_started', containerId: 'c2', platform: 'douyin' });
      const results = logger.query({ containerId: 'c2' });
      expect(results.length).toBe(1);
    });

    it('should filter by time range', () => {
      const now = Date.now();
      logger.log({ type: 'api_request', method: 'GET', path: '/a', statusCode: 200, durationMs: 1 });
      const results = logger.query({ since: now - 1000, until: now + 1000 });
      expect(results.length).toBe(1);
    });

    it('should respect limit', () => {
      for (let i = 0; i < 10; i++) {
        logger.log({ type: 'api_request', method: 'GET', path: `/a${i}`, statusCode: 200, durationMs: 1 });
      }
      const results = logger.query({ limit: 3 });
      expect(results.length).toBe(3);
    });
  });

  describe('all event types', () => {
    it('should accept account_state_change events', () => {
      const entry = logger.log({ type: 'account_state_change', accountId: 'acc_001', from: 'active', to: 'banned' });
      expect(entry.event.type).toBe('account_state_change');
    });

    it('should accept task_completed events', () => {
      const entry = logger.log({ type: 'task_completed', taskId: 't1', success: true, durationMs: 1500 });
      expect(entry.event.type).toBe('task_completed');
    });

    it('should accept container events', () => {
      const entry1 = logger.log({ type: 'container_started', containerId: 'c1', platform: 'douyin' });
      const entry2 = logger.log({ type: 'container_stopped', containerId: 'c1' });
      const entry3 = logger.log({ type: 'container_error', containerId: 'c1', error: 'OOM' });
      expect(entry1.event.type).toBe('container_started');
      expect(entry2.event.type).toBe('container_stopped');
      expect(entry3.event.type).toBe('container_error');
    });

    it('should accept proxy events', () => {
      const entry1 = logger.log({ type: 'proxy_selected', proxyIp: '1.1.1.1', proxyPort: 8080 });
      const entry2 = logger.log({ type: 'proxy_failed', proxyIp: '1.1.1.1', proxyPort: 8080 });
      expect(entry1.event.type).toBe('proxy_selected');
      expect(entry2.event.type).toBe('proxy_failed');
    });
  });

  describe('exportJSON()', () => {
    it('should export valid JSON', () => {
      logger.log({ type: 'api_request', method: 'GET', path: '/health', statusCode: 200, durationMs: 2 });
      const json = logger.exportJSON();
      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(1);
    });
  });

  describe('maxEntries boundary', () => {
    it('should evict oldest entries when exceeding maxEntries', () => {
      const smallLogger = new AuditLogger(5);
      for (let i = 0; i < 10; i++) {
        smallLogger.log({ type: 'api_request', method: 'GET', path: `/p${i}`, statusCode: 200, durationMs: 1 });
      }
      const results = smallLogger.query({ limit: 100 });
      expect(results.length).toBe(5);
    });
  });
});
