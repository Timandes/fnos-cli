# OAuth 登录设计

用户已确认本设计并要求直接实现。密码登录保持默认，SDK 升级到 fnos ^0.5.0。

## 用户流程

- `fnos login -e <endpoint> -u <username> -p <password>` 保持现有行为。
- `fnos login --auth oauth --server <name> -e https://<host>:<port>` 创建 PKCE 授权请求，将 URL 和授权码提示写 stderr。用户在浏览器授权后回填授权码。首次授权要求交互终端，业务命令不自动启动授权。
- OAuth endpoint 必须是 HTTPS origin；测试 HTTP 须显式提供 `--allow-insecure-http` 并保存该策略。禁止默默转换 WS 地址或全局关闭证书验证。
- 参数错误返回 4，认证失败/取消/过期返回 3，网络、存储和业务失败返回 1。stdout 保留结果，`--raw` 使用 JSON。
- OAuth 登录验证 `User.getInfo()` 成功后原子替换同名记录；失败保留旧记录。授权码和 verifier 只保留在本次进程中。
- `fnos auth.status --server <name>` 只显示本地认证类型、endpoint、可用账户标识和 session 到期时间，不泄漏 token，也不宣称服务端仍有效。
- `logout` 仅清除所选 server 的本地记录。

## 配置兼容

- 缺少 `authType` 的记录视为 password；未知值拒绝。旧版顶层凭据继续迁移到 servers.default。
- password 使用原有 credentialVersion 2、secretFormat decrypted-v1 和 WS token 字段；成功登录保存时补 authType=password。
- OAuth 记录为 `{authType:'oauth', endpoint, username?, oauth:{clientId,deviceId,deviceName,scopes,allowInsecureHttp,session:{accessToken,refreshToken,expiresAt}}}`，expiresAt 是 Unix 秒。
- OAuth 不保存 password、WS token/secret、授权码和 verifier。恢复时复用 endpoint/clientId/deviceId/scopes。
- 配置目录 0700、文件 0600；原子替换，并在短文件锁内重新读取再更新，防止不同 server 更新丢失。
- 同一 server 的 OAuth 使用/刷新串行化：获取 server 锁后重新读取记录，持有到命令结束；login/logout 使用相同锁。进程退出或失败释放锁，过期进程锁可回收。

## 客户端和错误

- 复用全部既有业务命令、SDK 领域类、参数和格式化。引入 `{client, dispose}` 执行会话接口；WS dispose 关闭连接，OAuth dispose 释放锁。
- SDK 负责 60 秒内临期刷新和 HTTP 401 后最多一次重试；CLI 的 saveSession 回调在新 token 使用前保存新 session。CLI 不增加第二层重试，也不自动改用密码。
- SDK 目前无结构化 OAuth 错误类型。CLI 的 fetch 边界保留 HTTP 状态，并以认证端点拒绝、业务 HTTP 401 区分认证失败；网络/TLS/存储失败仍为 1。
- 明确的业务失败结果返回非零，raw 仍保留原始业务响应。OAuth 不承诺所有现有端点都已真机验证。
- 日志扩展 refreshToken、codeVerifier、Authorization Bearer 脱敏。Token 请求也设置超时。

## 验收

离线测试覆盖混合配置、顶层迁移、失败不覆盖、非交互拒绝、过期/取消、session 恢复和刷新、锁竞争/进程退出、存储失败、业务失败和敏感信息。实际发布的 fnos 0.5.0 通过可控 fetch 或本地 HTTP fixture 验证授权及刷新。完整单元套件通过；现有 WS mock 冒烟保持通过；不操作真实 NAS。文档、命令参考、补全与包内容同步。
