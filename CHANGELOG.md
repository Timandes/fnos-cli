# 变更日志

本文档记录 fnos-cli 的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.0] - 2026-02-01

### 新增

- 所有命令（login 和 logout 除外）支持 `-e/-u/-p` 命令行凭证参数，允许临时使用不同的服务器凭证而不影响已保存的配置

## [0.1.0] - 2026-01-30

### 新增

#### 功能
- **认证系统**
  - 实现 `login` 命令，支持保存登录凭证
  - 实现 `logout` 命令，支持清除保存的凭证
  - 凭证加密保存在 `~/.fnos/settings.json`（权限 600）

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

