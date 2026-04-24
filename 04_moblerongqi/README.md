# CreatorOS 仿真容器平台

> 云端移动端数字人格操作系统 — 一个容器内运行一个独立的"数字人格"，既能抓取数据，也能驱动应用行为。

**设计文档**: [MOBILE-SIM-SCRAPER-DESIGN.md](../MOBILE-SIM-SCRAPER-DESIGN.md) (v1.2)
**实施计划**: [IMPLEMENTATION-PLAN.md](../IMPLEMENTATION-PLAN.md)

---

## 项目结构

```
creator-os/
├── packages/
│   ├── core/          # 核心库：类型、配置、指纹、浏览器、Session、行为模拟
│   ├── container/      # 容器层：生命周期、容器池、策略、ADB 控制
│   ├── account/        # 账号层：账号池、状态机、登录态管理
│   ├── platform/       # 平台层：各平台适配器（抖音、小红书、微博等）
│   ├── scheduler/       # 调度层：任务队列、限速、重试
│   └── api/            # 接口层：REST API、WebSocket、MCP Server
├── tsconfig.base.json  # TypeScript 共享配置
├── vitest.config.ts     # 单元测试配置
├── eslint.config.mjs    # ESLint 配置
└── .env.example        # 环境变量模板
```

---

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0（推荐）或 npm / yarn

### 安装

```bash
pnpm install
```

### 类型检查

```bash
pnpm typecheck
```

### 运行测试

```bash
pnpm test
```

### 启动开发

```bash
pnpm dev
```

---

## 核心模块

### @creator-os/core

浏览器指纹、Session 持久化、行为模拟的最小可执行单元。

```typescript
import {
  buildInitScript,
  deviceProfiles,
  platformConfigs,
  BrowserContainer,
} from '@creator-os/core';

// 1. 选设备档案
const profile = deviceProfiles.pixel_8;

// 2. 生成指纹注入脚本
const initScript = buildInitScript(profile);

// 3. 在 Playwright 中注入
await page.addInitScript(initScript);
await page.goto('https://douyin.com');
```

### @creator-os/container

容器生命周期、容器池、运营策略矩阵。

### @creator-os/account

多账号池管理、账号状态机（new → active → cooling → banned）。

### @creator-os/scheduler

任务优先级队列、按平台限速、失败重试。

### @creator-os/api

MCP Server（AI Agent 接口）和 REST API。

---

## 平台支持

| 平台 | 浏览器模式 | 原生 App 模式 | 发布 API | 推荐策略 |
|------|-----------|-------------|---------|---------|
| 抖音 | ✅ | ✅ | 需申请 | mobile_4g 代理 |
| 小红书 | ✅ | ✅ | ❌ | mobile_4g 代理，7天养号 |
| 微博 | ✅ | ❌ | ✅ OAuth | residential 代理 |
| Bilibili | ✅ | ❌ | 需申请 | residential 代理 |
| 淘宝 | ✅ | ❌ | 企业认证 | residential 代理 |
| TikTok | ✅ | ✅ | Direct Post API | mobile_4g 代理 |

---

## 设计原则

1. **身份设计，而非指纹随机** — 每个容器绑定固定设备档案、代理 IP、账号，形成稳定数字人格
2. **有规律的随机，而非无规律噪声** — 行为模拟使用人类速度曲线、惯性滚动、随机时序
3. **账号是长期资产** — 新账号需要 3-7 天养号阶段再投入使用
4. **TLS 指纹最高优先级** — 在 TCP 握手阶段即决定是否放行

---

## 版本

- **文档版本**: MOBILE-SIM-SCRAPER-DESIGN.md v1.2
- **制定计划**: IMPLEMENTATION-PLAN.md v1.0
