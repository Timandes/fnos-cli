# fnos-cli

[![npm version](https://badge.fury.io/js/fnos-cli.svg)](https://www.npmjs.com/package/fnos-cli)
![License](https://img.shields.io/npm/l/fnos-cli)

飞牛 fnOS 系统的命令行客户端，通过 WebSocket/WSS 或 OAuth HTTP 网关调用 fnOS API。

官网：[https://fnos.timandes.cn/](https://fnos.timandes.cn/)

## 功能

- 提供 21 个业务领域、111 条查询命令
- 默认简体中文，支持英文及持久保存的语言偏好
- 按命令组逐级展示帮助，同时兼容原有点号调用
- 支持命名多 server、密码登录、token 重用、两步验证和显式 OAuth 登录
- 支持 `ws://`、`wss://` 以及可选的严格证书验证
- 支持原始 JSON 和格式化输出
- 密码、验证码、token、secret 和签名材料统一日志脱敏
- 凭证保存在权限为 0600 的本地设置文件中
- 提供 `fnos completion zsh` 生成的 zsh Tab 补全

## 安装

需要 Node.js 18.17 或更高版本、npm 8 或更高版本。

```bash
npm install -g fnos-cli
```

从源码运行：

```bash
git clone <repository-url>
cd fnos-cli
npm install
npm link
```

### zsh Tab 补全

首次安装后，执行以下命令把补全脚本安装到
`~/.fnos/completions/_fnos`：

```bash
fnos completion install zsh
```

安装命令不会自动修改 `.zshrc`。要持久启用补全，请将以下内容加入 `.zshrc`，并确保
`fpath` 的设置位于现有 shell 框架调用 `compinit` 之前：

```zsh
fpath=(~/.fnos/completions $fpath)
autoload -Uz compinit
compinit
```

如果使用的框架已经初始化了补全，不要再次调用 `compinit`；只需在该框架调用它之前设置
`fpath`。临时在当前 shell 会话启用补全时，可运行：

```zsh
eval "$(fnos completion zsh)"
```

升级 CLI 后需要重新安装补全脚本：

```bash
npm update -g fnos-cli
fnos completion install zsh
```

命令、选项、布尔值和有限枚举值由 CLI 静态生成；`--server` 的候选名称会从
`~/.fnos/settings.json` 刷新，不会发起网络请求。

## 界面语言

CLI 默认使用简体中文（`zh-CN`），也支持英文（`en`）。语言按以下优先级选择：

```text
--lang > FNOS_LANG > 已保存的 language 偏好 > zh-CN
```

临时切换只影响本次调用，参数可放在命令之前或之后：

```bash
fnos --lang en user --help
fnos user info --lang en
FNOS_LANG=en fnos user info
```

保存、查询或清除语言偏好：

```bash
fnos config set language en
fnos config get language
fnos config get language --raw
fnos config unset language
```

偏好保存在 `~/.fnos/settings.json` 顶层的 `language` 字段，与各 server 的凭据独立。
设置或清除偏好的确认信息使用本次调用的语言，新偏好从下次调用生效。查询结果包含
已保存的 `language`、本次 `effectiveLanguage`，以及 `source`（`argument`、
`environment`、`settings` 或 `default`）。清除偏好后，没有临时覆盖时恢复中文。

只有 `zh-CN` 和 `en` 是有效值，不根据 `LANG` 或系统语言自动切换。空 `FNOS_LANG`
视为未设置；无效参数或环境变量返回退出码 `4`，有效 `--lang` 可以覆盖无效环境变量。
设置缺失、损坏或其中的语言不受支持时，帮助、版本和补全脚本的语言回退为中文；
真正需要读写设置的命令仍会报告配置错误，保留原文件。

帮助、CLI 自身提示与错误、结果标签和补全说明随语言变化。命令名、参数名、
`--raw` JSON、服务端消息及业务字符串保持原文。已安装补全脚本的说明是静态文本，
改变偏好后请重新运行 `fnos completion install zsh`。

## 登录与认证

首次使用可保存登录凭证，也可以用 `--server` 为不同 fnOS server 命名：

```bash
fnos login -e nas.example.com:5666 -u admin -p password
fnos login --server office -e office.example.com:5666 -u admin -p password
fnos sysinfo getHostName --server office
fnos logout --server office
```

密码登录成功后会显示所选 server、endpoint、用户名及凭据已保存的确认；添加
`--raw` 输出对应的 JSON 摘要，不包含密码、token 或 secret，endpoint 中的 URL
认证信息也会省略。服务端拒绝密码登录或两步验证时，只输出一次认证错误，保留
服务端说明和 `errno`（如有）。服务端未提供有效说明时，会提示检查用户名
（包括大小写）和密码；两步验证失败则提示检查验证码。CLI 按输入原样发送用户名，
不会自动转换大小写，也不会将未确认含义的错误码直接解释为密码错误。

设置按名称写入 `~/.fnos/settings.json` 的 `servers.<name>`。未指定
`--server` 的 login 保存为 `default`。业务命令和 logout 在只有一个已保存
server 时自动选择；有多个时在交互终端显示编号列表。在 CI、管道等非交互环境中
存在多个 server 时，必须显式提供 `--server`。

旧版顶层单 server 凭证会在首次凭证访问时一次性迁移为
`servers.default`。升级后的配置不再供旧版 CLI 读取。

后续命令会优先重用所选 server 的有效 token；token 失效时回退到该记录的密码
登录，并把新 token 写回同一个 server。

也可为单条业务命令临时提供完整凭证，这些参数不会写入设置：

```bash
fnos resmon cpu -e nas.example.com:5666 -u admin -p password
```

`-e`、`-u`、`-p` 必须同时提供，且不能与 `--server` 混用。退出并只清除选中
server 的认证记录：

```bash
fnos logout
```

### 两步验证

需要两步验证的账户可在登录或业务命令中提供六位验证码：

```bash
fnos login -e wss://nas.example.com:5667 -u admin -p password --twofa-code 123456 --trust-device --verify-ssl
```

验证码不会写入设置或日志。若账户尚未绑定两步验证，CLI 会提示先在 fnOS 网页端完成绑定。

### OAuth 登录

密码登录仍是默认方式。使用 `--auth oauth` 显式选择浏览器授权，不需要向 CLI 提供用户名或密码：

```bash
fnos login --auth oauth --server home-oauth -e https://nas.example.com:5667
fnos user info --server home-oauth --raw
fnos auth.status --server home-oauth --raw
fnos logout --server home-oauth
```

首次授权需要交互终端。CLI 在 stderr 显示授权 URL，并提示按回车打开系统默认浏览器；也可以手动打开链接后直接粘贴授权码。用户在浏览器登录、完成两步验证和授权后，将一次性授权码粘贴回终端。浏览器启动失败时会提示手动打开链接，仍可继续输入授权码；再次按回车可重试打开。授权请求 5 分钟内有效；取消或失败会保留该 server 原有凭据。OAuth 登录成功时 stdout 输出不含 token 的结果，`--raw` 输出 JSON。

OAuth endpoint 必须是完整的 HTTP 或 HTTPS origin，例如 `https://nas.example.com:5667`，不接受路径、查询参数、URL 内的账号密码或 WS/WSS 地址。HTTPS 默认跳过证书信任链和域名验证，兼容 fnOS 自签名证书；添加 `--verify-ssl` 才严格验证。HTTPS 连接仍然加密，但默认不验证服务端身份。OAuth 不能与 `-u`、`-p`、`--twofa-code` 或 `--trust-device` 混用。

启用 `--verify-ssl` 后，`DEPTH_ZERO_SELF_SIGNED_CERT` 表示证书尚未受信任，`ERR_TLS_CERT_ALTNAME_INVALID` 表示证书没有覆盖访问域名。可配置匹配域名的可信证书；使用自有 CA 时，须在启动 Node 前设置 `NODE_EXTRA_CA_CERTS`，且证书仍须匹配域名。网络失败会显示安全处理后的请求地址、底层错误码及处理建议。

严格验证 HTTPS，或直接使用明文 HTTP：

```bash
fnos login --auth oauth --server strict -e https://nas.example.com:5667 --verify-ssl
fnos login --auth oauth --server test -e http://127.0.0.1:5666
```

HTTP 不需要额外参数，和 `--verify-ssl` 同用时报参数冲突。登录时的验证策略保存在所选 server；后续换码、刷新和业务请求统一使用，业务命令也可用 `--verify-ssl` 临时启用严格验证。旧 OAuth 记录缺少该设置时默认不严格验证。access token 已过期或将在 60 秒内到期时，SDK 在请求前刷新；业务 HTTP 401 会触发刷新并最多重试一次。刷新后的 session 保存成功才继续发送请求。刷新失效时需重新运行 OAuth 登录，业务命令不会自动打开授权交互或改用密码登录。

`auth.status` 展示本地记录及 token 到期时间，不联系服务器，也不证明服务端授权仍然有效。`logout` 仅清除本地记录，不撤销服务端授权。

现有 111 条业务命令均复用 SDK 请求接口，但具体端点是否可用仍受 scope、账户权限和 fnOS 网关支持限制。SDK 的真机验证范围包括授权换码和 `user.info`，不能据此推断全部端点均可用。

### 配置升级兼容

旧配置缺少 `authType` 时按密码认证读取；旧版顶层单 server 凭据仍按原流程迁移到 `servers.default`。成功的密码登录写回 `authType: "password"`，已有 `credentialVersion: 2` 和 `secretFormat: "decrypted-v1"` 的含义不变。

OAuth 记录使用 `authType: "oauth"`，保存 endpoint、可用账户名，以及 `oauth.clientId`、`deviceId`、`deviceName`、`scopes`、`verifySsl` 和 `session`。session 包含 accessToken、refreshToken、expiresAt（Unix 秒）。旧的 `allowInsecureHttp` 字段读取时忽略，后续保存时移除。密码登录的验证策略保存为该 server 的 `verifySsl`。OAuth 不保存密码、WS token/secret、一次性授权码或 PKCE verifier。恢复时复用原 deviceId 和 clientId。

配置文件继续使用 0600 权限；同一 server 的登录、OAuth 请求和退出登录通过进程锁协调，刷新和其他 server 的写入不会相互覆盖。新版可以读取旧配置；含 OAuth 记录的文件不能交给旧版 CLI 读取。

### WSS

在 endpoint 中直接使用 `wss://`。默认兼容 fnOS 常见的自签名证书；需要严格验证证书时添加 `--verify-ssl`。当 fnOS 把 WS 重定向到 HTTPS 时，错误会同时显示原地址和重定向地址，并提示改用 `wss://`。

## 命令参考

fnos-cli 提供 21 个领域、111 条业务命令。完整参数、类型和默认值见 [命令参考](docs/commands.md)。

帮助按命令层级展开：顶层列出命令组及全局参数，命令组列出直接子命令、
通用认证参数及全局参数，具体命令再展示自己的业务参数。

```bash
fnos --help
fnos user --help
fnos user getPreference --help
```

直接运行 `fnos` 或 `fnos user` 也会展示对应层级的帮助。通用认证参数可放在
业务组的子命令之前或之后，例如 `fnos user --server office info` 与
`fnos user info --server office` 等价。

常用示例：

```bash
fnos resmon systemFan
fnos docker listContainers --all true
fnos backup listTasks --direction 0
fnos network getInfo --if-name eth0
fnos security getProcessTraffic --processes '[{"pid":1001,"process":"demo"}]'
```

全部原有点号命令（例如 `fnos user.info`）保持兼容，但从顶层帮助和 Tab 补全候选中隐藏。
既有 camelCase 参数也保留为隐藏别名。升级后重新执行 `fnos completion install zsh`，
即可启用按层级补全的新命令形式。

### 全局选项

| 选项 | 说明 |
|---|---|
| `--raw` | 输出原始 JSON |
| `--lang <locale>` | 临时选择显示语言：`zh-CN` 或 `en` |
| `-v, --verbose` | 输出 info 日志到 stderr |
| `-vv, --debug` | 输出 debug 日志到 stderr |
| `-vvv, --silly` | 输出 silly 日志到 stderr |
| `-V, --version` | 显示版本 |
| `-h, --help` | 显示帮助 |

默认输出面向人类阅读：对象数组显示为表格，普通对象显示为分层的字段—值布局。交互终端会根据可用宽度自动换行并使用克制配色；管道、文件重定向、`TERM=dumb` 或设置 `NO_COLOR` 时不会输出 ANSI 色码。

交互终端会在普通命令、登录、退出和帮助信息前显示一次多行 `fnOS CLI` 字符 LOGO，并与正文空一行。终端宽度不足 42 列时改为单行 `fnOS CLI`；`NO_COLOR` 或 `TERM=dumb` 时仍显示无色 LOGO。`--raw`、管道、文件重定向、版本号和补全脚本输出不显示 LOGO。

命令结果写入 stdout，日志写入 stderr。脚本和机器解析应使用 `--raw` 获取原始 JSON：

```bash
fnos resmon cpu --raw > result.json 2> fnos.log
```

## 配置与日志

- `~/.fnos/settings.json`：登录凭证，权限固定为 0600
- `~/.fnos/logs/`：日志文件目录

密码目前以本地设置值保存，并非系统钥匙串或加密保险库。请保护用户主目录权限，不要共享设置文件。

OAuth token 同样是本地设置中的敏感值。认证/授权失效返回退出码 `3`，参数错误返回 `4`，网络、TLS、存储或业务执行失败返回 `1`。业务响应明确失败时，即使 HTTP 为 200 也返回非零；`--raw` 仍保留该原始业务响应。

## 开发

### 运行测试

```bash
npm test                 # 离线单元测试
npm run test:smoke       # 需要 127.0.0.1:5666 上运行固定版本 fnos-mock-server
npm run test:all         # 单元测试和冒烟测试
```

冒烟测试固定使用 fnos-mock-server 提交 `d9592a05a8e07082b954921acfae3a9a915f3c01`、Python 3.11 和 `uv`，并设置 `FNOS_MOCK_TWOFA_USERS=twofauser`。

重新生成命令参考：

```bash
npm run docs:commands
```

### 项目结构

```text
fnos-cli/
├── bin/fnos
├── src/
│   ├── completion/
│   ├── commands/
│   │   ├── catalog/
│   │   ├── auth.js
│   │   ├── options.js
│   │   └── runner.js
│   └── utils/
├── scripts/generate-command-reference.js
├── docs/commands.md
└── test/
```

## 依赖项

- [fnos](https://www.npmjs.com/package/fnos) @ 0.5.0
- [Commander.js](https://www.npmjs.com/package/commander) @ 11.1.0
- [Winston](https://www.npmjs.com/package/winston) @ 3.19.0

## 许可证

Apache License 2.0

## 贡献

欢迎提交 Issue 和 Pull Request。
