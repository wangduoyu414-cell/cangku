# 代码模型与开发环境完整清单

更新时间：2026-04-22  
整理范围：本窗口已讨论的全部内容，含 `Windows`（视窗系统）、`macOS`（苹果系统）、跨平台脚本与依赖治理、常见故障来源、推荐安装项、推荐配置项、仓库规范与 `CI`（持续集成）约定。  
目标：让代码模型、代码智能体、命令行工具、`Node.js`（运行时）、`Python`（编程语言）、`Git`（版本控制）、`Docker`（容器平台）在 `Windows`（视窗系统）与 `macOS`（苹果系统）上都更稳定。

## 1. 总结结论

`Windows`（视窗系统）更常见的问题集中在这些方面：

- 编码与解码：旧代码页、`UTF-8`（统一文本编码）不一致、`BOM`（字节顺序标记）差异。
- 换行符：`CRLF`（回车换行）与 `LF`（换行）混用。
- `Shell`（命令壳）差异：`PowerShell`（命令壳）、`cmd`（命令解释器）、`bash`（类 Unix 壳）语法不兼容。
- 路径问题：盘符、反斜杠、路径过长、空格路径、保留名。
- 文件锁：正在使用的文件删除或重命名失败。
- 原生依赖：`node-gyp`（原生扩展构建工具）、`Python`（编程语言）、`Visual C++ Build Tools`（微软 C/C++ 构建工具）缺失。
- 中断与子进程：`Ctrl+C`（中断快捷键）、`SIGINT`（中断信号）、`SIGTERM`（终止信号）语义与类 Unix 系统不同。
- 文件监听与容器性能：`WSL 2`（第二代子系统）文件系统与 `C:` 盘性能差异明显。

`macOS`（苹果系统）更常见的问题集中在这些方面：

- 签名与公证：`Gatekeeper`（应用校验）拦截未签名或未公证应用。
- 权限模型：`Files & Folders`（文件与文件夹）、`Full Disk Access`（完全磁盘访问权限）、`Accessibility`（辅助功能权限）、`Automation`（自动化权限）不足。
- 架构差异：`Apple Silicon`（苹果芯片）上的 `arm64`（架构）与 `x86_64`（旧架构）混跑。
- 工具链：`Xcode Command Line Tools`（苹果命令行工具）或 `Xcode`（苹果开发工具）缺失。
- 文件系统差异：默认 `APFS`（苹果文件系统）通常不区分大小写，但容器内 `Linux`（类 Unix 系统）区分大小写。

两个平台共同最有效的稳定措施不是“人工记住差异”，而是把约束固化到仓库与安装标准里：

- 提交 `.gitattributes`（属性文件）和 `.editorconfig`（编辑器配置）。
- 固定 `Node.js`（运行时）、`Python`（编程语言）、包管理器版本。
- 把复杂逻辑写进仓库脚本，不直接写平台相关壳命令。
- 让 `CI`（持续集成）至少跑 `windows-latest`（最新版视窗环境）与 `macos-latest`（最新版苹果环境）。
- 在 `Windows`（视窗系统）上使用 `PowerShell 7`（新版命令壳）与 `WSL 2`（第二代子系统）。
- 在 `macOS`（苹果系统）上保证 `CLT`（命令行工具）和权限预授权。

## 2. Windows 完整清单

### 2.1 必装组件

- `Windows Terminal`（现代终端）
- `PowerShell 7`（新版命令壳）
- `WinGet`（系统包管理器）
- `WSL 2`（第二代子系统）与一个正式发行版，如 `Ubuntu`（发行版）
- `Git for Windows`（Windows 版 Git）
- `Node.js LTS`（长期支持版本）
- `Python`（官方安装器或官方安装管理器）
- `Visual C++ Build Tools`（微软 C/C++ 构建工具），当项目含原生依赖时必须安装
- `Docker Desktop`（容器桌面），当项目依赖容器时安装
- `VS Code`（编辑器）或团队标准编辑器

### 2.2 强烈建议的系统设置

- 把 `Windows Terminal`（现代终端）设为默认终端应用。
- 把默认终端 `profile`（终端配置）设为 `PowerShell 7`（新版命令壳）或 `WSL`（子系统）配置，而不是 `Windows PowerShell 5.1`（旧版命令壳）。
- 启用 `Win32 long paths`（长路径支持），但同时仍要求仓库根目录尽量浅。
- 对依赖 `Linux`（类 Unix 系统）工具链、容器、文件监听的项目，统一在 `WSL 2`（第二代子系统）中工作。
- 这类项目的源码放在 `WSL`（子系统）的 `Linux` 文件系统里，不放在 `/mnt/c/...`。
- 不把管理员终端作为默认工作方式；只在确实需要时提权。

### 2.3 强烈建议的终端与编码策略

- 默认使用 `PowerShell 7`（新版命令壳），避免继续以 `PowerShell 5.1`（旧版命令壳）为新脚本基线。
- 仓库统一文本编码为 `UTF-8`（统一文本编码）。
- 不把 `BOM`（字节顺序标记）作为全仓库默认策略。
- 如果某个 `.ps1`（PowerShell 脚本）必须兼容 `PowerShell 5.1`（旧版命令壳）且包含非 `ASCII`（基础字符集）字符，再对该文件单独处理。
- `Python`（编程语言）代码读写文本文件时显式写 `encoding='utf-8'`。
- 如果确实需要让命令级 `Python`（编程语言）启用统一编码，优先使用 `-X utf8`，不优先使用全局 `PYTHONUTF8=1`。

### 2.4 强烈建议的安装和版本策略

- `Node.js`（运行时）只用 `LTS`（长期支持）版本，不把奇数大版本作为团队默认环境。
- 包管理器版本要固定；如果采用官方能力，可在 `package.json` 中使用 `packageManager`（包管理器声明）并结合 `Corepack`（包管理器代理）。
- `Python`（编程语言）每个项目独立虚拟环境，不共享系统级安装目录。
- 含原生模块时，提前装好 `Python`（编程语言）与 `Visual C++ Build Tools`（微软 C/C++ 构建工具）。
- `Docker Desktop`（容器桌面）优先使用 `WSL 2 backend`（第二代子系统后端）。

### 2.5 脚本与自动化约定

- 不混写 `cmd`（命令解释器）、`PowerShell`（命令壳）和 `bash`（类 Unix 壳）语法。
- 跨平台自动化优先写成 `Node.js`（运行时）脚本或 `Python`（编程语言）脚本。
- 如果必须写壳脚本，则分别维护 `.ps1`（PowerShell 脚本）和 `.sh`（Shell 脚本）。
- `package.json` 里的命令优先写为 `node ./scripts/xxx.mjs` 或 `python -m tools.xxx`。
- 不在 `package.json` 直接写 `rm -rf`、`cp`、`export FOO=bar`、复杂管道、条件判断和平台相关壳语法。

### 2.6 中断、子进程与文件锁

- 不把优雅退出完全建立在 `POSIX signals`（类 Unix 信号）上。
- 开发服务器、测试守护进程、子进程编排都要有显式关闭通道、超时机制和进程树回收。
- 清理缓存、热更新输出、临时目录时，先停监视器再删除。
- 删除或重命名失败时要允许短暂重试，不假设打开中的文件可以像类 Unix 系统一样立即替换。

### 2.7 可选优化

- 用 `WinGet`（系统包管理器）管理开发机初始化。
- 给自动化终端单独提供 `PowerShell 7 -NoProfile`（不加载用户配置）入口。
- 若团队认可第三方版本管理器，可在 `Node.js`（运行时）上使用 `Volta`（版本管理器），减少跨壳差异。
- 若团队认可第三方环境工具，可在 `Python`（编程语言）上使用 `uv`（包与环境工具）。

### 2.8 Windows 初始化顺序建议

1. 更新系统。
2. 安装 `Windows Terminal`（现代终端）。
3. 安装 `PowerShell 7`（新版命令壳）。
4. 安装并启用 `WSL 2`（第二代子系统），安装一个正式发行版。
5. 安装 `Git for Windows`（Windows 版 Git）。
6. 安装 `Node.js LTS`（长期支持版本）。
7. 安装 `Python`（编程语言）。
8. 如项目含原生依赖，安装 `Visual C++ Build Tools`（微软构建工具）。
9. 如项目依赖容器，安装 `Docker Desktop`（容器桌面）并确认使用 `WSL 2 backend`（第二代子系统后端）。
10. 配置 `Windows Terminal`（现代终端）默认 `profile`（终端配置）。
11. 启用 `Win32 long paths`（长路径支持）。
12. 在 `WSL`（子系统）文件系统中克隆仓库并开始开发。

## 3. macOS 完整清单

### 3.1 必装组件

- `Xcode Command Line Tools`（苹果命令行工具）
- `Homebrew`（包管理器）
- `Git`（版本控制），如需新版本可用 `Homebrew`（包管理器）安装
- `Node.js LTS`（长期支持版本）
- `Python`（来自 `python.org` 或 `Homebrew`）
- `Docker Desktop`（容器桌面），当项目依赖容器时安装
- `VS Code`（编辑器）或团队标准编辑器
- `Rosetta 2`（转译层），仅在确实需要运行旧 `x86_64`（旧架构）二进制时安装

### 3.2 强烈建议的系统与工具链设置

- 先安装 `Xcode Command Line Tools`（苹果命令行工具）。
- 需要 `xcodebuild`（苹果构建工具）、模拟器、签名、公证时再安装完整 `Xcode`（苹果开发工具）。
- `Apple Silicon`（苹果芯片）机器优先使用原生 `arm64`（架构）工具，不默认依赖 `Rosetta 2`（转译层）。
- 使用 `Homebrew`（包管理器）时，尽量保持默认前缀和官方支持配置。
- 不依赖系统自带 `/usr/bin/python3`（系统解释器）作为项目 `Python`（编程语言）环境。

### 3.3 终端、编码与脚本约定

- 默认终端壳为 `zsh`（命令壳）。
- 脚本中显式写 `shebang`（解释器声明），不要依赖当前交互式终端状态。
- 仓库统一为 `UTF-8`（统一文本编码）与 `LF`（换行）。
- 如果项目兼容类 Unix 系统工作流，`macOS`（苹果系统）通常不需要为编码额外做系统级修正。

### 3.4 安装与版本策略

- `Node.js`（运行时）只用 `LTS`（长期支持）版本。
- 包管理器版本固定，锁文件必须提交。
- `Python`（编程语言）每个项目独立虚拟环境。
- 如果用 `python.org`（官方站点）安装器，安装后执行 `Install Certificates.command`（证书安装脚本）。
- 如果 `Homebrew`（包管理器）版 `Python`（编程语言）不能满足版本稳定要求，再考虑团队认可的版本管理器。

### 3.5 权限、签名与自动化

- 对需要访问桌面、文稿、下载目录、整盘文件的工具，预先处理 `Files & Folders`（文件与文件夹）与 `Full Disk Access`（完全磁盘访问权限）。
- 对需要控制其他应用或做界面自动化的工具，预先处理 `Accessibility`（辅助功能权限）与 `Automation`（自动化权限）。
- 对下载的开发工具、代理程序、内部应用，优先使用已签名、已公证的发行包。
- 遇到工具无法打开时，先检查 `Gatekeeper`（应用校验）和系统权限，不要先怀疑程序逻辑。

### 3.6 文件系统与容器注意事项

- `APFS`（苹果文件系统）默认通常不区分大小写，但容器内 `Linux`（类 Unix 系统）区分大小写。
- 因此仓库不要依赖仅靠大小写区分文件名。
- 容器中的缓存、数据库优先放到 `volume`（数据卷）而不是宿主机共享目录。
- 共享目录尽量最小化，减少文件同步与监听问题。

### 3.7 可选优化

- 如果团队对生产环境大小写语义要求很高，可把特定项目放到 `APFS case-sensitive`（区分大小写文件系统）卷。
- 如果机器上安装多套 `Xcode`（苹果开发工具），要显式切换活动开发目录。
- 如果团队使用 `Volta`（版本管理器）或 `uv`（包与环境工具），可与 `Windows`（视窗系统）侧保持一致。

### 3.8 macOS 初始化顺序建议

1. 更新系统到受支持版本。
2. 安装 `Xcode Command Line Tools`（苹果命令行工具）。
3. 安装 `Homebrew`（包管理器）。
4. 安装 `Git`（版本控制）、`Node.js LTS`（长期支持版本）、`Python`（编程语言）。
5. 若需要完整苹果平台工具链，再安装 `Xcode`（苹果开发工具）。
6. 若确有旧架构依赖，再安装 `Rosetta 2`（转译层）。
7. 如项目依赖容器，安装 `Docker Desktop`（容器桌面）。
8. 为代码智能体和自动化工具授权所需系统权限。
9. 配置终端与开发工具，使项目命令与团队规范一致。

## 4. 跨平台仓库治理完整清单

### 4.1 `.gitattributes` 基线

推荐基线：

```gitattributes
* text=auto eol=lf

*.sh   text eol=lf
*.bash text eol=lf
*.zsh  text eol=lf
*.yml  text eol=lf
*.yaml text eol=lf
*.json text eol=lf
*.md   text eol=lf
*.py   text eol=lf
*.ts   text eol=lf
*.tsx  text eol=lf
*.js   text eol=lf
*.jsx  text eol=lf
*.mjs  text eol=lf
*.cjs  text eol=lf

*.bat  text eol=crlf
*.cmd  text eol=crlf
*.sln  text eol=crlf
```

应用这类规则后，执行一次：

```bash
git add --renormalize .
```

### 4.2 `.editorconfig` 基线

推荐基线：

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2
```

### 4.3 `Git`（版本控制）约定

- 仓库规则优先于个人 `core.autocrlf`（自动换行转换）。
- 团队机器建议启用 `core.safecrlf=warn` 或更严格策略。
- 不用 `working-tree-encoding`（工作树编码转换）处理普通文本；仅在确有遗留编码文件时单独声明。
- 不只靠大小写区分文件名或重命名。

### 4.4 `Node.js`（运行时）治理

- 只允许 `LTS`（长期支持）版本成为团队基线。
- 固定版本来源，例如 `.nvmrc`、`.node-version` 或 `CI`（持续集成）固定版本。
- 固定包管理器版本与锁文件。
- `CI`（持续集成）里优先使用锁文件缓存，不缓存 `node_modules`（依赖目录）。
- 自动化安装优先使用 `npm ci`（干净安装）或对应包管理器的锁定安装模式。

### 4.5 `Python`（编程语言）治理

- 团队只保留一条主流程：`venv`（虚拟环境）或 `uv`（包与环境工具）。
- 若用 `venv`（虚拟环境），约定仓库内 `.venv` 目录，并加入忽略规则。
- 若用 `uv`（包与环境工具），固定 `requires-python`（版本约束）和锁文件。
- 自动化命令不要求“先激活环境”，直接调用解释器或统一入口。
- 代码里显式指定文本编码，减少平台默认编码差异。

### 4.6 脚本与命令约定

- 跨平台共享逻辑优先写成 `Node.js`（运行时）或 `Python`（编程语言）脚本。
- `CI`（持续集成）工作流中每一步显式指定 `shell`（命令壳）。
- 不把复杂逻辑直接堆在 `package.json` 或流水线 `yaml`（配置文件）里。
- 本地与 `CI`（持续集成）执行同一套仓库入口命令。

### 4.7 进程、信号与清理约定

- 不把 `SIGTERM`（终止信号）或其他 `POSIX`（类 Unix 约定）信号当唯一控制面。
- 统一实现显式退出接口、取消机制、超时和进程树回收。
- 清理目录前先停止监视进程。
- 对 `Windows`（视窗系统）上的删除失败允许有限重试。

### 4.8 路径与文件命名约定

- 路径拼接必须使用语言内置 `path API`（路径接口）。
- 仓库根目录尽量短，减少深层依赖目录叠加。
- 文件名尽量使用稳定 `ASCII`（基础字符集）和固定大小写。
- 避免 `Windows`（视窗系统）保留名与只靠 `Unicode`（统一字符编码）组合差异区分文件名。

### 4.9 `CI`（持续集成）基线

- 至少跑 `windows-latest`（最新版视窗环境）与 `macos-latest`（最新版苹果环境）矩阵。
- 固定 `Node.js`（运行时）与 `Python`（编程语言）版本。
- 覆盖安装、构建、测试和最小启动验证。
- 只在确证不支持的组合上使用排除规则。

## 5. 最小落地标准

如果团队只做最小但最有效的一轮治理，至少应完成：

1. `Windows`（视窗系统）项目统一 `PowerShell 7`（新版命令壳）。
2. 依赖 `Linux`（类 Unix 系统）工具链的 `Windows`（视窗系统）项目统一 `WSL 2`（第二代子系统）。
3. 提交 `.gitattributes`（属性文件）。
4. 提交 `.editorconfig`（编辑器配置）。
5. 固定 `Node.js`（运行时）版本、包管理器版本和锁文件。
6. 固定 `Python`（编程语言）版本与虚拟环境策略。
7. 把跨平台逻辑收敛到仓库脚本。
8. `CI`（持续集成）跑 `Windows`（视窗系统）和 `macOS`（苹果系统）矩阵。
9. 明确原生依赖的安装前置条件。
10. 对代码智能体和自动化工具预先处理系统权限。

## 6. 哪些做法最能降低代码智能体失败率

最有效的做法是消掉这些高频不确定性：

- 用 `.gitattributes`（属性文件）和 `.editorconfig`（编辑器配置）消掉编码与换行漂移。
- 用固定版本与锁文件消掉依赖漂移。
- 用仓库脚本消掉壳语法差异。
- 用 `windows-latest`（最新版视窗环境）与 `macos-latest`（最新版苹果环境）矩阵提前暴露平台差异。
- 在 `Windows`（视窗系统）上用 `WSL 2`（第二代子系统）文件系统消掉容器与文件监听问题。
- 在 `macOS`（苹果系统）上提前授权消掉“看起来随机”的权限错误。
- 对进程退出、文件锁、重试逻辑做显式处理，减少工具链卡死和残留子进程。

## 7. 参考来源

### 7.1 Windows 相关

- 微软：在 `Windows`（视窗系统）上安装 `PowerShell 7`（新版命令壳）  
  https://learn.microsoft.com/en-us/powershell/scripting/install/install-powershell-on-windows?view=powershell-7.5
- 微软：`PowerShell`（命令壳）字符编码说明  
  https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_character_encoding?view=powershell-7.6
- 微软：安装 `WSL`（子系统）  
  https://learn.microsoft.com/en-us/windows/wsl/install
- 微软：设置 `WSL`（子系统）开发环境  
  https://learn.microsoft.com/en-us/windows/wsl/setup/environment
- 微软：`Windows Terminal`（现代终端）安装  
  https://learn.microsoft.com/en-us/windows/terminal/install
- 微软：`WinGet`（系统包管理器）  
  https://learn.microsoft.com/en-us/windows/package-manager/winget/
- 微软：`DeleteFile`（删除文件接口）与文件锁语义  
  https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-deletefilew
- 微软：路径长度限制  
  https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation
- 微软：`NuGet`（.NET 包工具）长路径支持  
  https://learn.microsoft.com/en-us/nuget/reference/cli-reference/cli-ref-long-path
- `Docker`（容器平台）：`WSL 2`（第二代子系统）最佳实践  
  https://docs.docker.com/desktop/features/wsl/best-practices/
- `Docker`（容器平台）：在 `Windows`（视窗系统）上使用 `WSL 2`（第二代子系统）  
  https://docs.docker.com/desktop/features/wsl/use-wsl/
- `Python`（编程语言）：在 `Windows`（视窗系统）上使用 `Python`（编程语言）  
  https://docs.python.org/3/using/windows.html
- `node-gyp`（原生扩展构建工具）  
  https://github.com/nodejs/node-gyp

### 7.2 macOS 相关

- 苹果：安装 `Xcode Command Line Tools`（苹果命令行工具）  
  https://developer.apple.com/documentation/xcode/installing-the-command-line-tools/
- 苹果：`Terminal`（终端）默认 `zsh`（命令壳）  
  https://support.apple.com/guide/terminal/change-the-default-shell-trml113/mac
- 苹果：`Gatekeeper`（应用校验）与未识别开发者应用  
  https://support.apple.com/en-us/102445
- 苹果：应用访问文件权限与隐私模型  
  https://support.apple.com/guide/security/controlling-app-access-to-files-in-macos-secddd1d86a6/web
- `Homebrew`（包管理器）安装说明  
  https://docs.brew.sh/Installation.html
- `Homebrew`（包管理器）支持级别  
  https://docs.brew.sh/Support-Tiers
- `Python`（编程语言）：在 `macOS`（苹果系统）上使用 `Python`（编程语言）  
  https://docs.python.org/3/using/mac.html
- `Docker`（容器平台）：在 `macOS`（苹果系统）上安装  
  https://docs.docker.com/desktop/setup/install/mac-install/

### 7.3 跨平台治理

- `Git`（版本控制）：`.gitattributes`（属性文件）  
  https://git-scm.com/docs/gitattributes.html
- `Git`（版本控制）：`git-config`（配置）  
  https://git-scm.com/docs/git-config
- `EditorConfig`（编辑器配置）  
  https://editorconfig.org/
- `Node.js`（运行时）：版本状态与 `LTS`（长期支持）  
  https://nodejs.org/en/about/previous-releases
- `Node.js`（运行时）：`packageManager`（包管理器声明）  
  https://nodejs.org/download/release/v22.12.0/docs/api/packages.html#packagemanager
- `Node.js`（运行时）：`Corepack`（包管理器代理）  
  https://nodejs.org/download/release/v22.11.0/docs/api/corepack.html
- `npm`（包管理器）：`npm ci`（干净安装）  
  https://docs.npmjs.com/cli/v11/commands/npm-ci/
- `Python`（编程语言）：`venv`（虚拟环境）  
  https://docs.python.org/3/library/venv.html
- `uv`（包与环境工具）  
  https://docs.astral.sh/uv/
- `GitHub Actions`（持续集成服务）：矩阵任务  
  https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs
- `GitHub Actions`（持续集成服务）：工作流语法与 `shell`（命令壳）  
  https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- `actions/setup-node`（节点环境初始化动作）  
  https://github.com/actions/setup-node

