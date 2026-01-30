# fnos-cli

飞牛 fnOS 系统的命令行客户端 (CLI)

## 简介

fnos-cli 是一个用于与飞牛 fnOS 系统交互的命令行工具，通过 WebSocket 协议连接到 fnOS 服务器，提供资源监控、存储管理、系统信息查询、用户管理、网络管理、文件操作和 UPS 状态监控等功能。

## 功能特性

- 🔐 **安全的认证机制** - 支持登录/登出，凭证加密保存
- 📊 **资源监控** - CPU、GPU、内存、磁盘、网络监控
- 💾 **存储管理** - 查看存储信息、磁盘列表、SMART 信息
- ℹ️ **系统信息** - 主机名、版本、硬件信息、运行时间等
- 👤 **用户管理** - 用户信息、用户组、权限管理
- 🌐 **网络管理** - 网络接口信息、网络检测
- 📁 **文件操作** - 文件列表、创建目录、删除文件
- 🔋 **UPS 监控** - UPS 状态信息
- 📝 **灵活的输出格式** - 支持 JSON 原始输出和格式化输出
- 🐛 **多级日志** - 支持 info、debug、silly 三种日志级别

## 安装

### 前置要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 从 npm 安装

```bash
npm install -g fnos-cli
```

### 从源码安装

```bash
git clone <repository-url>
cd fnos-cli
npm install
npm link
```

## 快速开始

### 1. 登录

首次使用需要登录到 fnOS 系统：

```bash
fnos-cli login -e <endpoint> -u <username> -p <password>
```

例如：

```bash
fnos-cli login -e nas-9.timandes.net:5666 -u SystemMonitor -p yourpassword
```

登录成功后，凭证会保存在 `~/.fnos/settings.json` 文件中，后续命令无需重复输入。

### 2. 使用命令

登录后即可执行各种命令：

```bash
# 查看 CPU 使用情况
fnos-cli resmon.cpu

# 查看存储信息
fnos-cli store.general

# 查看系统信息
fnos-cli sysinfo.getHostName

# 列出文件
fnos-cli file.ls --path /home/user
```

### 3. 登出

如需清除保存的凭证：

```bash
fnos-cli logout
```

## 命令参考

### 全局选项

| 选项 | 说明 |
|------|------|
| `--raw` | 输出原始 JSON 响应 |
| `-v` | 显示 info 级别日志（输出到 stderr） |
| `-vv` | 显示 debug 级别日志（输出到 stderr） |
| `-vvv` | 显示 silly 级别日志（输出到 stderr） |
| `-h, --help` | 显示帮助信息 |
| `-V, --version` | 显示版本信息 |

**注意**：
- 命令结果输出到 **stdout**
- 所有日志输出到 **stderr**
- 默认情况下（无 `-v`），只显示错误日志到 stderr
- 使用 `-v`、`-vv`、`-vvv` 可以控制日志详细程度

**输出重定向示例**：

```bash
# 只保存命令结果，忽略所有日志
fnos-cli resmon.cpu > output.json 2>/dev/null

# 只保存日志，忽略命令结果
fnos-cli resmon.cpu -v 2>log.txt 1>/dev/null

# 分别保存命令结果和日志
fnos-cli resmon.cpu -v > output.json 2>log.txt

# 查看命令结果，隐藏日志
fnos-cli resmon.cpu 2>/dev/null
```

### 资源监控命令

| 命令 | 说明 |
|------|------|
| `fnos-cli resmon.cpu` | CPU 资源监控 |
| `fnos-cli resmon.gpu` | GPU 资源监控 |
| `fnos-cli resmon.mem` | 内存资源监控 |
| `fnos-cli resmon.disk` | 磁盘资源监控 |
| `fnos-cli resmon.net` | 网络资源监控 |
| `fnos-cli resmon.gen --items <items>` | 通用资源监控 |

示例：

```bash
fnos-cli resmon.cpu --raw
fnos-cli resmon.gen --items storeSpeed,netSpeed,cpuBusy,memPercent
```

### 存储管理命令

| 命令 | 说明 |
|------|------|
| `fnos-cli store.general` | 存储通用信息 |
| `fnos-cli store.calcSpace` | 计算存储空间 |
| `fnos-cli store.listDisk [--noHotSpare]` | 列出磁盘信息 |
| `fnos-cli store.diskSmart --disk <disk>` | 获取磁盘 SMART 信息 |
| `fnos-cli store.state [--name] [--uuid]` | 获取存储状态 |

示例：

```bash
fnos-cli store.listDisk --noHotSpare false
fnos-cli store.diskSmart --disk nvme0n1
```

### 系统信息命令

| 命令 | 说明 |
|------|------|
| `fnos-cli sysinfo.getHostName` | 获取主机名 |
| `fnos-cli sysinfo.getTrimVersion` | 获取 Trim 版本 |
| `fnos-cli sysinfo.getMachineId` | 获取机器 ID |
| `fnos-cli sysinfo.getHardwareInfo` | 获取硬件信息 |
| `fnos-cli sysinfo.getUptime` | 获取系统运行时间 |

### 用户管理命令

| 命令 | 说明 |
|------|------|
| `fnos-cli user.info` | 获取用户信息 |
| `fnos-cli user.listUG` | 列出用户和组 |
| `fnos-cli user.groupUsers` | 获取用户分组信息 |
| `fnos-cli user.isAdmin` | 检查当前用户是否为管理员 |

### 网络管理命令

| 命令 | 说明 |
|------|------|
| `fnos-cli network.list [--type]` | 列出网络信息 |
| `fnos-cli network.detect --ifName <name>` | 检测网络接口 |

示例：

```bash
fnos-cli network.list --type 0
fnos-cli network.detect --ifName eth0
```

### 文件操作命令

| 命令 | 说明 |
|------|------|
| `fnos-cli file.ls [--path]` | 列出文件和目录 |
| `fnos-cli file.mkdir --path <path>` | 创建目录 |
| `fnos-cli file.rm --files <files> [--moveToTrashbin]` | 删除文件或目录 |

示例：

```bash
fnos-cli file.ls --path /home/user
fnos-cli file.mkdir --path /home/user/newdir
fnos-cli file.rm --files file1.txt,file2.txt --moveToTrashbin false
```

### SAC 命令

| 命令 | 说明 |
|------|------|
| `fnos-cli sac.upsStatus` | 获取 UPS 状态信息 |

## 配置文件

fnos-cli 将配置和凭证保存在用户主目录下的 `.fnos` 文件夹中：

- `~/.fnos/settings.json` - 登录凭证（文件权限 600）
- `~/.fnos/logs/` - 日志文件目录

## 日志

### 日志输出

- **控制台输出**：所有日志输出到 **stderr**（标准错误流）
- **文件输出**：日志文件保存在 `~/.fnos/logs/` 目录
- **命令输出**：命令结果输出到 **stdout**（标准输出流）

### 日志级别

| 级别 | 说明 | 使用方式 |
|------|------|----------|
| `error` | 仅错误信息 | 默认（无 `-v`） |
| `info` | 常规信息 | 使用 `-v` |
| `debug` | 调试信息 | 使用 `-vv` |
| `silly` | 详细信息 | 使用 `-vvv` |

### 日志文件

日志文件按日期和随机数命名，格式为：`fnos-cli-YYYY-MM-DD-{random}.log`

日志文件始终记录所有级别的日志（从 error 到 silly），不受 `-v` 参数影响。

### 默认行为

- **不使用 `-v`**：只显示错误日志到 stderr，命令结果输出到 stdout
- **使用 `-v`**：显示 info 及以上级别的日志到 stderr
- **使用 `-vv`**：显示 debug 及以上级别的日志到 stderr
- **使用 `-vvv`**：显示所有级别的日志到 stderr

这种设计遵循 Unix 工具的最佳实践，让用户可以灵活地分别处理命令输出和日志。

## 开发

### 项目结构

```
fnos-cli/
├── bin/
│   └── fnos-cli           # 可执行文件
├── src/
│   ├── commands/          # 命令实现
│   │   ├── auth.js       # 认证命令
│   │   └── index.js      # 命令注册
│   ├── utils/            # 工具函数
│   │   ├── client.js     # FnosClient 包装器
│   │   ├── formatter.js  # 输出格式化
│   │   ├── logger.js     # 日志配置
│   │   └── settings.js   # 设置管理
│   ├── constants.js      # 常量定义
│   └── index.js          # CLI 入口
├── constitution.md        # 项目原则
├── package.json          # 项目配置
└── README.md             # 本文件
```

### 运行测试

```bash
npm test
```

## 依赖项

- [fnos](https://www.npmjs.com/package/fnos) @ 0.2.0 - fnOS TypeScript SDK
- [commander](https://www.npmjs.com/package/commander) @ 11.1.0 - 命令行框架
- [winston](https://www.npmjs.com/package/winston) @ 3.19.0 - 日志框架

## 许可证

Apache License 2.0

## 贡献

欢迎提交 Issue 和 Pull Request！


## 致谢

感谢 飞牛fnOS 团队提供的优质NAS系统。

