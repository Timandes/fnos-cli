# OAuth 登录设计

用户已确认本设计并要求直接实现。密码登录保持默认，SDK 升级到 fnos ^0.5.0。

## 用户流程

- `fnos login -e <endpoint> -u <username> -p <password>` 保持现有行为。
- `fnos login --auth oauth --server <name> -e https://<host>:<port>` 创建 PKCE 授权请求，将 URL 和授权码提示写 stderr。用户可按回车打开系统默认浏览器，或手动打开链接并直接粘贴授权码；启动失败不终止授权，仍可手动继续或按回车重试。首次授权要求交互终端，业务命令不自动启动授权。
- OAuth endpoint 可用 HTTP 或 HTTPS origin；HTTP 无需额外参数。只保留 `--verify-ssl`，默认跳过 HTTPS 证书信任链和域名验证，已有 OAuth 记录也采用此默认值。HTTP 与 `--verify-ssl` 冲突。每个执行会话使用独立 dispatcher，不修改全局 TLS 验证策略。
- 参数错误返回 4，认证失败/取消/过期返回 3，网络、存储和业务失败返回 1。stdout 保留结果，`--raw` 使用 JSON。
- OAuth 登录验证 `User.getInfo()` 成功后原子替换同名记录；失败保留旧记录。授权码和 verifier 只保留在本次进程中。
- `fnos auth.status --server <name>` 只显示本地认证类型、endpoint、可用账户标识和 session 到期时间，不泄漏 token，也不宣称服务端仍有效。
- `logout` 仅清除所选 server 的本地记录。

## 配置兼容

- 缺少 `authType` 的记录视为 password；未知值拒绝。旧版顶层凭据继续迁移到 servers.default。
- password 使用原有 credentialVersion 2、secretFormat decrypted-v1 和 WS token 字段；成功登录保存时补 authType=password。
- OAuth 记录为 `{authType:'oauth', endpoint, username?, oauth:{clientId,deviceId,deviceName,scopes,verifySsl,session:{accessToken,refreshToken,expiresAt}}}`，expiresAt 是 Unix 秒。verifySsl 缺省视为 false，只有布尔值 true 才启用严格验证；旧 allowInsecureHttp 字段读取时忽略，保存时移除。
- 密码记录使用 server 顶层 verifySsl 保存相同策略。登录时写入，后续命令复用；业务命令可临时启用严格验证。
- OAuth 不保存 password、WS token/secret、授权码和 verifier。恢复时复用 endpoint/clientId/deviceId/scopes。
- 配置目录 0700、文件 0600；原子替换，并在短文件锁内重新读取再更新，防止不同 server 更新丢失。
- 同一 server 的 OAuth 使用/刷新串行化：获取 server 锁后重新读取记录，持有到命令结束；login/logout 使用相同锁。进程退出或失败释放锁，过期进程锁可回收。

## 客户端和错误

- 复用全部既有业务命令、SDK 领域类、参数和格式化。引入 `{client, dispose}` 执行会话接口；WS dispose 关闭连接，OAuth dispose 释放锁。
- SDK 负责 60 秒内临期刷新和 HTTP 401 后最多一次重试；CLI 的 saveSession 回调在新 token 使用前保存新 session。CLI 不增加第二层重试，也不自动改用密码。
- SDK 目前无结构化 OAuth 错误类型。CLI 的 fetch 边界保留 HTTP 状态，并以认证端点拒绝、业务 HTTP 401 区分认证失败；网络/TLS/存储失败仍为 1。
- 明确的业务失败结果返回非零，raw 仍保留原始业务响应。OAuth 不承诺所有现有端点都已真机验证。
- 日志扩展 refreshToken、codeVerifier、Authorization Bearer 脱敏。Token 请求也设置超时。
- undici 6 提供每个会话的 TLS dispatcher；最低 Node 版本为 18.17。登录和执行会话在成功、失败及退出时销毁自己的连接池。

## 验收

离线测试覆盖混合配置、顶层迁移、失败不覆盖、非交互拒绝、过期/取消、session 恢复和刷新、锁竞争/进程退出、存储失败、业务失败和敏感信息。实际发布的 fnos 0.5.0 通过可控 fetch 或本地 HTTP/HTTPS fixture 验证授权及刷新。完整单元套件通过；现有 WS mock 冒烟保持通过；不使用真实授权码或执行真实 NAS 业务请求。文档、命令参考、补全与包内容同步。

## 实施与验收记录（2026-10-18）

- 分支 `feature/oauth-login`，项目内 `.worktrees/oauth-login`；未合并或发布。
- 已安装并锁定实际发布的 fnos 0.5.0，声明依赖范围 ^0.5.0。
- Node 22.23.3：`npm test`，226 passing、0 failing。
- Node 18.20.8：使用该运行时执行完整 Mocha 单元套件，226 passing、0 failing。
- 固定 fnos-mock-server 提交 d9592a05a8e07082b954921acfae3a9a915f3c01、Python 3.11：5 项冒烟通过，覆盖全部 111 个业务命令、密码登录、token 重用和 2FA。
- 固定 mock 的 getReservedPartition 本来就返回 result=fail、errno=100060001；现断言退出码 1 且原始响应保留，其余 110 条命令要求退出码 0。
- npm pack --dry-run 包含 OAuth/session/lock 运行文件，不包含测试文件；git diff --check 通过。
- 一次独立全分支审查发现两项 Important：遗留回收锁无法恢复、首次 user.info HTTP 错误分类不一致。两项均先以回归测试复现失败，再修复，随后重新运行完整单元和冒烟套件通过。无遗留 Critical/Important/Minor 项。
- Node 18 基线原有五项 DCS 控制串剥离测试失败；已在 main 复现，并补足最小兼容处理，两种运行时均通过，raw JSON 不变。
- 证书策略调整另经独立审查，修复密码自动更新将临时 `--verify-ssl` 永久保存的问题；旧顶层凭据与 default 记录比较时将缺省策略视为 false。均先复现失败，再通过回归测试。
- 本地自签名 HTTPS 服务验证默认模式的授权码兑换、刷新和业务请求，严格模式拒绝同一证书；全局 fetch 证书策略保持不变。NAS-11 无凭据 HEAD 探测在默认模式返回 HTTP 200，严格模式报告 DEPTH_ZERO_SELF_SIGNED_CERT。

## 主干集成验收（2026-10-18）

- 保留主干已有的终端 logo 和分层帮助，合并 OAuth 登录与证书验证策略；命令参考重新生成，README 同步分层调用示例。
- Node 22.23.3 与 Node 18.20.8 的完整单元套件各通过 263 项。
- 固定版本 mock 的 6 项冒烟通过，分别覆盖全部 111 条分层与点号业务命令，并覆盖密码登录、token 重用、命名 server 和 2FA。

## 保留的边界与取舍

- HTTP 200 的 OAuth 错误 envelope 缺少稳定服务端错误码契约，暂按一般执行失败返回 1；因此部分真实认证拒绝可能尚未细分为 3。
- 未进行真实 NAS OAuth 登录或业务调用；111 条命令共享 OAuth 传输不等于所有真实网关端点均可用，仍可能因 scope、权限和网关能力被拒绝。
- 服务端刷新轮换后若磁盘写入失败，停止业务请求并要求修复存储后重新授权；本地无法回滚服务端 token。
- 继续严格校验整个设置文件。任一记录损坏或 authType 未知时，需先修复该配置，才可使用其他记录。
