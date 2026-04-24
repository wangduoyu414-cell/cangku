// MCP Server — 与设计文档第 10.2 节对齐

import type { Platform } from '@creator-os/core';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const mcpTools: MCPTool[] = [
  // 容器操作
  {
    name: 'container_start',
    description: '启动一个仿真容器',
    inputSchema: { type: 'object', properties: { containerId: { type: 'string' } }, required: ['containerId'] },
  },
  {
    name: 'container_stop',
    description: '停止一个仿真容器',
    inputSchema: { type: 'object', properties: { containerId: { type: 'string' } }, required: ['containerId'] },
  },
  {
    name: 'container_list',
    description: '列出所有容器及状态',
    inputSchema: { type: 'object', properties: {} },
  },

  // 账号操作
  {
    name: 'account_login',
    description: '登录指定平台账号',
    inputSchema: {
      type: 'object',
      properties: { platform: { type: 'string' }, phone: { type: 'string' } },
      required: ['platform'],
    },
  },
  {
    name: 'account_status',
    description: '查询账号状态和配额',
    inputSchema: {
      type: 'object',
      properties: { accountId: { type: 'string' } },
      required: ['accountId'],
    },
  },

  // 抓取操作
  {
    name: 'scrape_posts',
    description: '抓取指定话题下的帖子',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string' },
        keyword: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['platform', 'keyword'],
    },
  },
  {
    name: 'scrape_comments',
    description: '抓取指定内容的评论',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string' },
        postId: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['platform', 'postId'],
    },
  },
  {
    name: 'scrape_profile',
    description: '抓取指定用户主页数据',
    inputSchema: {
      type: 'object',
      properties: { platform: { type: 'string' }, userId: { type: 'string' } },
      required: ['platform', 'userId'],
    },
  },

  // 发布操作
  {
    name: 'publish_video',
    description: '在指定平台发布视频',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string' },
        videoPath: { type: 'string' },
        title: { type: 'string' },
        hashtags: { type: 'array', items: { type: 'string' } },
      },
      required: ['platform', 'videoPath'],
    },
  },
  {
    name: 'publish_image',
    description: '在指定平台发布图文',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string' },
        imagePaths: { type: 'array', items: { type: 'string' } },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['platform'],
    },
  },

  // 互动操作
  {
    name: 'engage_action',
    description: '执行点赞/关注/评论/收藏操作',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string' },
        action: { type: 'string', enum: ['like', 'follow', 'comment', 'bookmark', 'share'] },
        targetId: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['platform', 'action', 'targetId'],
    },
  },

  // 分析操作
  {
    name: 'get_revenue_summary',
    description: '获取跨平台收入汇总',
    inputSchema: {
      type: 'object',
      properties: { accountIds: { type: 'array', items: { type: 'string' } } },
    },
  },
  {
    name: 'get_analytics',
    description: '获取内容表现分析',
    inputSchema: {
      type: 'object',
      properties: { platform: { type: 'string' }, contentId: { type: 'string' } },
      required: ['platform'],
    },
  },

  // 管理操作
  {
    name: 'scale_containers',
    description: '弹性扩容/缩容容器',
    inputSchema: {
      type: 'object',
      properties: { count: { type: 'number' }, platform: { type: 'string' } },
      required: ['count'],
    },
  },
];
