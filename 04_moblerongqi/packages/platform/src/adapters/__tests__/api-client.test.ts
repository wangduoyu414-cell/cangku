import { describe, it, expect } from 'vitest';
import { createAPIClient } from '../api-client.ts';

describe('createAPIClient', () => {
  it('should return a client for douyin', () => {
    const client = createAPIClient('douyin');
    expect(client).toBeDefined();
  });

  it('should return a client for xiaohongshu', () => {
    const client = createAPIClient('xiaohongshu');
    expect(client).toBeDefined();
  });

  it('should return a client for weibo', () => {
    const client = createAPIClient('weibo');
    expect(client).toBeDefined();
  });

  it('should return a client for bilibili', () => {
    const client = createAPIClient('bilibili');
    expect(client).toBeDefined();
  });

  it('should throw for unsupported platform', () => {
    expect(() => createAPIClient('taobao')).toThrow(/No API client for platform/);
  });

  it('should throw for jd', () => {
    expect(() => createAPIClient('jd')).toThrow(/No API client for platform/);
  });

  it('should throw for pinduoduo', () => {
    expect(() => createAPIClient('pinduoduo')).toThrow(/No API client for platform/);
  });

  it('should throw for tiktok', () => {
    expect(() => createAPIClient('tiktok')).toThrow(/No API client for platform/);
  });

  it('should NOT return null for any supported platform', () => {
    const supported = ['douyin', 'xiaohongshu', 'weibo', 'bilibili'] as const;
    for (const p of supported) {
      const client = createAPIClient(p);
      expect(client).not.toBeNull();
      expect(client).not.toBeUndefined();
    }
  });
});
