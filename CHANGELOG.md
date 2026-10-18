# 变更日志

本文档记录 fnos-cli 的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增

- 显式 `login --auth oauth` 浏览器授权，支持 PKCE、交互授权码和成功验证后保存 session
- OAuth 授权提示支持按回车打开系统默认浏览器，也可直接粘贴授权码；启动失败时保留手动授权路径
- `auth.status` 查询选定 server 的本地认证类型和到期信息
- OAuth session 恢复、自动刷新写回、同 server 进程锁和配置更新锁
- OAuth 登录/业务命令子进程测试，覆盖并发刷新、取消、保存失败和凭据脱敏

### 变更

- SDK 依赖升级到 `fnos ^0.5.0`，密码登录仍为默认方式，兼容缺少 authType 的旧配置
- 业务响应明确失败时返回非零退出码，`--raw` 保留原始响应
- 补齐 refresh token、PKCE verifier 和 Bearer 授权信息的日志脱敏

### 修复

- OAuth 网络失败显示具体 TLS、DNS、连接或超时原因及处理建议，避免只输出 `fetch failed`；诊断消息隐藏 URL 查询参数和凭据
- 修复 Node 18 对终端 DCS 等控制串清理不完整的问题，保持最低支持版本的输出测试通过

## [0.4.0] - 2026-08-04

### 新增

- login、logout 和全部业务命令支持使用 `--server` 管理和选择多 server 凭证
- 多个已保存 server 可在交互终端中通过编号列表选择
- 新增响应式结构化输出，支持分层字段—值布局、对象数组表格、终端宽度换行和克制配色
- 新增 zsh Tab 补全，覆盖命令、选项、有限值和已保存 server 名称，并提供显式安装命令

### 变更

- 旧版顶层单 server 凭证会一次性升级为 `servers.default`
- 非交互环境存在多个 server 时必须显式提供 `--server`
- 管道、文件重定向、`TERM=dumb` 和 `NO_COLOR` 环境保持无 ANSI 色码输出

### 修复

- 更新认证信息时始终写回当前选中的 server
- 强化窄终端下 Unicode、CJK、emoji 和深层嵌套值的无损换行
- 清理输出中的终端控制序列，避免其影响布局或泄漏到人类可读输出
- 强化 zsh 补全脚本安装时的符号链接、临时文件和失败恢复处理

## [0.3.0] - 2026-07-20

### 新增

- 接入 fnos 0.4.0 的 21 个领域和全部 111 条业务命令
- 支持两步验证、token 重用、WSS endpoint 和 SSL 证书验证
- 新增基于固定版本 fnos-mock-server 的完整 CLI 冒烟测试
- 新增自动生成的完整命令参考

### 修复

- 修复可选位置参数把超时值当成业务参数的问题
- 修复 `file.ls` 错误要求 `--path` 的问题
- 对密码、验证码、token、secret 和签名材料执行统一日志脱敏
- 兼容 fnos 0.4.0 重复请求主机名时响应被握手处理器消费的问题

## [0.2.2] - 2026-02-16

### 修复

- 版本号从 package.json 动态读取，避免硬编码导致版本不同步

## [0.2.1] - 2026-02-16

### 变更

- 升级 fnos 依赖至 0.2.1

## [0.2.0] - 2026-02-01

### 新增

- 所有命令（login 和 logout 除外）支持 `-e/-u/-p` 命令行凭证参数，允许临时使用不同的服务器凭证而不影响已保存的配置

### 修复

- `logout` 命令现在只清除登录认证配置项，不再删除整个 settings.json 文件

## [0.1.0] - 2026-01-30

### 新增

#### 功能
- **认证系统**
  - 实现 `login` 命令，支持保存登录凭证
  - 实现 `logout` 命令，支持清除保存的凭证
  - 凭证保存在权限为 600 的 `~/.fnos/settings.json`

- **资源监控**
  - `resmon.cpu` - CPU 资源监控
  - `resmon.gpu` - GPU 资源监控
  - `resmon.mem` - 内存资源监控
  - `resmon.disk` - 磁盘资源监控
  - `resmon.net` - 网络资源监控
  - `resmon.gen` - 通用资源监控，支持自定义监控项

- **存储管理**
  - `store.general` - 存储通用信息
  - `store.calcSpace` - 计算存储空间
  - `store.listDisk` - 列出磁盘信息，支持过滤热备盘
  - `store.diskSmart` - 获取磁盘 SMART 信息
  - `store.state` - 获取存储状态

- **系统信息**
  - `sysinfo.getHostName` - 获取主机名
  - `sysinfo.getTrimVersion` - 获取 Trim 版本
  - `sysinfo.getMachineId` - 获取机器 ID
  - `sysinfo.getHardwareInfo` - 获取硬件信息
  - `sysinfo.getUptime` - 获取系统运行时间

- **用户管理**
  - `user.info` - 获取用户信息
  - `user.listUG` - 列出用户和组
  - `user.groupUsers` - 获取用户分组信息
  - `user.isAdmin` - 检查当前用户是否为管理员

- **网络管理**
  - `network.list` - 列出网络信息，支持类型过滤
  - `network.detect` - 检测网络接口

- **文件操作**
  - `file.ls` - 列出文件和目录
  - `file.mkdir` - 创建目录
  - `file.rm` - 删除文件或目录，支持移动到回收站

- **SAC (UPS)**
  - `sac.upsStatus` - 获取 UPS 状态信息

#### 全局选项
- `--raw` - 输出原始 JSON 响应
- `-v` - 显示 info 级别日志（输出到 stderr）
- `-vv` - 显示 debug 级别日志（输出到 stderr）
- `-vvv` - 显示 silly 级别日志（输出到 stderr）

#### 帮助系统
- `fnos --help` - 显示所有一级命令和全局选项
- `fnos <command> --help` - 显示命令的二级命令列表
- `fnos <command>.<subcommand> --help` - 显示子命令的详细帮助

#### 日志系统
- Winston 日志框架集成
- 日志文件自动保存在 `~/.fnos/logs/`
- 日志文件命名格式：`fnos-YYYY-MM-DD-{random}.log`
- 支持四级日志级别（error、info、debug、silly）

#### 输出格式化
- 智能格式化输出（对象、数组、基本类型）
- 支持 JSON 原始输出模式
- 数组数据表格化显示
