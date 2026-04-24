# Codex 最简配置方式

本文档只保留当前唯一推荐的一套配置。  
当前不再写多套入口，也不再保留旧域名配置分支。

目标：

- 不跑脚本
- 不每次手工输入一堆环境变量
- 只固定一次 `config.toml（配置文件）`
- 只固定一次 `OPENAI_API_KEY（标准接口密钥环境变量）`

## 1. 当前唯一推荐配置

APIKEY：12402390b778aae45f0afe3c03845baabebc088709fafdfb9424c19de1b169a1

管理网址：https://81.70.170.24:8444/accounts/
账号：qimipc
密码：tangjinbao414

### 1.1 `config.toml（配置文件）`

```toml
model = "gpt-5.4"
model_provider = "codexmanager_server"
model_context_window = 920000
model_auto_compact_token_limit = 900000

[model_providers.codexmanager_server]
name = "CodexManager Server"
base_url = "https://81.70.170.24/codex"
env_key = "OPENAI_API_KEY"
wire_api = "responses"
```

### 1.2 环境变量

```text
CODEX_HOME=<放 config.toml 的目录>
OPENAI_API_KEY=<服务器上的平台APIKey>
```

### 1.3 快速 PowerShell（写入用户环境变量 + 生成 `config.toml`）

下面这段在 **以当前用户身份打开的 PowerShell** 里整段复制执行即可（不写脚本文件、不依赖额外模块）。`CODEX_HOME` 与 `OPENAI_API_KEY` 会写入 **用户级**环境变量，新开终端 / 重启 VSCode 后生效。

**一次性初始化（目录 + 配置文件 + `CODEX_HOME` + `OPENAI_API_KEY`）**：

```powershell
$base = Join-Path $env:USERPROFILE 'CodexManager-Server'
New-Item -ItemType Directory -Path $base -Force | Out-Null
@'
model = "gpt-5.4"
model_provider = "codexmanager_server"
model_context_window = 920000
model_auto_compact_token_limit = 900000

[model_providers.codexmanager_server]
name = "CodexManager Server"
base_url = "https://81.70.170.24/codex"
env_key = "OPENAI_API_KEY"
wire_api = "responses"
'@ | Set-Content -LiteralPath (Join-Path $base 'config.toml') -Encoding utf8
[Environment]::SetEnvironmentVariable('CODEX_HOME', $base, 'User')
$k = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')
if (-not $k) { $k = $env:OPENAI_API_KEY }
if (-not $k) { $k = $env:CODEX_API_KEY }
if ($k) { [Environment]::SetEnvironmentVariable('OPENAI_API_KEY', $k, 'User') }
'CODEX_HOME=' + [Environment]::GetEnvironmentVariable('CODEX_HOME','User')
'OPENAI_API_KEY 已写入用户变量: ' + [bool]([Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User'))
```

说明：上面会优先保留「用户变量里已有的 `OPENAI_API_KEY`」；若还没有，则尝试把 **当前 PowerShell 会话**里的 `OPENAI_API_KEY` 或 `CODEX_API_KEY` 写入用户变量。若两者都没有，请再执行下面 **仅更新密钥** 一行（把引号内换成你的密钥）。

**仅更新 `OPENAI_API_KEY`（换密钥时执行一行即可）**：

```powershell
[Environment]::SetEnvironmentVariable('OPENAI_API_KEY', '在此填入服务器平台 API Key', 'User')
```

**仅修正 `CODEX_HOME`（目录已有人工放好的 `config.toml` 时）**：

```powershell
[Environment]::SetEnvironmentVariable('CODEX_HOME', (Join-Path $env:USERPROFILE 'CodexManager-Server'), 'User')
```

**当前会话立即生效（可选，不重开终端时临时用）**：

```powershell
$env:CODEX_HOME = Join-Path $env:USERPROFILE 'CodexManager-Server'
$env:OPENAI_API_KEY = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY','User')
```

执行完用户变量后，请 **新开 PowerShell / CMD**，或 **重启 VSCode / Cursor**，再运行 `codex`。

## 2. 推荐目录结构

建议统一放在：

```text
C:\Users\<你的用户名>\CodexManager-Server
└─ config.toml
```

然后把下面这项写到用户环境变量：

```text
CODEX_HOME=C:\Users\<你的用户名>\CodexManager-Server
```

## 3. 为什么用 `OPENAI_API_KEY（标准接口密钥环境变量）`

当前这样配的原因很简单：

- `Codex CLI（命令行）`
- `VSCode（编辑器）`
- 以及大多数默认按 `OpenAI` 方式取钥匙的客户端

都更容易直接读到 `OPENAI_API_KEY（标准接口密钥环境变量）`。

这比自定义键名更稳，也更接近“只配置一次，以后一直用”的目标。

## 4. 当前实际边界

### 4.1 对 `Codex CLI（命令行）`

这是当前最稳的用法。只要满足下面三点，通常就能直接用：

1. `codex（命令行工具）` 已安装
2. `CODEX_HOME（配置目录）` 已指向正确目录
3. `OPENAI_API_KEY（标准接口密钥环境变量）` 已设置

### 4.2 对 `VSCode（编辑器）`

也可行，但你必须保证：

1. 设置环境变量之后重新打开 `VSCode（编辑器）`
2. `VSCode（编辑器）` 当前进程能读到最新的用户环境变量

如果 `VSCode（编辑器）` 没重启，它可能继续读旧值。

## 5. 什么时候才需要改配置

只有这几种情况才要改：

- 服务器公网 `IP` 变了
- `/codex` 前缀路径变了
- 默认模型变了
- 你切到另一台服务器了

除此之外，不需要再改 `config.toml（配置文件）`。

## 6. 当前不推荐的做法

不推荐：

- 把平台 `API Key（接口密钥）` 明文写进 `config.toml（配置文件）`
- 每次靠启动脚本临时塞环境变量
- 在另一台电脑再部署一套后台

当前推荐的最小稳定方案就是：

1. `config.toml（配置文件）` 固定
2. `OPENAI_API_KEY（标准接口密钥环境变量）` 固定
3. 需要时只更换平台 `API Key（接口密钥）`
