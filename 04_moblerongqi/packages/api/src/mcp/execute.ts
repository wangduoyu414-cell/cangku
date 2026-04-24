// MCP Server — tool execution engine
// Aligns with design doc §10.2 and §10.3

import { mcpTools, type MCPTool } from './index.js';
import { createRestRouter } from '../rest/index.js';

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResult>;

/** Map of tool name -> async handler */
const toolHandlers = new Map<string, ToolHandler>();

/** Register a handler for an MCP tool */
function registerHandler(name: string, handler: ToolHandler): void {
  toolHandlers.set(name, handler);
}

// ---------- Container tool handlers ----------

registerHandler('container_start', async (params) => {
  const { containerId } = params;
  if (!containerId) return { success: false, error: 'containerId is required' };
  try {
    const router = createRestRouter();
    // Handled via REST API — return stub response
    return { success: true, data: { containerId, status: 'started' } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

registerHandler('container_stop', async (params) => {
  const { containerId } = params;
  if (!containerId) return { success: false, error: 'containerId is required' };
  return { success: true, data: { containerId, status: 'stopped' } };
});

registerHandler('container_list', async () => {
  return { success: true, data: { containers: [] } };
});

// ---------- Account tool handlers ----------

registerHandler('account_login', async (params) => {
  const { platform, phone } = params as { platform?: string; phone?: string };
  if (!platform) return { success: false, error: 'platform is required' };
  return {
    success: true,
    data: {
      platform,
      phone: phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : undefined,
      status: 'login_initiated',
    },
  };
});

registerHandler('account_status', async (params) => {
  const { accountId } = params as { accountId?: string };
  if (!accountId) return { success: false, error: 'accountId is required' };
  return { success: true, data: { accountId, state: 'active', dailyRequestCount: 0 } };
});

// ---------- Scrape tool handlers ----------

registerHandler('scrape_posts', async (params) => {
  const { platform, keyword, limit } = params as { platform?: string; keyword?: string; limit?: number };
  if (!platform || !keyword) return { success: false, error: 'platform and keyword are required' };
  return {
    success: true,
    data: {
      platform,
      keyword,
      limit: limit ?? 20,
      status: 'scraping',
      items: [],
    },
  };
});

registerHandler('scrape_comments', async (params) => {
  const { platform, postId, limit } = params as { platform?: string; postId?: string; limit?: number };
  if (!platform || !postId) return { success: false, error: 'platform and postId are required' };
  return {
    success: true,
    data: { platform, postId, limit: limit ?? 50, status: 'scraping', comments: [] },
  };
});

registerHandler('scrape_profile', async (params) => {
  const { platform, userId } = params as { platform?: string; userId?: string };
  if (!platform || !userId) return { success: false, error: 'platform and userId are required' };
  return {
    success: true,
    data: { platform, userId, status: 'scraping', profile: null },
  };
});

// ---------- Publish tool handlers ----------

registerHandler('publish_video', async (params) => {
  const { platform, videoPath, title, hashtags } = params as {
    platform?: string; videoPath?: string; title?: string; hashtags?: string[];
  };
  if (!platform || !videoPath) return { success: false, error: 'platform and videoPath are required' };
  return {
    success: true,
    data: {
      platform,
      videoPath,
      title: title ?? '',
      hashtags: hashtags ?? [],
      status: 'publishing',
      postId: null,
      url: null,
    },
  };
});

registerHandler('publish_image', async (params) => {
  const { platform, imagePaths, content, tags } = params as {
    platform?: string; imagePaths?: string[]; content?: string; tags?: string[];
  };
  if (!platform) return { success: false, error: 'platform is required' };
  return {
    success: true,
    data: {
      platform,
      imagePaths: imagePaths ?? [],
      content: content ?? '',
      tags: tags ?? [],
      status: 'publishing',
      postId: null,
      url: null,
    },
  };
});

// ---------- Engagement tool handlers ----------

registerHandler('engage_action', async (params) => {
  const { platform, action, targetId, content } = params as {
    platform?: string; action?: string; targetId?: string; content?: string;
  };
  if (!platform || !action || !targetId) {
    return { success: false, error: 'platform, action, and targetId are required' };
  }
  return {
    success: true,
    data: { platform, action, targetId, content: content ?? '', status: 'completed' },
  };
});

// ---------- Analytics tool handlers ----------

registerHandler('get_revenue_summary', async (params) => {
  const { accountIds } = params as { accountIds?: string[] };
  return {
    success: true,
    data: {
      accountIds: accountIds ?? [],
      total: 0,
      byPlatform: {},
      byDay: {},
      trends: { dailyAvg: 0, weeklyGrowth: 0, monthlyGrowth: 0 },
    },
  };
});

registerHandler('get_analytics', async (params) => {
  const { platform, contentId } = params as { platform?: string; contentId?: string };
  if (!platform) return { success: false, error: 'platform is required' };
  return {
    success: true,
    data: { platform, contentId: contentId ?? null, metrics: null },
  };
});

// ---------- Management tool handlers ----------

registerHandler('scale_containers', async (params) => {
  const { count, platform } = params as { count?: number; platform?: string };
  if (count === undefined) return { success: false, error: 'count is required' };
  return { success: true, data: { requested: count, platform: platform ?? 'all', scaled: count } };
});

/** Execute an MCP tool by name and parameters */
async function executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
  const handler = toolHandlers.get(name);
  if (!handler) {
    return { success: false, error: `Unknown tool: ${name}` };
  }
  return handler(params);
}

/** List all registered tools */
function listTools(): MCPTool[] {
  return mcpTools;
}

export { executeTool, listTools, registerHandler };
