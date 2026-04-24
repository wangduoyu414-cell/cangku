# 另一台电脑连接服务器 APIKey 接入步骤

本文档只保留当前真实可用、最短可执行的一套做法。  
当前统一走“无脚本接入”，不使用局域网启动脚本。

适用场景：

- 你要在另一台电脑上直接调用当前服务器的 `CodexManager API`
- 你不想在另一台电脑上重复部署后台
- 你只接受“`config.toml（配置文件） + 环境变量 + 平台 API Key（接口密钥）`”这种最小接法

## 1. 当前实际使用的接口地址

当前统一使用公网 `IP` + 前缀路径：

```text
https://81.70.170.24/codex
```

健康检查地址：

```text
https://81.70.170.24/codex/health
```

真实接口地址示例：

```text
https://81.70.170.24/codex/v1/responses
```

## 2. 你要准备的内容

另一台电脑只需要准备这两样：

1. 一份 `config.toml（配置文件）`
2. 服务器上的平台 `API Key（接口密钥）`

## 3. 在另一台电脑创建配置目录

建议固定使用这个目录：

```text
C:\Users\<你的用户名>\CodexManager-Server
```

最终文件路径应为：

```text
C:\Users\<你的用户名>\CodexManager-Server\config.toml
```

## 4. 写入 `config.toml（配置文件）`

把下面内容原样写入：

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

说明：

- `base_url（接口地址）` 当前必须写 `https://81.70.170.24/codex`
- 不要再写 `https://api.qimi.online`
- 不要把 `API Key（接口密钥）` 明文写进这个文件

## 5. 只做一次的环境变量设置

在另一台电脑的 `PowerShell（命令行）` 中执行：

```powershell
[Environment]::SetEnvironmentVariable("CODEX_HOME","C:\Users\<你的用户名>\CodexManager-Server","User")
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY","<你的平台APIKey>","User")
```

这两项的含义：

- `CODEX_HOME（配置目录）`：指向放 `config.toml（配置文件）` 的目录
- `OPENAI_API_KEY（标准接口密钥环境变量）`：保存服务器侧的平台 `API Key（接口密钥）`

执行完成后，关闭并重新打开：

- `VSCode（编辑器）`
- 或终端

## 6. 从哪里拿平台 `API Key（接口密钥）`

### 6.1 打开当前可用后台入口

当前统一使用公网 `IP` + 端口后台入口：

```text
https://81.70.170.24:8444/accounts/
```

### 6.2 输入后台认证

- 用户名：`qimipc`
- 密码：`tangjinbao414`

说明：

- 这是 `Basic Auth` 第一层认证
- 当前应用内第二层 `Web` 密码已经禁用

### 6.3 复制平台 `API Key（接口密钥）`

登录后进入：

```text
平台密钥 / API Keys
```

复制你要使用的那条平台 `API Key（接口密钥）`。

## 7. 如何验证接入是否成功

### 7.1 先测健康检查

```powershell
Invoke-WebRequest https://81.70.170.24/codex/health -UseBasicParsing
```

成功标准：

- 返回状态码 `200`

### 7.2 再测真实接口

```powershell
$headers = @{
  Authorization = "Bearer <你的平台APIKey>"
  "Content-Type" = "application/json"
}

$body = @{
  model = "gpt-5.4"
  stream = $false
  input = @(
    @{
      type = "message"
      role = "user"
      content = @(
        @{
          type = "input_text"
          text = "reply with exactly ok"
        }
      )
    }
  )
} | ConvertTo-Json -Depth 10

Invoke-WebRequest `
  -Uri "https://81.70.170.24/codex/v1/responses" `
  -Method Post `
  -Headers $headers `
  -Body $body `
  -UseBasicParsing
```

成功标准：

- 返回状态码 `200`
- 响应内容里能看到 `ok`

## 8. 最常见错误

### 8.1 `401（未授权）` 或 `403（拒绝）`

通常是：

- 平台 `API Key（接口密钥）` 填错
- 把后台登录密码误当成平台 `API Key（接口密钥）`
- 设置完环境变量后，没有重开 `VSCode（编辑器）` 或终端

### 8.2 超时或连接失败

通常是：

- 服务器当前上游出口异常
- 需要在服务器侧检查 `sing-box（代理程序）` 与 `CodexManager（项目）` 服务

### 8.3 后台打不开

如果 `https://81.70.170.24:8444/accounts/` 打不开，先确认：

- 你输入的地址里带了 `:8444`
- 使用的是 `https`
- 浏览器没有缓存旧的登录状态
