// API 客户端 — 抖音、小红书、微博、B站 REST API 调用封装

import type { Platform } from '@creator-os/core';

// ============ 基础类型 ============

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface PaginationParams {
  cursor?: string;
  count?: number;
  maxCursor?: string;
  minCursor?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export interface RateLimitInfo {
  remaining: number;
  resetAt: number;
  limit: number;
}

// ============ 数据类型 ============

export interface ProfileData {
  id: string;
  nickname: string;
  avatar: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
  likeCount: number;
  verified: boolean;
  gender?: number;
  region?: string;
  birthday?: string;
}

export interface PostStats {
  viewCount?: number;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  collectCount?: number;
  danmakuCount?: number;
  coinCount?: number;
}

export interface PostData {
  id: string;
  title?: string;
  description?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createTime: number;
  stats: PostStats;
  mediaUrls?: string[];
  tags?: string[];
  liked?: boolean;
  bookmarked?: boolean;
}

export interface CommentData {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createTime: number;
  likeCount: number;
  replyCount?: number;
  liked?: boolean;
  replies?: CommentData[];
}

export interface FollowerData {
  id: string;
  nickname: string;
  avatar: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
  verified: boolean;
}

// ============ 基础客户端 ============

abstract class BaseAPIClient {
  protected baseUrl: string;
  protected headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': '',
  };

  protected cookies: string = '';
  protected rateLimitInfo: RateLimitInfo = { remaining: 100, resetAt: 0, limit: 100 };
  protected accessToken?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.headers['Referer'] = baseUrl;
  }

  setCookies(cookies: string): void {
    this.cookies = cookies;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  protected buildHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
    const merged = { ...this.headers };
    if (this.cookies) {
      merged['Cookie'] = this.cookies;
    }
    if (extraHeaders) {
      Object.assign(merged, extraHeaders);
    }
    return merged;
  }

  protected async fetch<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<APIResponse<T>> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: this.buildHeaders(options.headers as Record<string, string>),
      });

      const rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining') ?? '100', 10);
      const rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset') ?? '0', 10) * 1000;
      const rateLimitLimit = parseInt(response.headers.get('X-RateLimit-Limit') ?? '100', 10);

      this.rateLimitInfo = {
        remaining: rateLimitRemaining,
        resetAt: rateLimitReset,
        limit: rateLimitLimit,
      };

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10);
        const waitMs = (retryAfter || 60) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return this.fetch<T>(url, options);
      }

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const contentType = response.headers.get('content-type') ?? '';
      let data: T;

      if (contentType.includes('application/json')) {
        data = await response.json() as T;
      } else {
        data = await response.text() as unknown as T;
      }

      return { success: true, data, statusCode: response.status };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Network error';
      return { success: false, error };
    }
  }

  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  abstract getProfile(userId: string): Promise<APIResponse<ProfileData>>;
  abstract getPosts(userId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<PostData>>>;
  abstract getComments(postId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<CommentData>>>;
  abstract getFollowers(userId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<FollowerData>>>;
}

// ============ 抖音 API 客户端 ============

export class DouyinAPIClient extends BaseAPIClient {
  constructor() {
    super('https://www.douyin.com');
  }

  async getProfile(userId: string): Promise<APIResponse<ProfileData>> {
    const url = `${this.baseUrl}/aweme/v1/web/user/profile/other/?user_id=${encodeURIComponent(userId)}&device_id=${Date.now()}&aid=6383`;
    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const user = (d['user'] ?? d['user_detail']) as Record<string, unknown> | undefined;

    if (!user) return { success: false, error: 'User not found' };

    return {
      success: true,
      data: {
        id: String(user['uid'] ?? user['user_id'] ?? userId),
        nickname: String(user['nickname'] ?? ''),
        avatar: String(user['avatar_url'] ?? user['avatar_thumb'] ?? ''),
        bio: String(user['signature'] ?? ''),
        followerCount: Number(user['follower_count'] ?? 0),
        followingCount: Number(user['following_count'] ?? 0),
        likeCount: Number(user['total_favorited'] ?? 0),
        verified: Boolean(user['custom_verify'] ?? user['verify']),
        gender: Number(user['gender'] ?? 0),
        region: String(user['region'] ?? ''),
      },
    };
  }

  async getPosts(userId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<PostData>>> {
    const count = params?.count ?? 18;
    const cursor = params?.cursor ?? params?.maxCursor ?? '';
    let url = `${this.baseUrl}/aweme/v1/web/aweme/post/?user_id=${encodeURIComponent(userId)}&device_id=${Date.now()}&aid=6383&count=${count}`;
    if (cursor) url += `&max_cursor=${encodeURIComponent(cursor)}`;

    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const awemeList = (d['aweme_list'] ?? d['aweme_details']) as unknown[] ?? [];

    return {
      success: true,
      data: {
        items: awemeList.map((item) => this.parseAweme(item as Record<string, unknown>)),
        nextCursor: String(d['max_cursor'] ?? ''),
        hasMore: Boolean(d['has_more']),
        total: Number(d['total']),
      },
    };
  }

  async getComments(postId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<CommentData>>> {
    const count = params?.count ?? 20;
    const cursor = params?.cursor ?? '';
    let url = `${this.baseUrl}/aweme/v1/web/comment/list/?aweme_id=${encodeURIComponent(postId)}&device_id=${Date.now()}&aid=6383&count=${count}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const comments = (d['comments'] ?? d['comment_list']) as unknown[] ?? [];

    return {
      success: true,
      data: {
        items: comments.map((c) => this.parseComment(c as Record<string, unknown>, postId)),
        nextCursor: String(d['cursor'] ?? ''),
        hasMore: Boolean(d['has_more']),
      },
    };
  }

  async getFollowers(userId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<FollowerData>>> {
    const count = params?.count ?? 20;
    const cursor = params?.cursor ?? '';
    let url = `${this.baseUrl}/aweme/v1/web/user/follower/list/?user_id=${encodeURIComponent(userId)}&device_id=${Date.now()}&aid=6383&count=${count}`;
    if (cursor) url += `&max_time=${encodeURIComponent(cursor)}`;

    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const users = (d['followers'] ?? d['user_list']) as unknown[] ?? [];

    return {
      success: true,
      data: {
        items: users.map((u) => this.parseFollower(u as Record<string, unknown>)),
        nextCursor: String(d['max_time'] ?? ''),
        hasMore: Boolean(d['has_more']),
      },
    };
  }

  private parseAweme(item: Record<string, unknown>): PostData {
    const author = item['author'] as Record<string, unknown> | undefined;
    const stats = item['statistics'] as Record<string, unknown> | undefined;
    const video = item['video'] as Record<string, unknown> | undefined;
    const images = item['images'] as unknown[] | undefined;

    let mediaUrls: string[] = [];
    if (images && Array.isArray(images)) {
      mediaUrls = images.map((img) => {
        const imgObj = img as Record<string, unknown>;
        const urlList = imgObj['url_list'];
        if (Array.isArray(urlList) && urlList.length > 0) {
          return String(urlList[0]);
        }
        return '';
      }).filter(Boolean);
    } else if (video) {
      const playAddr = video['play_addr'] as Record<string, unknown> | undefined;
      const urlList = playAddr?.['url_list'];
      if (Array.isArray(urlList) && urlList.length > 0) {
        mediaUrls = [String(urlList[0])];
      }
    }

    return {
      id: String(item['aweme_id'] ?? item['id'] ?? ''),
      title: String(item['desc'] ?? '').slice(0, 100),
      description: String(item['desc'] ?? ''),
      authorId: String(author?.['uid'] ?? author?.['user_id'] ?? ''),
      authorName: String(author?.['nickname'] ?? ''),
      authorAvatar: String(author?.['avatar_url'] ?? ''),
      createTime: Number(item['create_time'] ?? 0) * 1000,
      stats: {
        viewCount: Number(stats?.['play_count'] ?? stats?.['video_play_count'] ?? 0),
        likeCount: Number(stats?.['digg_count'] ?? 0),
        commentCount: Number(stats?.['comment_count'] ?? 0),
        shareCount: Number(stats?.['share_count'] ?? 0),
        collectCount: Number(stats?.['collect_count'] ?? 0),
      },
      mediaUrls,
      liked: Boolean(item['is_favorite']),
      bookmarked: Boolean(item['collect']),
    };
  }

  private parseComment(comment: Record<string, unknown>, postId: string): CommentData {
    const user = comment['user'] as Record<string, unknown> | undefined;
    const reply = comment['reply_comment'] as Record<string, unknown> | undefined;

    return {
      id: String(comment['cid'] ?? comment['id'] ?? ''),
      postId,
      authorId: String(user?.['uid'] ?? user?.['user_id'] ?? ''),
      authorName: String(user?.['nickname'] ?? ''),
      authorAvatar: String(user?.['avatar_url'] ?? ''),
      content: String(comment['text'] ?? comment['content'] ?? ''),
      createTime: Number(comment['create_time'] ?? 0) * 1000,
      likeCount: Number(comment['digg_count'] ?? comment['like_count'] ?? 0),
      replyCount: Number(comment['reply_count'] ?? 0),
      liked: Boolean(comment['digg']),
      replies: reply ? [this.parseComment(reply, postId)] : undefined,
    };
  }

  private parseFollower(user: Record<string, unknown>): FollowerData {
    return {
      id: String(user['uid'] ?? user['user_id'] ?? ''),
      nickname: String(user['nickname'] ?? ''),
      avatar: String(user['avatar_url'] ?? ''),
      bio: String(user['signature'] ?? ''),
      followerCount: Number(user['follower_count'] ?? 0),
      followingCount: Number(user['following_count'] ?? 0),
      verified: Boolean(user['custom_verify']),
    };
  }
}

// ============ 小红书 API 客户端 ============

export class XiaohongshuAPIClient extends BaseAPIClient {
  private deviceId: string;

  constructor() {
    super('https://edith.xiaohongshu.com');
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private buildXhsHeaders(): Record<string, string> {
    return {
      ...this.buildHeaders(),
      'Content-Type': 'application/json',
      'x-s': this.generateXhsSignature(),
      'x-t': String(Date.now()),
      'x-b3-traceid': this.generateDeviceId(),
    };
  }

  private generateXhsSignature(): string {
    return Buffer.from(`${this.deviceId}${Date.now()}`).toString('base64');
  }

  async getProfile(userId: string): Promise<APIResponse<ProfileData>> {
    const url = `${this.baseUrl}/api/sns/web/v1/user/otherinfo`;
    const body = JSON.stringify({ target_user_id: userId, device_id: this.deviceId });

    const raw = await this.fetch<Record<string, unknown>>(url, { method: 'POST', headers: this.buildXhsHeaders(), body });
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const user = (d['user_info'] ?? d['basic_info']) as Record<string, unknown> | undefined;
    const basicInfo = user as Record<string, unknown> | undefined;
    const vipInfo = (basicInfo?.['vip_info'] ?? basicInfo?.['vip']) as Record<string, unknown> | undefined;

    if (!user) return { success: false, error: 'User not found' };

    return {
      success: true,
      data: {
        id: String(user['user_id'] ?? userId),
        nickname: String(user['nickname'] ?? ''),
        avatar: String(user['images'] ?? user['avatar'] ?? ''),
        bio: String(user['desc'] ?? user['description'] ?? ''),
        followerCount: Number(user['fans'] ?? user['follower_count'] ?? 0),
        followingCount: Number(user['follow'] ?? user['following_count'] ?? 0),
        likeCount: Number(user['liked'] ?? user['like_count'] ?? 0),
        verified: Boolean(vipInfo?.['vip_status']),
        gender: Number(user['gender'] ?? 0),
        region: String(user['region'] ?? ''),
      },
    };
  }

  async getPosts(userId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<PostData>>> {
    const cursor = params?.cursor ?? '';
    const url = `${this.baseUrl}/api/sns/web/v1/user_posted?user_id=${encodeURIComponent(userId)}&cursor=${encodeURIComponent(cursor)}&num=${params?.count ?? 20}&device_id=${this.deviceId}`;

    const raw = await this.fetch<Record<string, unknown>>(url, { headers: this.buildXhsHeaders() });
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const notes = (d['notes'] ?? d['note_list'] ?? d['items']) as unknown[] ?? [];

    return {
      success: true,
      data: {
        items: notes.map((note) => this.parseNote(note as Record<string, unknown>)),
        nextCursor: String(d['cursor'] ?? ''),
        hasMore: Boolean(d['has_more']),
        total: Number(d['total'] ?? 0),
      },
    };
  }

  async getComments(postId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<CommentData>>> {
    const cursor = params?.cursor ?? '';
    const url = `${this.baseUrl}/api/sns/web/v1/comment/list?xsec_source=feed_search&xsec_type=1&note_id=${encodeURIComponent(postId)}&cursor=${encodeURIComponent(cursor)}&num=${params?.count ?? 20}&device_id=${this.deviceId}`;

    const raw = await this.fetch<Record<string, unknown>>(url, { headers: this.buildXhsHeaders() });
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const comments = (d['comments'] ?? d['comment_list'] ?? []) as unknown[] ?? [];

    return {
      success: true,
      data: {
        items: comments.map((c) => this.parseXhsComment(c as Record<string, unknown>, postId)),
        nextCursor: String(d['cursor'] ?? ''),
        hasMore: Boolean(d['has_more']),
      },
    };
  }

  async getFollowers(userId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<FollowerData>>> {
    const cursor = params?.cursor ?? '';
    const url = `${this.baseUrl}/api/sns/web/v1/user/follower?user_id=${encodeURIComponent(userId)}&cursor=${encodeURIComponent(cursor)}&num=${params?.count ?? 20}&device_id=${this.deviceId}`;

    const raw = await this.fetch<Record<string, unknown>>(url, { headers: this.buildXhsHeaders() });
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const users = (d['users'] ?? d['followers'] ?? []) as unknown[] ?? [];

    return {
      success: true,
      data: {
        items: users.map((u) => this.parseXhsFollower(u as Record<string, unknown>)),
        nextCursor: String(d['cursor'] ?? ''),
        hasMore: Boolean(d['has_more']),
      },
    };
  }

  private parseNote(note: Record<string, unknown>): PostData {
    const user = note['user'] as Record<string, unknown> | undefined;
    const interactInfo = note['interact_info'] as Record<string, unknown> | undefined;
    const imageList = note['image_list'] as unknown[] | undefined;

    return {
      id: String(note['note_id'] ?? note['id'] ?? ''),
      title: String(note['title'] ?? ''),
      description: String(note['desc'] ?? note['content'] ?? ''),
      authorId: String(user?.['user_id'] ?? ''),
      authorName: String(user?.['nickname'] ?? ''),
      authorAvatar: String(user?.['avatar'] ?? ''),
      createTime: Number(note['time'] ?? note['created_at'] ?? 0) * 1000,
      stats: {
        likeCount: Number(interactInfo?.['liked_count'] ?? note['liked_count'] ?? 0),
        commentCount: Number(interactInfo?.['comment_count'] ?? note['comment_count'] ?? 0),
        collectCount: Number(interactInfo?.['collected_count'] ?? note['collected_count'] ?? 0),
        shareCount: Number(interactInfo?.['share_count'] ?? note['share_count'] ?? 0),
      },
      mediaUrls: imageList?.map((img) => {
        const imgObj = img as Record<string, unknown>;
        return String(imgObj['url_default'] ?? imgObj['url'] ?? '');
      }).filter(Boolean) ?? [],
      tags: (note['tag_list'] as string[] | undefined)?.map((t) => String(t)),
      liked: Boolean(interactInfo?.['liked']),
      bookmarked: Boolean(interactInfo?.['collected']),
    };
  }

  private parseXhsComment(comment: Record<string, unknown>, postId: string): CommentData {
    const userInfo = comment['user_info'] as Record<string, unknown> | undefined;

    return {
      id: String(comment['id'] ?? comment['comment_id'] ?? ''),
      postId,
      authorId: String(userInfo?.['user_id'] ?? ''),
      authorName: String(userInfo?.['nickname'] ?? ''),
      authorAvatar: String(userInfo?.['avatar'] ?? ''),
      content: String(comment['content'] ?? comment['text'] ?? ''),
      createTime: Number(comment['create_time'] ?? comment['time'] ?? 0) * 1000,
      likeCount: Number(comment['like_count'] ?? 0),
      replyCount: Number(comment['sub_comment_count'] ?? comment['reply_count'] ?? 0),
      liked: Boolean(comment['liked']),
    };
  }

  private parseXhsFollower(user: Record<string, unknown>): FollowerData {
    const vipInfo = user['vip_info'] as Record<string, unknown> | undefined;

    return {
      id: String(user['user_id'] ?? ''),
      nickname: String(user['nickname'] ?? ''),
      avatar: String(user['avatar'] ?? ''),
      bio: String(user['desc'] ?? ''),
      followerCount: Number(user['fans'] ?? 0),
      followingCount: Number(user['follow'] ?? 0),
      verified: Boolean(vipInfo?.['vip_status']),
    };
  }
}

// ============ 微博 API 客户端 ============

export class WeiboAPIClient extends BaseAPIClient {
  constructor() {
    super('https://weibo.com');
  }

  async getProfile(userId: string): Promise<APIResponse<ProfileData>> {
    const url = `${this.baseUrl}/ajax/profile/info?uid=${encodeURIComponent(userId)}`;

    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const user = (d['user'] ?? d['data']) as Record<string, unknown> | undefined;

    if (!user) return { success: false, error: 'User not found' };

    const genderVal = user['gender'];
    const gender = genderVal === 'm' ? 1 : genderVal === 'f' ? 2 : 0;

    return {
      success: true,
      data: {
        id: String(user['id'] ?? userId),
        nickname: String(user['screen_name'] ?? user['name'] ?? ''),
        avatar: String(user['avatar_large'] ?? user['profile_image_url'] ?? ''),
        bio: String(user['description'] ?? ''),
        followerCount: Number(user['followers_count'] ?? 0),
        followingCount: Number(user['friends_count'] ?? 0),
        likeCount: Number(user['favourites_count'] ?? 0),
        verified: Boolean(user['verified']),
        gender,
        region: String(user['location'] ?? ''),
      },
    };
  }

  async getPosts(userId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<PostData>>> {
    const page = params?.page ?? 1;
    const url = `${this.baseUrl}/ajax/statuses/mymblog?uid=${encodeURIComponent(userId)}&page=${page}&feature=0`;

    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const posts = (d['posts'] ?? d['list'] ?? d['statuses']) as unknown[] ?? [];

    return {
      success: true,
      data: {
        items: posts.map((p) => this.parseWeiboPost(p as Record<string, unknown>)),
        hasMore: Boolean(d['has_more']),
        total: Number(d['total_number'] ?? 0),
      },
    };
  }

  async getComments(postId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<CommentData>>> {
    const page = params?.page ?? 1;
    const url = `${this.baseUrl}/ajax/comments/show?id=${encodeURIComponent(postId)}&page=${page}&by_summary=1`;

    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const comments = (d['data'] ?? d['commentlist'] ?? []) as unknown[] ?? [];

    return {
      success: true,
      data: {
        items: comments.map((c) => this.parseWeiboComment(c as Record<string, unknown>, postId)),
        hasMore: Boolean(d['has_more']),
        total: Number(d['total_number'] ?? 0),
      },
    };
  }

  async getFollowers(userId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<FollowerData>>> {
    const page = params?.page ?? 1;
    const url = `${this.baseUrl}/ajax/friendships/friends?uid=${encodeURIComponent(userId)}&page=${page}&count=20`;

    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const users = (d['users'] ?? []) as unknown[] ?? [];

    return {
      success: true,
      data: {
        items: users.map((u) => this.parseWeiboFollower(u as Record<string, unknown>)),
        hasMore: Boolean(d['has_visible'] === 1),
        total: Number(d['total_number'] ?? 0),
      },
    };
  }

  private parseWeiboPost(post: Record<string, unknown>): PostData {
    const user = post['user'] as Record<string, unknown> | undefined;
    const createdAtVal = post['created_at'];
    const createTime = typeof createdAtVal === 'string'
      ? new Date(createdAtVal).getTime()
      : Number(createdAtVal ?? 0) * 1000;

    return {
      id: String(post['id'] ?? post['mid'] ?? ''),
      description: String(post['text'] ?? post['raw_text'] ?? ''),
      authorId: String(user?.['id'] ?? ''),
      authorName: String(user?.['screen_name'] ?? ''),
      authorAvatar: String(user?.['avatar_large'] ?? ''),
      createTime,
      stats: {
        likeCount: Number(post['attitudes_count'] ?? 0),
        commentCount: Number(post['comments_count'] ?? 0),
        shareCount: Number(post['reposts_count'] ?? 0),
      },
      mediaUrls: (post['pic_urls'] as string[] | undefined)?.map((url) => url) ??
        (post['pic'] as string[])?.map((url) => url) ?? [],
      liked: Boolean(post['favorited']),
    };
  }

  private parseWeiboComment(comment: Record<string, unknown>, postId: string): CommentData {
    const user = comment['user'] as Record<string, unknown> | undefined;
    const createdAtVal = comment['created_at'];
    const createTime = typeof createdAtVal === 'string'
      ? new Date(createdAtVal).getTime()
      : 0;

    return {
      id: String(comment['id'] ?? comment['mid'] ?? ''),
      postId,
      authorId: String(user?.['id'] ?? ''),
      authorName: String(user?.['screen_name'] ?? ''),
      authorAvatar: String(user?.['avatar_large'] ?? ''),
      content: String(comment['text'] ?? ''),
      createTime,
      likeCount: Number(comment['like_counts'] ?? comment['like_count'] ?? 0),
      replyCount: Number(comment['reply_count'] ?? 0),
    };
  }

  private parseWeiboFollower(user: Record<string, unknown>): FollowerData {
    return {
      id: String(user['id'] ?? ''),
      nickname: String(user['screen_name'] ?? ''),
      avatar: String(user['avatar_large'] ?? ''),
      bio: String(user['description'] ?? ''),
      followerCount: Number(user['followers_count'] ?? 0),
      followingCount: Number(user['friends_count'] ?? 0),
      verified: Boolean(user['verified']),
    };
  }
}

// ============ B站 API 客户端 ============

export class BilibiliAPIClient extends BaseAPIClient {
  constructor() {
    super('https://api.bilibili.com');
  }

  async getProfile(userId: string): Promise<APIResponse<ProfileData>> {
    const url = `${this.baseUrl}/x/web-interface/card?mid=${encodeURIComponent(userId)}`;

    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const card = d['card'] as Record<string, unknown> | undefined;

    if (!card) return { success: false, error: 'User not found' };

    const liveRoom = card['live_room'] as Record<string, unknown> | undefined;
    const officialVerify = card['official_verify'] as Record<string, unknown> | undefined;

    return {
      success: true,
      data: {
        id: String(card['mid'] ?? userId),
        nickname: String(card['name'] ?? ''),
        avatar: String(card['face'] ?? ''),
        bio: String(card['sign'] ?? ''),
        followerCount: Number(card['fans'] ?? 0),
        followingCount: Number(card['attention'] ?? 0),
        likeCount: Number(card['likes'] ?? 0),
        verified: Boolean(officialVerify?.['type'] === 0),
        gender: card['sex'] === '男' ? 1 : card['sex'] === '女' ? 2 : 0,
        region: String(liveRoom?.['room_id'] ? '直播中' : ''),
      },
    };
  }

  async getPosts(userId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<PostData>>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 30;
    const url = `${this.baseUrl}/x/space/wbi/arc/search?mid=${encodeURIComponent(userId)}&pn=${page}&ps=${pageSize}&jsonp=jsonp`;

    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const list = d['list'] as Record<string, unknown> | undefined;
    const vlist = (list?.['vlist'] ?? list) as unknown[] ?? [];

    return {
      success: true,
      data: {
        items: vlist.map((v) => this.parseBiliVideo(v as Record<string, unknown>)),
        hasMore: Boolean(d['has_more']),
        total: Number(list?.['count'] ?? 0),
      },
    };
  }

  async getComments(postId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<CommentData>>> {
    const page = params?.page ?? 1;
    const url = `${this.baseUrl}/x/v2/reply/main?type=1&oid=${encodeURIComponent(postId)}&mode=3&pn=${page}&ps=20`;

    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const replies = d['replies'] as unknown[] ?? [];
    const config = d['config'] as Record<string, unknown> | undefined;

    return {
      success: true,
      data: {
        items: replies.map((r) => this.parseBiliComment(r as Record<string, unknown>, postId)),
        hasMore: Boolean((d['has_more'] as number) === 1),
        total: Number(config?.['total_count'] ?? 0),
      },
    };
  }

  async getFollowers(userId: string, params?: PaginationParams): Promise<APIResponse<PaginatedResponse<FollowerData>>> {
    const page = params?.page ?? 1;
    const url = `${this.baseUrl}/x/relation/followers?vmid=${encodeURIComponent(userId)}&pn=${page}&ps=20&jsonp=jsonp`;

    const raw = await this.fetch<Record<string, unknown>>(url);
    if (!raw.success || !raw.data) {
      return { success: false, error: raw.error, statusCode: raw.statusCode };
    }

    const d = raw.data;
    const list = d['list'] as unknown[] ?? [];

    return {
      success: true,
      data: {
        items: list.map((u) => this.parseBiliFollower(u as Record<string, unknown>)),
        hasMore: Boolean(d['has_more']),
        total: Number(d['total'] ?? 0),
      },
    };
  }

  private parseBiliVideo(video: Record<string, unknown>): PostData {
    const content = video['content'] as Record<string, unknown> | undefined;

    return {
      id: String(video['bvid'] ?? video['aid'] ?? ''),
      title: String(video['title'] ?? ''),
      description: String(video['description'] ?? ''),
      authorId: String(video['mid'] ?? ''),
      authorName: String(video['uname'] ?? ''),
      authorAvatar: String(video['face'] ?? ''),
      createTime: Number(video['created'] ?? 0) * 1000,
      stats: {
        viewCount: Number(video['play'] ?? video['view'] ?? 0),
        danmakuCount: Number(video['video_review'] ?? 0),
        likeCount: Number(video['like'] ?? 0),
        coinCount: Number(video['coin'] ?? 0),
        collectCount: Number(video['favorite'] ?? 0),
        shareCount: Number(video['share'] ?? 0),
        commentCount: Number(video['comment'] ?? 0),
      },
      mediaUrls: [`https://api.bilibili.com/video/${video['bvid'] ?? video['aid']}`],
      liked: Boolean(video['like_state']),
      bookmarked: Boolean(video['favorite_state']),
    };
  }

  private parseBiliComment(comment: Record<string, unknown>, postId: string): CommentData {
    const member = comment['member'] as Record<string, unknown> | undefined;
    const replies = comment['replies'] as unknown[] | undefined;
    const content = comment['content'] as Record<string, unknown> | undefined;

    return {
      id: String(comment['rpid'] ?? comment['oid'] ?? ''),
      postId,
      authorId: String(member?.['mid'] ?? ''),
      authorName: String(member?.['uname'] ?? ''),
      authorAvatar: String(member?.['avatar'] ?? ''),
      content: String(content?.['message'] ?? comment['content'] ?? ''),
      createTime: Number(comment['ctime'] ?? 0) * 1000,
      likeCount: Number(comment['like'] ?? 0),
      replyCount: Number(comment['rcount'] ?? 0),
      liked: Boolean(comment['action']),
      replies: replies?.map((r) => this.parseBiliComment(r as Record<string, unknown>, postId)),
    };
  }

  private parseBiliFollower(user: Record<string, unknown>): FollowerData {
    const vip = user['vip'] as Record<string, unknown> | undefined;

    return {
      id: String(user['mid'] ?? ''),
      nickname: String(user['uname'] ?? ''),
      avatar: String(user['face'] ?? ''),
      bio: String(user['sign'] ?? ''),
      followerCount: Number(user['fans'] ?? 0),
      followingCount: Number(user['attention'] ?? 0),
      verified: Boolean(vip?.['vipStatus']),
    };
  }
}

// ============ 工厂函数 ============

export type APIClient = DouyinAPIClient | XiaohongshuAPIClient | WeiboAPIClient | BilibiliAPIClient;

export function createAPIClient(platform: Platform): APIClient {
  switch (platform) {
    case 'douyin': return new DouyinAPIClient();
    case 'xiaohongshu': return new XiaohongshuAPIClient();
    case 'weibo': return new WeiboAPIClient();
    case 'bilibili': return new BilibiliAPIClient();
    default: throw new Error(`No API client for platform: ${platform}`);
  }
}

// ============ 批量操作 ============

export interface BatchResult<T> {
  success: boolean;
  results: Array<{ id: string; data?: T; error?: string }>;
}

export async function batchGetProfiles(
  client: APIClient,
  userIds: string[],
): Promise<BatchResult<ProfileData>> {
  const results = await Promise.allSettled(
    userIds.map(async (id) => ({ id, result: await client.getProfile(id) })),
  );

  return {
    success: results.every((r) => r.status === 'fulfilled' && r.value.result.success),
    results: results.map((r) => {
      if (r.status === 'rejected') {
        return { id: 'unknown', error: String(r.reason) };
      }
      const { id, result } = r.value;
      if (result.success && result.data) {
        return { id, data: result.data };
      }
      return { id, error: result.error };
    }),
  };
}
