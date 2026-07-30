# fnos-cli

[![npm version](https://badge.fury.io/js/fnos-cli.svg)](https://www.npmjs.com/package/fnos-cli)
![License](https://img.shields.io/npm/l/fnos-cli)

飞牛 fnOS 系统的命令行客户端，通过 WebSocket/WSS 调用 fnOS API。

## 功能

- 提供 21 个业务领域、111 条查询命令
- 支持命名多 server、密码登录、token 重用和两步验证
- 支持 `ws://`、`wss://` 以及可选的严格证书验证
- 支持原始 JSON 和格式化输出
- 密码、验证码、token、secret 和签名材料统一日志脱敏
- 凭证保存在权限为 0600 的本地设置文件中

## 安装

需要 Node.js 18 或更高版本、npm 8 或更高版本。

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

## 登录与认证

首次使用可保存登录凭证，也可以用 `--server` 为不同 fnOS server 命名：

```bash
fnos login -e nas.example.com:5666 -u admin -p password
fnos login --server office -e office.example.com:5666 -u admin -p password
fnos sysinfo.getHostName --server office
fnos logout --server office
```

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
fnos resmon.cpu -e nas.example.com:5666 -u admin -p password
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

### WSS

在 endpoint 中直接使用 `wss://`。默认兼容 fnOS 常见的自签名证书；需要严格验证证书时添加 `--verify-ssl`。当 fnOS 把 WS 重定向到 HTTPS 时，错误会同时显示原地址和重定向地址，并提示改用 `wss://`。

## 命令参考

fnos-cli 提供 21 个领域、111 条业务命令。完整参数、类型和默认值见 [命令参考](docs/commands.md)。

常用示例：

```bash
fnos resmon.systemFan
fnos docker.listContainers --all true
fnos backup.listTasks --direction 0
fnos network.getInfo --if-name eth0
fnos security.getProcessTraffic --processes '[{"pid":1001,"process":"demo"}]'
```

原有 26 条命令名称保持兼容，既有 camelCase 参数也保留为隐藏别名。

### 全局选项

| 选项 | 说明 |
|---|---|
| `--raw` | 输出原始 JSON |
| `-v, --verbose` | 输出 info 日志到 stderr |
| `-vv, --debug` | 输出 debug 日志到 stderr |
| `-vvv, --silly` | 输出 silly 日志到 stderr |
| `-V, --version` | 显示版本 |
| `-h, --help` | 显示帮助 |

命令结果写入 stdout，日志写入 stderr：

```bash
fnos resmon.cpu --raw > result.json 2> fnos.log
```

## 配置与日志

- `~/.fnos/settings.json`：登录凭证，权限固定为 0600
- `~/.fnos/logs/`：日志文件目录

密码目前以本地设置值保存，并非系统钥匙串或加密保险库。请保护用户主目录权限，不要共享设置文件。

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

- [fnos](https://www.npmjs.com/package/fnos) @ 0.4.0
- [Commander.js](https://www.npmjs.com/package/commander) @ 11.1.0
- [Winston](https://www.npmjs.com/package/winston) @ 3.19.0

## 许可证

Apache License 2.0

## 贡献

欢迎提交 Issue 和 Pull Request。
