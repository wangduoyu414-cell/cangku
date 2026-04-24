// 平台选择器定义 — 抖音、小红书、微博、B站的 CSS 选择器和 API 端点

import type { Platform } from '@creator-os/core';

// ============ 基础选择器类型 ============

export interface LoginSelectors {
  usernameInput: string;
  passwordInput: string;
  submitButton: string;
  qrCode: string;
  smsTab: string;
  phoneInput: string;
  smsCodeInput: string;
  sendCodeButton: string;
}

export interface FeedSelectors {
  feedContainer: string;
  itemContainer: string;
  nextPageButton: string;
  infiniteScrollTrigger: string;
  loadingIndicator: string;
  emptyState: string;
}

export interface CommentSelectors {
  commentSection: string;
  commentItem: string;
  commentAuthor: string;
  commentContent: string;
  commentTime: string;
  likeButton: string;
  replyButton: string;
  loadMoreButton: string;
  replyInput: string;
  submitReplyButton: string;
}

export interface ProfileSelectors {
  profileContainer: string;
  avatar: string;
  nickname: string;
  bio: string;
  followCount: string;
  followerCount: string;
  likeCount: string;
  followButton: string;
  tabList: string;
  postsTab: string;
  likedTab: string;
}

export interface PublishSelectors {
  publishButton: string;
  uploadInput: string;
  uploadProgress: string;
  titleInput: string;
  contentEditor: string;
  tagInput: string;
  tagSuggestion: string;
  visibilityButton: string;
  submitButton: string;
  successIndicator: string;
  errorIndicator: string;
}

export interface InteractionSelectors {
  likeButton: string;
  likeCount: string;
  commentButton: string;
  shareButton: string;
  bookmarkButton: string;
  followButton: string;
  dmButton: string;
  moreOptionsButton: string;
}

export interface APIEndpoints {
  base: string;
  profile: string;
  posts: string;
  postDetail: string;
  comments: string;
  followers: string;
  following: string;
  search: string;
  interaction: string;
  dm: string;
}

// ============ 平台选择器集合 ============

export interface PlatformSelectors {
  login: LoginSelectors;
  feed: FeedSelectors;
  comment: CommentSelectors;
  profile: ProfileSelectors;
  publish: PublishSelectors;
  interaction: InteractionSelectors;
  api: APIEndpoints;
}

export const platformSelectors: Record<Platform, PlatformSelectors> = {
  douyin: {
    login: {
      usernameInput: 'input[name="username"], input[placeholder*="手机"]',
      passwordInput: 'input[name="password"], input[placeholder*="密码"]',
      submitButton: '.login-btn, [data-e2e="login-btn"]',
      qrCode: '.qrcode-img, [data-e2e="qrcode"]',
      smsTab: '.tab-sms, [data-type="sms"]',
      phoneInput: 'input[placeholder*="手机号"]',
      smsCodeInput: 'input[placeholder*="验证码"]',
      sendCodeButton: '.send-code-btn, [data-e2e="send-code"]',
    },

    feed: {
      feedContainer: '.feed-list, [data-e2e="feed-list"]',
      itemContainer: '[data-e2e="video-item"], .video-item, [class*="video-card"]',
      nextPageButton: '.next-page, [data-e2e="next-page"]',
      infiniteScrollTrigger: '.infinite-scroll-trigger',
      loadingIndicator: '.loading, [data-e2e="loading"]',
      emptyState: '.empty-state, [data-e2e="empty"]',
    },

    comment: {
      commentSection: '.comment-list, [data-e2e="comment-list"]',
      commentItem: '[data-e2e="comment-item"], .comment-item',
      commentAuthor: '[data-e2e="comment-author"], .comment-author',
      commentContent: '[data-e2e="comment-text"], .comment-text',
      commentTime: '.comment-time, [class*="time"]',
      likeButton: '.comment-like, [class*="like"]',
      replyButton: '.reply-btn, [class*="reply"]',
      loadMoreButton: '.load-more, [data-e2e="load-more"]',
      replyInput: '.reply-input textarea, [data-e2e="reply-input"]',
      submitReplyButton: '.submit-reply, [data-e2e="submit-reply"]',
    },

    profile: {
      profileContainer: '.user-info, [data-e2e="user-info"]',
      avatar: '.avatar-img, [data-e2e="avatar"]',
      nickname: '.nickname, [data-e2e="nickname"]',
      bio: '.bio, .user-desc, [data-e2e="bio"]',
      followCount: '[data-e2e="follow-count"], .following-count',
      followerCount: '[data-e2e="follower-count"], .follower-count',
      likeCount: '[data-e2e="like-count"], .liked-count',
      followButton: '[data-e2e="follow-btn"], .follow-btn',
      tabList: '.user-tab, [data-e2e="tab-list"]',
      postsTab: '[data-e2e="posts-tab"], .tab-posts',
      likedTab: '[data-e2e="liked-tab"], .tab-liked',
    },

    publish: {
      publishButton: '.publish-btn, [data-e2e="publish-btn"]',
      uploadInput: 'input[type="file"], .upload-input',
      uploadProgress: '.video-upload-progress, [data-e2e="upload-progress"]',
      titleInput: '.desc-textarea, [data-e2e="title-input"]',
      contentEditor: '.desc-textarea, .editor-content, [data-e2e="editor"]',
      tagInput: '.tag-input, [data-e2e="tag-input"]',
      tagSuggestion: '.tag-suggestion, [data-e2e="tag-suggestion"]',
      visibilityButton: '.visibility-selector, [data-e2e="visibility"]',
      submitButton: '.submit-btn, [data-e2e="submit"]',
      successIndicator: '.publish-success, [data-e2e="publish-success"]',
      errorIndicator: '.publish-error, [data-e2e="error"]',
    },

    interaction: {
      likeButton: '[data-e2e="like-button"], .like-btn, [class*="like"]',
      likeCount: '[data-e2e="like-count"], .like-count',
      commentButton: '[data-e2e="comment-icon"], .comment-icon',
      shareButton: '[data-e2e="share-button"], .share-btn',
      bookmarkButton: '[data-e2e="collect-button"], .collect-btn',
      followButton: '[data-e2e="follow-button"], .follow-btn',
      dmButton: '[data-e2e="dm-btn"], .dm-btn',
      moreOptionsButton: '[data-e2e="more-btn"], .more-btn',
    },

    api: {
      base: 'https://www.douyin.com',
      profile: '/aweme/v1/web/user/profile/other/',
      posts: '/aweme/v1/web/aweme/post/',
      postDetail: '/aweme/v1/web/aweme/detail/',
      comments: '/aweme/v1/web/comment/list/',
      followers: '/aweme/v1/web/user/follower/list/',
      following: '/aweme/v1/web/user/following/list/',
      search: '/aweme/v1/web/search/item/',
      interaction: '/aweme/v1/web/commit/item/action/',
      dm: '/im/v1/web/chat/create/',
    },
  },

  xiaohongshu: {
    login: {
      usernameInput: 'input[placeholder*="手机"]',
      passwordInput: 'input[type="password"]',
      submitButton: '.login-btn, [data-e2e="login-btn"]',
      qrCode: '.qrcode, [data-e2e="qrcode"]',
      smsTab: '[data-type="sms"], .sms-tab',
      phoneInput: 'input[placeholder*="手机号"]',
      smsCodeInput: 'input[placeholder*="验证码"]',
      sendCodeButton: '.send-code, [data-e2e="send-code"]',
    },

    feed: {
      feedContainer: '.note-list, [data-e2e="note-list"]',
      itemContainer: '[data-e2e="note-card"], .note-item, .cover',
      nextPageButton: '.load-more, [data-e2e="load-more"]',
      infiniteScrollTrigger: '.infinite-scroll-trigger',
      loadingIndicator: '.loading, [data-e2e="loading"]',
      emptyState: '.empty-state, [data-e2e="empty"]',
    },

    comment: {
      commentSection: '.comment-list, [data-e2e="comment-list"]',
      commentItem: '[data-e2e="comment-item"], .comment-item',
      commentAuthor: '[data-e2e="author"], .author-name',
      commentContent: '[data-e2e="content"], .comment-content',
      commentTime: '.comment-time',
      likeButton: '[class*="like"]',
      replyButton: '.reply-btn',
      loadMoreButton: '.load-more',
      replyInput: '.reply-input textarea',
      submitReplyButton: '.reply-submit',
    },

    profile: {
      profileContainer: '.user-info',
      avatar: '.avatar, [data-e2e="avatar"]',
      nickname: '.nickname, [data-e2e="nickname"]',
      bio: '.user-desc, [data-e2e="bio"]',
      followCount: '[data-e2e="following-count"]',
      followerCount: '[data-e2e="fans-count"]',
      likeCount: '[data-e2e="like-count"]',
      followButton: '[data-e2e="follow-btn"], .follow-btn',
      tabList: '.tab-list, [data-e2e="tab-list"]',
      postsTab: '[data-e2e="notes-tab"]',
      likedTab: '[data-e2e="liked-tab"]',
    },

    publish: {
      publishButton: '.publish-btn, [data-e2e="publish-btn"]',
      uploadInput: 'input[type="file"], .upload-btn',
      uploadProgress: '.upload-progress, .upload-preview',
      titleInput: '.content-editor, .note-editor',
      contentEditor: '.content-editor, .note-editor, textarea',
      tagInput: '.tag-input, .hashtag-input',
      tagSuggestion: '.tag-suggestion, .hashtag-suggestion',
      visibilityButton: '.visibility-btn, .privacy-btn',
      submitButton: '.submit-btn, [data-e2e="publish"]',
      successIndicator: '[data-e2e="publish-success"]',
      errorIndicator: '[data-e2e="error"]',
    },

    interaction: {
      likeButton: '[data-e2e="like-btn"], .like-btn',
      likeCount: '.like-count',
      commentButton: '[data-e2e="comment-btn"]',
      shareButton: '[data-e2e="share-btn"]',
      bookmarkButton: '[data-e2e="collect-btn"], .collect-btn',
      followButton: '[data-e2e="follow-btn"], .follow-btn',
      dmButton: '.dm-btn',
      moreOptionsButton: '.more-btn',
    },

    api: {
      base: 'https://edith.xiaohongshu.com',
      profile: '/api/sns/web/v1/user/otherinfo',
      posts: '/api/sns/web/v1/user_posted',
      postDetail: '/api/sns/web/v1/feed',
      comments: '/api/sns/web/v1/comment/list',
      followers: '/api/sns/web/v1/user/follower',
      following: '/api/sns/web/v1/user/following',
      search: '/api/sns/web/v1/search_note',
      interaction: '/api/sns/web/v1/comment',
      dm: '/api/im/v1/chat/create',
    },
  },

  weibo: {
    login: {
      usernameInput: 'input[name="username"], input[placeholder*="手机"]',
      passwordInput: 'input[name="password"]',
      submitButton: '.W_btn_a, [data-e2e="login-submit"]',
      qrCode: '.qrcode, [data-e2e="qrcode"]',
      smsTab: '[data-type="sms"]',
      phoneInput: 'input[placeholder*="手机"]',
      smsCodeInput: 'input[placeholder*="验证码"]',
      sendCodeButton: '.send-code',
    },

    feed: {
      feedContainer: '.woo-panel-main, [data-e2e="feed-list"]',
      itemContainer: '[data-e2e="weibo-item"], .woo-panel-main, [class*="feed-item"]',
      nextPageButton: '.next, [data-e2e="next-page"]',
      infiniteScrollTrigger: '.infinite-scroll-trigger',
      loadingIndicator: '.loading',
      emptyState: '.empty-tip',
    },

    comment: {
      commentSection: '.comment-list, [data-e2e="comment-list"]',
      commentItem: '[data-e2e="comment-item"], .comment-item',
      commentAuthor: '[data-e2e="comment-author"], .comment-author',
      commentContent: '[data-e2e="comment-text"], .comment-text',
      commentTime: '.comment-time',
      likeButton: '.woo-like-icon',
      replyButton: '.reply-btn',
      loadMoreButton: '.load-more',
      replyInput: '.reply-input textarea',
      submitReplyButton: '.reply-submit',
    },

    profile: {
      profileContainer: '.PCD_user_info',
      avatar: '.avatar, [data-e2e="avatar"]',
      nickname: '.username, [data-e2e="nickname"]',
      bio: '.user_desc, [data-e2e="bio"]',
      followCount: '.following a span',
      followerCount: '.followers a span',
      likeCount: '.like-count',
      followButton: '[data-e2e="follow-btn"]',
      tabList: '.tab-nav, [data-e2e="tab-list"]',
      postsTab: '[data-e2e="weibo-tab"]',
      likedTab: '[data-e2e="like-tab"]',
    },

    publish: {
      publishButton: '[data-e2e="publish-btn"], .publish-btn',
      uploadInput: 'input[type="file"]',
      uploadProgress: '.media-preview, .upload-progress',
      titleInput: '.editor-title',
      contentEditor: '.editor-textarea, textarea',
      tagInput: '.tag-input',
      tagSuggestion: '.tag-suggestion',
      visibilityButton: '[data-e2e="visibility-btn"]',
      submitButton: '.W_btn_a',
      successIndicator: '[data-e2e="publish-success"]',
      errorIndicator: '.layer_error',
    },

    interaction: {
      likeButton: '[data-e2e="like-btn"], .woo-like-icon',
      likeCount: '.like-count',
      commentButton: '[data-e2e="comment-link"], .woo-comment-icon',
      shareButton: '[data-e2e="share-btn"]',
      bookmarkButton: '.woo-collect-icon',
      followButton: '[data-e2e="follow-btn"]',
      dmButton: '[data-e2e="dm-btn"]',
      moreOptionsButton: '.more-btn',
    },

    api: {
      base: 'https://weibo.com',
      profile: '/ajax/profile/info',
      posts: '/ajax/feed/friendstimeline',
      postDetail: '/ajax/feed/show',
      comments: '/ajax/comments/show',
      followers: '/ajax/friendships/friends',
      following: '/ajax/friendships/followers',
      search: '/ajax/search',
      interaction: '/ajax/like/like',
      dm: '/ajax/direct_messages',
    },
  },

  bilibili: {
    login: {
      usernameInput: 'input[name="username"], input[placeholder*="手机"]',
      passwordInput: 'input[name="password"]',
      submitButton: '.btn-login, [data-e2e="login-submit"]',
      qrCode: '.qrcode, [data-e2e="qrcode"]',
      smsTab: '[data-type="sms"]',
      phoneInput: 'input[placeholder*="手机"]',
      smsCodeInput: 'input[placeholder*="验证码"]',
      sendCodeButton: '.send-code-btn',
    },

    feed: {
      feedContainer: '.video-list, [data-e2e="video-list"]',
      itemContainer: '[data-e2e="video-card"], .video-item, .bili-video-card',
      nextPageButton: '.next-page, [data-e2e="next"]',
      infiniteScrollTrigger: '.infinite-scroll-trigger',
      loadingIndicator: '.loading',
      emptyState: '.empty-state',
    },

    comment: {
      commentSection: '.comment-list, [data-e2e="comment-list"]',
      commentItem: '[data-e2e="comment-item"], .comment-item',
      commentAuthor: '[data-e2e="uname"], .uname',
      commentContent: '[data-e2e="msg"], .comment-content',
      commentTime: '.time, .comment-time',
      likeButton: '.like-btn',
      replyButton: '.reply-btn',
      loadMoreButton: '.load-more',
      replyInput: '.reply-input textarea',
      submitReplyButton: '.reply-submit',
    },

    profile: {
      profileContainer: '.user-info, .bili-user-profile',
      avatar: '.avatar, .bili-avatar',
      nickname: '.nickname, .uname',
      bio: '.description, .sign',
      followCount: '.following-count',
      followerCount: '.follower-count',
      likeCount: '.like-count',
      followButton: '.be-relation-follow, [data-e2e="follow-btn"]',
      tabList: '.tab-list, .bili-tab-list',
      postsTab: '[data-e2e="archive-tab"]',
      likedTab: '[data-e2e="like-tab"]',
    },

    publish: {
      publishButton: '.upload-btn, [data-e2e="publish-btn"]',
      uploadInput: '.upload-input, input[type="file"]',
      uploadProgress: '.upload-progress, .file-uploading',
      titleInput: '.title-input, .input-title',
      contentEditor: '.desc-textarea, .bili-dyn-textarea',
      tagInput: '.tag-input, .bili-tag-input',
      tagSuggestion: '.tag-suggestion',
      visibilityButton: '.privacy-selector, .visibility-btn',
      submitButton: '.submit-btn, .pub-btn',
      successIndicator: '[data-e2e="publish-success"]',
      errorIndicator: '.error-tip',
    },

    interaction: {
      likeButton: '.like-btn, .bili-dyn-action-icon--like',
      likeCount: '.like-count',
      commentButton: '.comment-btn, .bili-dyn-action-icon--comment',
      shareButton: '.share-btn, .bili-dyn-action-icon--share',
      bookmarkButton: '.coin-btn',
      followButton: '.be-relation-follow',
      dmButton: '.dm-btn',
      moreOptionsButton: '.more-btn',
    },

    api: {
      base: 'https://api.bilibili.com',
      profile: '/x/web-interface/card',
      posts: '/x/space/wbi/arc/search',
      postDetail: '/x/web-interface/view',
      comments: '/x/v2/reply/main',
      followers: '/x/relation/followers',
      following: '/x/relation/followings',
      search: '/x/web-interface/search/type',
      interaction: '/x/v2/reply/action',
      dm: '/x/dm/wbi/v1/msg/list',
    },
  },

  taobao: {
    login: {
      usernameInput: 'input[name="loginId"], #fm-login-id',
      passwordInput: 'input[name="password"], #fm-login-password',
      submitButton: '.fm-button, #login-btn',
      qrCode: '.qrcode-img',
      smsTab: '.sms-tab',
      phoneInput: 'input[name="phone"]',
      smsCodeInput: 'input[name="smsCode"]',
      sendCodeButton: '.send-code',
    },
    feed: {
      feedContainer: '.items, .product-list',
      itemContainer: '.item, .product-item',
      nextPageButton: '.next-page',
      infiniteScrollTrigger: '.infinite-trigger',
      loadingIndicator: '.loading',
      emptyState: '.empty',
    },
    comment: {
      commentSection: '.reviews',
      commentItem: '.review-item',
      commentAuthor: '.reviewer',
      commentContent: '.review-content',
      commentTime: '.review-time',
      likeButton: '.like-btn',
      replyButton: '.reply-btn',
      loadMoreButton: '.load-more',
      replyInput: '.reply-input textarea',
      submitReplyButton: '.submit-reply',
    },
    profile: {
      profileContainer: '.user-info',
      avatar: '.avatar',
      nickname: '.nickname',
      bio: '.bio',
      followCount: '.following-count',
      followerCount: '.follower-count',
      likeCount: '.liked-count',
      followButton: '.follow-btn',
      tabList: '.tab-list',
      postsTab: '.posts-tab',
      likedTab: '.liked-tab',
    },
    publish: {
      publishButton: '.publish-btn',
      uploadInput: 'input[type="file"]',
      uploadProgress: '.upload-progress',
      titleInput: '.title-input',
      contentEditor: '.content-editor',
      tagInput: '.tag-input',
      tagSuggestion: '.tag-suggestion',
      visibilityButton: '.visibility-btn',
      submitButton: '.submit-btn',
      successIndicator: '.success',
      errorIndicator: '.error',
    },
    interaction: {
      likeButton: '.like-btn',
      likeCount: '.like-count',
      commentButton: '.comment-btn',
      shareButton: '.share-btn',
      bookmarkButton: '.collect-btn',
      followButton: '.follow-btn',
      dmButton: '.dm-btn',
      moreOptionsButton: '.more-btn',
    },
    api: {
      base: 'https://api.taobao.com',
      profile: '/rest/user/info',
      posts: '/rest/product/list',
      postDetail: '/rest/product/detail',
      comments: '/rest/comment/list',
      followers: '/rest/user/followers',
      following: '/rest/user/following',
      search: '/rest/search',
      interaction: '/rest/interaction',
      dm: '/rest/dm',
    },
  },

  jd: {
    login: {
      usernameInput: 'input[name="username"], #username',
      passwordInput: 'input[name="password"], #password',
      submitButton: '.login-btn, #login-btn',
      qrCode: '.qrcode',
      smsTab: '.sms-tab',
      phoneInput: 'input[name="phone"]',
      smsCodeInput: 'input[name="smsCode"]',
      sendCodeButton: '.send-code',
    },
    feed: {
      feedContainer: '.product-list',
      itemContainer: '.product-item',
      nextPageButton: '.next',
      infiniteScrollTrigger: '.scroll-trigger',
      loadingIndicator: '.loading',
      emptyState: '.empty',
    },
    comment: {
      commentSection: '.comments',
      commentItem: '.comment-item',
      commentAuthor: '.user-name',
      commentContent: '.comment-text',
      commentTime: '.time',
      likeButton: '.like',
      replyButton: '.reply',
      loadMoreButton: '.load-more',
      replyInput: '.reply-input textarea',
      submitReplyButton: '.reply-submit',
    },
    profile: {
      profileContainer: '.user-info',
      avatar: '.avatar',
      nickname: '.nickname',
      bio: '.intro',
      followCount: '.following',
      followerCount: '.followers',
      likeCount: '.likes',
      followButton: '.follow',
      tabList: '.tabs',
      postsTab: '.posts',
      likedTab: '.liked',
    },
    publish: {
      publishButton: '.publish',
      uploadInput: 'input[type="file"]',
      uploadProgress: '.progress',
      titleInput: '.title',
      contentEditor: '.editor',
      tagInput: '.tag',
      tagSuggestion: '.suggestion',
      visibilityButton: '.visibility',
      submitButton: '.submit',
      successIndicator: '.success',
      errorIndicator: '.error',
    },
    interaction: {
      likeButton: '.like',
      likeCount: '.like-count',
      commentButton: '.comment',
      shareButton: '.share',
      bookmarkButton: '.collect',
      followButton: '.follow',
      dmButton: '.message',
      moreOptionsButton: '.more',
    },
    api: {
      base: 'https://api.jd.com',
      profile: '/api/user/info',
      posts: '/api/product/list',
      postDetail: '/api/product/detail',
      comments: '/api/comment/list',
      followers: '/api/user/followers',
      following: '/api/user/following',
      search: '/api/search',
      interaction: '/api/interaction',
      dm: '/api/message',
    },
  },

  pinduoduo: {
    login: {
      usernameInput: 'input[name="phone"], .phone-input',
      passwordInput: 'input[type="password"]',
      submitButton: '.login-btn',
      qrCode: '.qrcode',
      smsTab: '.sms-login',
      phoneInput: 'input[name="phone"]',
      smsCodeInput: 'input[name="code"]',
      sendCodeButton: '.get-code',
    },
    feed: {
      feedContainer: '.goods-list',
      itemContainer: '.goods-item',
      nextPageButton: '.more',
      infiniteScrollTrigger: '.trigger',
      loadingIndicator: '.loading',
      emptyState: '.empty',
    },
    comment: {
      commentSection: '.comments',
      commentItem: '.comment',
      commentAuthor: '.author',
      commentContent: '.content',
      commentTime: '.time',
      likeButton: '.like',
      replyButton: '.reply',
      loadMoreButton: '.load-more',
      replyInput: '.input textarea',
      submitReplyButton: '.submit',
    },
    profile: {
      profileContainer: '.profile',
      avatar: '.avatar',
      nickname: '.name',
      bio: '.desc',
      followCount: '.following',
      followerCount: '.followers',
      likeCount: '.likes',
      followButton: '.follow-btn',
      tabList: '.tabs',
      postsTab: '.posts',
      likedTab: '.liked',
    },
    publish: {
      publishButton: '.publish',
      uploadInput: 'input[type="file"]',
      uploadProgress: '.progress',
      titleInput: '.title-input',
      contentEditor: '.editor',
      tagInput: '.tag-input',
      tagSuggestion: '.suggestion',
      visibilityButton: '.visibility',
      submitButton: '.submit',
      successIndicator: '.success',
      errorIndicator: '.error',
    },
    interaction: {
      likeButton: '.like',
      likeCount: '.like-count',
      commentButton: '.comment',
      shareButton: '.share',
      bookmarkButton: '.collect',
      followButton: '.follow',
      dmButton: '.dm',
      moreOptionsButton: '.more',
    },
    api: {
      base: 'https://api.pinduoduo.com',
      profile: '/api/user/info',
      posts: '/api/goods/list',
      postDetail: '/api/goods/detail',
      comments: '/api/comment/list',
      followers: '/api/user/followers',
      following: '/api/user/following',
      search: '/api/search',
      interaction: '/api/interaction',
      dm: '/api/message',
    },
  },

  tiktok: {
    login: {
      usernameInput: 'input[name="username"]',
      passwordInput: 'input[name="password"]',
      submitButton: '[data-e2e="login-btn"]',
      qrCode: '.qrcode',
      smsTab: '[data-type="sms"]',
      phoneInput: 'input[placeholder*="phone"]',
      smsCodeInput: 'input[placeholder*="code"]',
      sendCodeButton: '.send-code',
    },
    feed: {
      feedContainer: '[data-e2e="推荐"]',
      itemContainer: '[data-e2e="video-item"]',
      nextPageButton: '.next',
      infiniteScrollTrigger: '.trigger',
      loadingIndicator: '.loading',
      emptyState: '.empty',
    },
    comment: {
      commentSection: '.comment-list',
      commentItem: '.comment-item',
      commentAuthor: '.author',
      commentContent: '.content',
      commentTime: '.time',
      likeButton: '.like',
      replyButton: '.reply',
      loadMoreButton: '.more',
      replyInput: '.reply-input textarea',
      submitReplyButton: '.submit',
    },
    profile: {
      profileContainer: '.profile-container',
      avatar: '.avatar',
      nickname: '.nickname',
      bio: '.bio',
      followCount: '.following',
      followerCount: '.followers',
      likeCount: '.likes',
      followButton: '.follow',
      tabList: '.tabs',
      postsTab: '.videos',
      likedTab: '.liked',
    },
    publish: {
      publishButton: '.plus-btn',
      uploadInput: 'input[type="file"]',
      uploadProgress: '.progress',
      titleInput: '.title',
      contentEditor: '.desc',
      tagInput: '.tag',
      tagSuggestion: '.suggestion',
      visibilityButton: '.visibility',
      submitButton: '.post',
      successIndicator: '.success',
      errorIndicator: '.error',
    },
    interaction: {
      likeButton: '[data-e2e="like-button"]',
      likeCount: '.like-count',
      commentButton: '[data-e2e="comment-button"]',
      shareButton: '[data-e2e="share-button"]',
      bookmarkButton: '[data-e2e="bookmark-button"]',
      followButton: '[data-e2e="follow-button"]',
      dmButton: '.dm',
      moreOptionsButton: '.more',
    },
    api: {
      base: 'https://www.tiktok.com',
      profile: '/api/user/detail',
      posts: '/api/post/list',
      postDetail: '/api/post/detail',
      comments: '/api/comment/list',
      followers: '/api/user/followers',
      following: '/api/user/following',
      search: '/api/search',
      interaction: '/api/interaction',
      dm: '/api/message',
    },
  },
};

// ============ 辅助函数 ============

export function getSelectors(platform: Platform): PlatformSelectors {
  return platformSelectors[platform];
}

export function getAPIEndpoints(platform: Platform): APIEndpoints {
  return platformSelectors[platform]!.api;
}

// ============ 常用选择器快捷方式 ============

export const commonSelectors = {
  videoItem: '[data-e2e="video-item"], .video-item, .cover',
  postItem: '[data-e2e="note-card"], .note-item, .cover',
  weiboItem: '[data-e2e="weibo-item"], .woo-panel-main',
  feedContainer: '.feed-list, .note-list, .video-list',
  loadMore: '.load-more, .next, [data-e2e="load-more"]',
  infiniteScroll: '.infinite-scroll-trigger, .scroll-trigger',
  loading: '.loading, [data-e2e="loading"]',
  empty: '.empty-state, .empty, [data-e2e="empty"]',
  success: '.success, [data-e2e="success"]',
  error: '.error, [data-e2e="error"]',
};

export const interactionSelectors = {
  like: '[data-e2e*="like"], .like-btn, [class*="like"]',
  follow: '[data-e2e*="follow"], .follow-btn, [class*="follow"]',
  comment: '[data-e2e*="comment"], .comment-btn, [class*="comment"]',
  bookmark: '[data-e2e*="collect"], .collect-btn, [class*="collect"]',
  share: '[data-e2e*="share"], .share-btn, [class*="share"]',
  dm: '.dm-btn, [data-e2e*="dm"]',
};
