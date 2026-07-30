# fnos-cli 多 Server 认证设计

日期：2026-07-30  
状态：已批准

## 背景

当前 `fnos-cli` 只在 `~/.fnos/settings.json` 顶层保存一组凭证。`login` 覆盖这组凭证，`logout` 清除这组凭证，业务命令在未提供临时 `-e/-u/-p` 时读取这组凭证。

本设计让用户可以按名称保存多组 fnOS server 凭证，同时兼容现有单 server 配置和命令用法。

## 目标

- 使用名称区分多组 server 凭证。
- 为 `login`、`logout` 和所有业务命令统一提供 `-s, --server <name>`。
- 保持现有 `fnos login -e ... -u ... -p ...` 用法有效，并将其保存为 `default`。
- 业务命令和 `logout` 未指定 server 时，在只有一项时自动选择，在有多项时让用户交互选择。
- 自动把旧版顶层凭证一次性升级为 `servers.default`。
- token 登录失败并通过密码重新登录后，只更新原 server 的凭证。
- 保持凭证文件权限、错误脱敏和临时凭证不落盘等现有安全行为。

## 非目标

- 不新增 `server list`、`server use`、`server rename` 等管理命令。
- 不保存全局“当前 server”或“活动 server”状态。
- 不支持旧版 CLI 读取升级后的多 server 配置。
- 不改变 fnOS SDK 的登录协议或 token 策略。
- 不把密码迁移到系统钥匙串或其他凭证保险库。

## CLI 设计

### 统一选项

`login`、`logout` 和所有业务命令都注册命令级选项：

```text
-s, --server <name>
```

示例：

```bash
fnos login --server home -e home.example.com:5666 -u admin -p password
fnos logout --server home
fnos resmon.cpu --server home
```

server 名称必须匹配：

```text
[A-Za-z0-9][A-Za-z0-9._-]{0,63}
```

名称区分大小写。文档建议统一使用小写。`default` 是普通的合法名称，仅承担兼容旧用法的约定角色。

### Login

```bash
fnos login [-s <name>] -e <endpoint> -u <username> -p <password>
```

- 未指定 `--server` 时固定使用 `default`，不显示选择列表。
- 指定 `--server` 时先校验名称。
- 登录完全成功后才新增或替换该名称的完整凭证记录。
- 登录失败时不得修改该 server 的已有凭证。
- 再次登录同名 server 表示更新，而不是重名错误。
- 保存命名 server 时若发现旧版顶层凭证，先按迁移规则把旧凭证转为 `default`，再保存新 server。

### Logout

```bash
fnos logout [-s <name>]
```

- 指定 `--server` 时只删除该 server。
- 未指定时按统一选择规则解析 server。
- 没有已保存 server 时输出无需退出的提示并成功结束，保持现有幂等行为。
- 删除成功的输出必须包含 server 名称。
- 删除最后一项后保留设置文件、空的 `servers` 对象及其他非认证设置。

### 业务命令

业务命令支持三种凭证解析路径：

1. 提供完整的 `-e/-u/-p`：使用临时凭证，不选择已保存 server，也不写入设置。
2. 提供 `--server <name>`：使用对应的已保存凭证。
3. 两者都未提供：按统一选择规则解析已保存 server。

下列组合是错误：

- `--server` 与任意一个 `-e/-u/-p` 同时出现。
- 只提供部分 `-e/-u/-p`。

## 统一选择规则

server 选择是异步凭证解析的一部分，在创建客户端或发起网络请求之前完成。

- 零个 server：业务命令报错并提示先执行 `fnos login`；`logout` 幂等成功。
- 一个 server：自动选择，不显示提示。
- 多个 server，且 `stdin` 与 `stderr` 都是 TTY：显示编号列表并读取选择。
- 多个 server，但不具备交互条件：报错，列出可用名称，并提示显式传入 `--server <name>`。

列表中 `default` 固定排在第一项，其余名称按字典序排列。每项只显示名称、endpoint 和 username，不显示密码、token、long token 或 secret：

```text
Select a server:
  1) default  nas.example.com:5666         (admin)
  2) office   office.example.com:5666      (admin)
Server [1-2]:
```

提示和列表写入 `stderr`，业务结果继续只写入 `stdout`。无效序号会重新提示；EOF 或用户取消会停止操作，不创建客户端、不发起网络请求。

选择组件使用 Node 内置终端输入能力，不引入第三方交互依赖。

## 配置结构

### 旧版单 Server 结构

```json
{
  "endpoint": "nas.example.com:5666",
  "username": "admin",
  "password": "password",
  "credentialVersion": 2,
  "token": "token",
  "longToken": "long-token",
  "secret": "secret",
  "secretFormat": "decrypted-v1",
  "theme": "dark"
}
```

### 新版规范结构

```json
{
  "servers": {
    "default": {
      "endpoint": "nas.example.com:5666",
      "username": "admin",
      "password": "password",
      "credentialVersion": 2,
      "token": "token",
      "longToken": "long-token",
      "secret": "secret",
      "secretFormat": "decrypted-v1"
    },
    "office": {
      "endpoint": "office.example.com:5666",
      "username": "admin",
      "password": "password",
      "credentialVersion": 2,
      "token": "token",
      "longToken": "long-token",
      "secret": "secret",
      "secretFormat": "decrypted-v1"
    }
  },
  "theme": "dark"
}
```

`servers` 是以名称为键的对象映射。配置不保存列表顺序，也不保存默认选择或活动 server。每个记录独立包含现有完整凭证字段。

## 配置迁移

迁移提供新 CLI 读取旧配置的向前兼容，不提供升级后的旧 CLI 降级兼容。

### 触发时机

只有读取或写入凭证的操作会检查并执行迁移。`--help`、`--version` 等不访问凭证的操作不会修改设置文件。

### 迁移规则

- 只有旧版顶层凭证：移动到 `servers.default`，删除所有顶层认证字段，保留其他设置。
- 已有 `servers`，顶层也有旧凭证，但没有 `servers.default`：把顶层凭证移动到 `servers.default`，保留其他命名 server。
- 顶层旧凭证与 `servers.default` 完全相同：删除重复的顶层认证字段。
- 顶层旧凭证与 `servers.default` 不同：报告配置冲突，不选择其中任何一份，也不修改文件。
- `servers` 不是普通对象，或任意 server 记录结构非法：报告配置错误，不自动跳过记录或覆盖文件。

迁移保存必须使用失败安全的替换方式。写入或替换失败时，原设置文件保持不变。成功后只保留新结构，不长期双写两套凭证。

设置目录权限继续为 `0700`，设置文件权限继续固定为 `0600`。

## 组件职责

### Settings

设置层负责：

- 检测和执行旧格式迁移。
- 校验 `servers` 对象和 server 名称。
- 列出排序后的 server 摘要。
- 按名称读取完整凭证。
- 按名称新增或替换完整凭证。
- 按名称删除凭证并保留其他设置。
- 使用失败安全写入并维持目录、文件权限。

建议的接口语义为：

```text
listServers() -> [{ name, endpoint, username }]
getCredentials(serverName) -> credentials | null
saveCredentials(serverName, credentials)
clearCredentials(serverName) -> boolean
```

### Server Selector

独立选择组件负责：

- 实现零项、单项和多项规则。
- 检测是否可交互。
- 生成稳定排序的非敏感列表。
- 读取、校验和重复提示编号。
- 允许注入输入输出依赖，以便离线测试。

它不读取完整凭证、不保存配置，也不创建客户端。

### Auth Helper

凭证解析改为异步，负责：

- 校验临时凭证是否完整。
- 拒绝 `--server` 与临时凭证混用。
- 解析显式名称或调用 server selector。
- 返回凭证来源和 `serverName`。

临时凭证结果不包含 `serverName`，保存的凭证结果包含：

```json
{
  "source": "settings_file",
  "serverName": "office"
}
```

### Auth Commands

- `login` 把目标名称传入客户端保存流程。
- `logout` 复用统一选择规则，删除解析出的名称。
- 两个命令继续负责关闭已创建的客户端和设置正确的进程退出码。

### Client

现有认证顺序保持不变：

1. 有有效版本化 token 时先尝试 token 登录。
2. token 被拒绝时回退到密码登录。
3. 密码登录成功后取得新的 token、long token 和解密后的 secret。
4. 当凭证来源是设置文件时，使用 `serverName` 把新凭证写回原记录。

使用临时命令行凭证时仍不保存。`login` 显式要求保存时写入其目标名称。

### Runner 和 Options

- 所有业务命令注册 `--server`。
- runner 等待异步凭证解析完成后再创建客户端。
- 现有两步验证、TLS 验证、输出格式和客户端关闭流程保持不变。

## 错误处理

沿用现有退出码约定：

- `0`：成功。
- `1`：一般错误或配置结构错误。
- `3`：认证、凭证或 server 解析错误。
- `4`：命令参数错误。

具体映射：

- server 名称格式非法：`4`。
- `--server` 与任意临时凭证选项混用：`4`。
- 临时凭证不完整：`3`，保持现有行为。
- 显式 server 不存在：`3`，并列出可用名称。
- 业务命令没有可用 server：`3`。
- 多 server 但环境不可交互：`3`。
- 交互选择被取消或收到 EOF：`3`。
- JSON 损坏、`servers` 结构非法或迁移冲突：`1`。

所有错误继续经过现有 `errorMessage` 脱敏，不得输出任何凭证秘密。

## 测试策略

### Settings 单元测试

- 旧版顶层凭证升级为 `servers.default`。
- 混合结构中缺少 `default` 时正确迁移。
- 相同的重复旧凭证被去重。
- 冲突凭证和非法结构报错且不修改原文件。
- 新增、替换、读取和删除命名凭证。
- 删除最后一个 server 后保留其他设置。
- 迁移和常规保存后目录为 `0700`、文件为 `0600`。
- 配置错误不会在日志中暴露敏感内容。

### 选择与解析单元测试

- 零项、单项和多项选择行为。
- `default` 优先及其余名称字典序排序。
- TTY 交互、非 TTY 错误、无效序号重试和取消。
- 列表写入 `stderr`，业务 `stdout` 不受污染。
- 临时凭证、显式 server 和自动选择三条路径。
- `--server` 与临时凭证互斥。
- server 名称格式和不存在名称的错误。

### 命令与客户端单元测试

- `login` 未命名时保存到 `default`。
- `login --server` 新增或更新指定记录。
- 登录失败不覆盖已有记录。
- `logout` 的显式、单项自动和多项交互删除。
- 密码重新登录后只更新来源 server。
- 两步验证和 SSL 选项继续传递。
- 所有成功、错误和客户端关闭行为保持稳定。

### 集成和冒烟测试

- 保留现有单 server 登录、token 复用、业务命令和退出流程，并断言配置已升级为新结构。
- 增加显式命名 server 的登录、调用和退出流程。
- 自动化测试显式传入 `--server`，不依赖真实终端交互。
- 运行全部单元测试，并在固定 mock server 环境中运行现有冒烟测试。

## 文档更新

- README 增加多 server 登录、选择、临时凭证互斥和迁移说明。
- 重新生成命令参考，使业务命令显示 `--server`。
- CHANGELOG 记录多 server 支持及一次性配置升级。
- 明确密码仍以本地设置值保存，不宣称系统钥匙串或加密保险库保护。

## 验收标准

- 旧的 `fnos login -e ... -u ... -p ...` 继续工作，并保存为 `default`。
- 旧配置在首次凭证访问时无损升级，非认证设置和权限保持不变。
- 至少两组命名 server 可以同时保存、独立调用和独立退出。
- 未指定 server 时，单项自动选择，多项在终端中交互选择。
- 非交互环境不会等待输入，而会给出可操作的 `--server` 提示。
- 临时凭证与保存凭证的边界明确，临时凭证不会落盘。
- token 回退登录只更新正确的 server。
- 密码、token、long token 和 secret 不出现在选择列表或错误输出中。
- 全部单元测试和冒烟测试通过，README、命令参考和 CHANGELOG 与行为一致。
