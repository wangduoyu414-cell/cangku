# haochi 目录配置与交付说明

本文档只保留当前交付包真正有用的事实，删除与当前接手无关的旧分支说明。

## 1. 这份目录的作用

`haochi` 目录不是开发仓库，而是当前服务器部署的本地交付包。  
它承担三件事：

1. 当前部署事实源
2. 后续迁移或重装时的最小交付目录
3. 把源码、数据库快照、隧道脚本、服务器配置从主工作区拆开

## 2. 当前目录结构

```text
D:\codex-haochi\haochi
├─ .secrets/                         # SSH 私钥副本，敏感目录
├─ deploy-docs/                      # 正式部署说明副本
├─ docs/                             # 当前交接文档副本
├─ server-data-clean-snapshot/       # 推荐数据库快照
├─ server-data-live-snapshot/        # 运行中实时快照
├─ server-source/                    # 当前服务器构建源码集
├─ server-source.tgz                 # 上传服务器时使用的源码包
├─ open-server-admin-tunnel.cmd      # 本地打开后台隧道
├─ open-server-admin-tunnel.ps1      # 本地打开后台隧道
└─ README-部署备份.md
```

## 3. 哪些内容可以交付

### 3.1 正式可交付

- `server-source/`
- `server-source.tgz`
- `server-data-clean-snapshot/`
- `deploy-docs/`
- `docs/`

### 3.2 不能随意分发

- `.secrets/`

原因：

- 该目录保存 SSH 私钥
- 文档和源码可以交付
- 私钥必须单独安全移交

## 4. `server-source` 当前包含的部署事实

这份源码不是纯净镜像，已经写入当前服务器事实。

### 4.1 当前已写入的关键事实

- `docker-compose.server.yml` 中已写死：

```text
CODEXMANAGER_UPSTREAM_PROXY_URL=http://10.2.0.15:17890
```

- `nginx/codexmanager-ip.conf` 中已写死当前公网 `IP`：

```text
81.70.170.24
```

### 4.2 当前 `IP` 入口承载的职责

当前 `81.70.170.24` 仍然承载两类 `CodexManager` 入口：

1. `CodexManager API` 前缀入口

```text
https://81.70.170.24/codex
```

2. `CodexManager` 后台端口入口

```text
https://81.70.170.24:8444/accounts/
```

补充说明：

- `https://81.70.170.24/` 根路径已不再承载 `Multica`
- 当前根路径与 `/health` 返回 `410`

### 4.3 当前 `nginx/codexmanager-ip.conf` 的真实职责

- `/codex/` 前缀代理到 `127.0.0.1:48760`
- `8444` 端口代理到 `127.0.0.1:48761`
- `443` 根路径其余请求直接返回 `410`

### 4.4 这意味着什么

- 如果把这份交付包拿去另一台机器复刻
- 至少要重新确认：
  - 公网 `IP`
  - `Nginx` 端口与路径映射
  - 是否继续使用 `8444`
  - 是否保留 `410` 的根路径行为

也就是说，这份目录不能当成“任何机器通用包”直接原样使用。

## 5. 数据快照说明

### 5.1 当前推荐快照

```text
server-data-clean-snapshot/codexmanager.clean.db
```

原因：

- 它是通过 SQLite 在线 `backup` 导出的单文件一致性快照
- 当前已经补齐 `accounts.group_name`
- 不依赖 `-wal` / `-shm`

### 5.2 当前不推荐优先使用

```text
server-data-live-snapshot/
```

原因：

- 里面保留的是运行态数据库文件组
- 更适合抢救式备份
- 不适合作为优先交付物

## 6. 从 `haochi` 目录重新部署的最小步骤

### 6.1 你至少需要准备

- `server-source.tgz`
- `server-data-clean-snapshot/codexmanager.clean.db`
- 一把能登录新服务器的 SSH 私钥

### 6.2 新服务器准备目录

```bash
mkdir -p /opt/codexmanager/app
mkdir -p /opt/codexmanager/data
mkdir -p /var/www/certbot
```

### 6.3 上传源码与数据库

```powershell
scp -i <SSH_KEY_PATH> D:\codex-haochi\haochi\server-source.tgz root@<SERVER_IP>:/opt/codexmanager/server-source.tgz
scp -i <SSH_KEY_PATH> D:\codex-haochi\haochi\server-data-clean-snapshot\codexmanager.clean.db root@<SERVER_IP>:/opt/codexmanager/data/codexmanager.db
```

### 6.4 解包源码

```bash
cd /opt/codexmanager
tar -xzf server-source.tgz -C app
shopt -s dotglob nullglob
mv /opt/codexmanager/app/server-source/* /opt/codexmanager/app/ || true
rmdir /opt/codexmanager/app/server-source || true
```

### 6.5 修正数据目录权限

```bash
chown -R 10001:10001 /opt/codexmanager/data
chmod 750 /opt/codexmanager/data
chmod 640 /opt/codexmanager/data/codexmanager.db
```

### 6.6 启动服务

```bash
cd /opt/codexmanager/app
docker compose -f docker-compose.server.yml up -d --build
```

## 7. 本地隧道脚本

### 7.1 当前用途

`open-server-admin-tunnel.ps1` 与 `open-server-admin-tunnel.cmd` 用于在本地打开后台 SSH 正向隧道。

### 7.2 当前脚本默认目标

- SSH 私钥路径：

```text
D:\codex-haochi\haochi\.secrets\qimi.pem
```

- 目标：

```text
root@81.70.170.24
```

- 映射关系：

```text
本地 48761 -> 服务器 127.0.0.1:48761
```

## 8. 当前接手顺序建议

1. 先读 `01_服务器配置与运维手册.md`
2. 再读 `03_代理与隧道配置手册.md`
3. 最后看本文件确认交付边界

## 9. 敏感信息移交要求

不要直接写进共享文档：

- SSH 私钥
- Web 后台密码明文
- 平台 `API Key（接口密钥）`
- 账号 `token（令牌）`

如果必须交接：

- 文档里只写“需要单独移交”
- 敏感信息走单独安全渠道
