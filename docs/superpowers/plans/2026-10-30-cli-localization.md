# CLI Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 提供默认简体中文、可选英文的完整 CLI 文案，以及持久语言偏好和临时覆盖。

**Architecture:** 在项目内维护两份同键字典，由每次调用独立的语言上下文统一处理插值和翻译。Commander 适配层在参数解析前解析语言来源，配置命令复用现有 settings 锁与原子保存；命令注册、运行时提示、格式化器和补全共享同一翻译入口。

**Tech Stack:** Node.js >=18.17，CommonJS JavaScript，Commander 11，Mocha，node:async_hooks；不新增依赖。

**Spec:** `docs/superpowers/specs/2026-10-30-cli-localization-design.md`

## Global Constraints

- 语言只接受 `zh-CN` 和 `en`；默认 `zh-CN`。
- 优先级：`--lang` > `FNOS_LANG` > settings 顶层 `language` > `zh-CN`，空环境变量视为未设置。
- 不从 `LANG`、`LC_ALL` 或操作系统语言推断。
- CLI 自有帮助、错误、交互、日志和结果标签使用所选语言；SDK、服务器消息和业务字符串保持原文。
- `--raw` JSON 的键、值、缩进和字段顺序不随语言变化；退出码、脱敏及流分工保持原约定。
- 偏好读写不迁移旧凭据；使用现有 settings 锁及原子保存，目录 `0700`、文件 `0600`。
- 不修改用户实际的 settings、偏好或 NAS；使用临时目录和假客户端验证。
- 在 `feature/cli-localization` 和项目内 `.worktrees/cli-localization` 工作；当前 `main` 保持干净。
- 提交遵循英文 Conventional Commits，禁止 `Co-Authored-By`。

## Review Focus

- `--lang` 出现在其他必填选项的值中、短参数附着值中或 `--` 后时，不能改变语言；Task 2 覆盖。
- 设置 JSON 损坏或读取权限不足时，帮助/版本可用，但配置写入必须失败并保留原内容；Task 1、2 覆盖。
- 同进程先英文后中文或并行调用，不得共享可变语言状态；Task 1、2、3 覆盖。
- 偏好更新与密码凭据保存/OAuth 刷新同时发生，不得丢字段；Task 1 覆盖。
- 翻译插值含换行、终端控制码或敏感值时，保持输出净化和日志脱敏；Task 3 覆盖。

---

### Task 1: Language Context and Preference Storage

**Files:**
- Create: `src/i18n/languages.js`, `src/i18n/index.js`, `src/i18n/en.js`, `src/i18n/zh-CN.js`
- Modify: `src/utils/settings.js`
- Test: `test/unit/i18n.test.js`, `test/unit/language-settings.test.js`

**Interfaces:**
- Produces: `src/i18n/languages.js` 的 `SUPPORTED_LANGUAGES`（冻结数组）、`isLanguage(value) -> boolean`；纯语言标识模块不加载字典、SDK 或日志。
- Produces: `src/i18n/index.js` 的 `withLanguage(locale, callback) -> callback result`、`getLanguage() -> locale`、`t(key, values = {}) -> string`；使用 AsyncLocalStorage 隔离调用，字典缺失键回退英文，插值值只替换一次，不重新解释其中的占位符。
- Produces: `Settings.getLanguage() -> string | null`、`Settings.setLanguage(locale) -> void`、`Settings.clearLanguage() -> void`；无偏好返回 null，损坏 JSON/非对象根抛 ConfigurationError；未知语言保存值由上层 resolver 判断。
- Existing: `_withSettingsLock(action)`, `load()`, `save(data)`；偏好写入在锁内读原始配置，不调用触发迁移的 `_loadCredentialSettings()`。

- [x] **Step 1: Write failing context and storage tests**
  - `defaults to zh-CN`：`getLanguage() === 'zh-CN'`。
  - `isolates nested and concurrent language contexts`：英文与中文异步回调各得到对应翻译，外部仍为中文。
  - `interpolates literal values once`：带 `{other}` 的值和 `$&` 不被再次解释。
  - `persists only the language field`：对旧顶层凭据、混合 servers 和未知设置执行 set/unset 后，其余字节解析值不变，不触发迁移。
  - `does not overwrite corrupt settings`：非法 JSON、数组根、不可读取/不可替换文件时抛错且原文件不变；校验权限、无设置时 clear 不创建文件。
  - `preserves concurrent credential writes`：两个本地子进程经同一 settings 锁分别写偏好和凭据，结果同时含二者；OAuth session 更新后仍保留偏好。
- [x] **Step 2: Run RED**
  Run: `npx mocha test/unit/i18n.test.js test/unit/language-settings.test.js`
  Expected: 新功能断言失败；测试使用可选导入/类型断言说明缺失接口，避免只以模块加载错误作为证据。
- [x] **Step 3: Implement the interfaces above**
  字典先加入本任务测试所需的公共标签；设置错误沿用 ConfigurationError，语言值验证仅依赖轻量 languages.js 并在不持有锁时进行，写入与合并在锁内完成。settings 的错误翻译在错误路径惰性加载，普通 __complete 查询不加载完整翻译模块。
- [x] **Step 4: Run GREEN**
  Run: `npx mocha test/unit/i18n.test.js test/unit/language-settings.test.js test/unit/settings.test.js test/unit/oauth-settings.test.js`
  Expected: 全部通过，无配置迁移或权限回归。
- [x] **Step 5: Commit**
  Commit the task files with `feat(i18n): add language context and persistent preferences`.

### Task 2: Localized Command Parsing, Help and Config Commands

**Files:**
- Create: `src/i18n/commander.js`, `src/commands/config.js`
- Modify: `src/index.js`, `bin/fnos`, `src/commands/index.js`, `src/commands/options.js`, `src/commands/auth.js`, `src/commands/completion.js`, `src/i18n/en.js`, `src/i18n/zh-CN.js`, `src/completion/spec.js`
- Test: `test/unit/language-cli.test.js`, `test/unit/config-commands.test.js`, existing help/program/completion tests

**Interfaces:**
- Consumes: Task 1 的字典入口和 Settings 偏好接口。
- Produces: `resolveLanguage(args, program, dependencies = {}) -> { language, source }`，args 为不含 node/bin 的 argv；dependencies 可注入 env 和 settings；高优先级有效值短路低优先级读取。
- Produces: `configureLocalization(program, dependencies = {}) -> program`，在 Commander 解析用户 argv 之前确定语言并将整次同步/异步执行包在 `withLanguage` 中，同时适配直接 `outputHelp()`；不通过改 process.env 传播语言。
- Produces: `registerConfigCommand(program, dependencies = {}) -> void`；只支持 `get/set/unset language`。get JSON 为 `{ language, effectiveLanguage, source }`；set/unset JSON 为 `{ language }`；成功提示使用调用开始时的语言。
- Preserves: `createProgram(dependencies = {})`, `main(argv = process.argv, dependencies = {})` 的公开调用方式，包含 `parseAsync(args, { from: 'user' })` 和无参数帮助。

- [x] **Step 1: Write failing CLI and config tests**
  - 验证默认中文及 `--lang en` / `--lang=en`、FNOS_LANG、持久偏好的四级优先级；显式有效参数覆盖无效环境变量。
  - 验证 root/group/leaf/dotted/help-navigation 的双语说明、标题、帮助默认值说明；对 21 个领域、111 条命令与全部选项遍历检查两份字典覆盖。
  - 验证参数在命令前后和层级之间、重复参数最后值优先、`--` 边界、其他选项值为 `--lang` 或附着短参数包含该字符串时不误识别。
  - 显式无效语言或缺值返回 `4`；未知命令、未知选项、缺少参数等 Commander 错误使用选定语言并保留原退出语义和技术标识。
  - 以临时 home 子进程执行 set → get → override → unset → get；检查 JSON、来源与跨进程保存，其他键返回 `4` 且不输出凭据。
  - 损坏 settings 时帮助、版本和补全脚本仍成功，config 写入失败且原文件不变；同进程连续解析不串语言。
- [x] **Step 2: Run RED**
  Run: `npx mocha test/unit/language-cli.test.js test/unit/config-commands.test.js`
  Expected: 默认语言、选项和新 config 命令相关断言失败。
- [x] **Step 3: Implement parsing, config and help adapters**
  基于真实命令树识别选项值并解析 --lang，使用统一路径处理 parse/parseAsync/无参数帮助。Commander 错误只按已知错误 code 适配 CLI 自有文案，不对任意 Error.message 做翻译匹配。目录原英文说明作为稳定消息键集中翻译，文档仍可直接选择英文；help 和 completion 使用相同的翻译结果。
- [x] **Step 4: Run GREEN and update affected compatibility assertions**
  Run: `npx mocha test/unit/language-cli.test.js test/unit/config-commands.test.js test/unit/help.test.js test/unit/program.test.js test/unit/command-options.test.js test/unit/completion-spec.test.js`
  Expected: 全部通过；原业务命令仍为 21 领域/111 条，计数明确排除 config/completion 公共工具组。旧英文文案测试显式选 en，新增默认测试不被全局英文配置掩盖。
- [x] **Step 5: Commit**
  Commit the task files with `feat(i18n): localize help and add language configuration commands`.

### Task 3: Runtime Messages and Human Output

**Files:**
- Modify: `src/commands/auth.js`, `src/commands/runner.js`, `src/commands/options.js`, `src/commands/completion.js`, `src/utils/{auth-helper,client,errors,file-lock,oauth,oauth-transport,server-selector,session,settings,browser,formatter}.js`, `src/utils/output/{values,objects,tables}.js`, `src/completion/installer.js`, `src/i18n/{en,zh-CN}.js`
- Test: `test/unit/localized-runtime.test.js`, existing auth/OAuth/password-feedback/server-selector/formatter/output tests

**Interfaces:**
- Consumes: Task 1 的 `t`/`withLanguage` 与 Task 2 的调用上下文。
- Preserves: `formatOutput(data, raw = false, options = {}) -> string`，格式化函数不改变业务响应；`errorMessage(error) -> string` 仍执行敏感值脱敏。
- Produces: 集中管理的已知字段标签翻译；未知字段走原 humanizeKey 路径。格式化值、服务端消息、SDK 诊断和技术标识只使用现有净化/脱敏流程，不对其翻译。

- [x] **Step 1: Write failing runtime tests**
  在 en 和 zh-CN 上下文分别验证参数错误、无凭据、多 server 选择、密码错误回退/服务端 errno、OAuth 输入/取消/过期/网络 TLS 建议以及 config/登录成功标签。
  断言同一个 fixture 的 raw 输出两种语言逐字等于 JSON.stringify；普通输出的成功、无数据、布尔值、认证摘要与元数据标签对应语言。
  断言未知业务字段仍显示、服务器消息含中英混合和占位符时保留原文、秘密哨兵不会出现在输出，中文标签在窄终端换行后宽度不越界。
- [x] **Step 2: Run RED**
  Run: `npx mocha test/unit/localized-runtime.test.js`
  Expected: 现有英文自有文案在中文上下文下的断言失败，raw 不变作为同步回归断言。
- [x] **Step 3: Implement translations at their source**
  逐个将 CLI 自有消息抽到同键字典，动态变量走命名插值；日志、参数和网络错误只翻译自有解释。顶层 executable 与 main 的失败路径也携带所选语言，避免作用域退出后重新出现英文前缀。
- [x] **Step 4: Run GREEN and full offline suite**
  Run: `npm test`
  Expected: 原有和新增单元测试全部通过；需要本地回环监听时使用已批准的提权运行方式。旧英文文案断言显式选择英文，不改变测试目的或减少覆盖。
- [x] **Step 5: Commit**
  Commit the task files with `feat(i18n): translate runtime feedback and human-readable output`.

### Task 4: Completion, Documentation and Final Verification

**Files:**
- Modify: `src/completion/zsh.js`, `src/commands/config.js`, `src/index.js`, `scripts/generate-command-reference.js`, `README.md`, `docs/commands.md`, `src/i18n/{en,zh-CN}.js`
- Test: `test/unit/localized-completion.test.js`, existing completion/documentation tests

**Interfaces:**
- Consumes: 现有 `fixedValues`, `withCompletion`, `buildCompletionSpec`；Task 2 已本地化的命令元数据。
- Produces: --lang 的 zh-CN/en 候选、config 键和值的静态候选，以及生成时语言的提示；不修改 __complete server 的轻量输出契约。
- Preserves: `renderCommandReference() -> string`，显式选择英文，结果不受 FNOS_LANG 或已保存偏好影响。

- [x] **Step 1: Write failing completion and documentation tests**
  双语生成的 source/autoload 脚本包含对应说明和语言候选，config 提供 language/en/zh-CN 候选，均通过 `zsh -n`。get/unset 不提示多余语言值；静态候选不启动 Node 或访问网络。
  检查 __complete server 仍不加载完整翻译、Commander、SDK、logger；环境为中文/英文时文档生成器均产生相同英文结果。
  README 断言包含四级优先级、三种配置命令、临时覆盖、默认中文以及改变语言后重装补全的说明。
- [x] **Step 2: Run RED**
  Run: `npx mocha test/unit/localized-completion.test.js test/unit/documentation.test.js`
  Expected: 新候选、说明或文档断言失败。
- [x] **Step 3: Implement completion metadata and documentation**
  从真实命令/参数注册静态候选，翻译生成脚本的用户可见提示，保留生成标记及安装所有权检查。README 仍以中文为主；命令参考显式英文；更新设计状态和本计划复选框记录实际进展。
- [x] **Step 4: Verify the full deliverable**
  Run: `npm run docs:commands`，`npm test`，`git diff --check`，`npm pack --dry-run`。
  Expected: 文档同步、全部离线测试通过、无空白错误，发布文件含新增运行时模块且不含测试/设计/计划。再检查主目录 `git status --porcelain` 为空。
- [x] **Step 5: Commit**
  Commit the task files with `docs(i18n): document language selection and localized completion`.

## Final Review and Handoff

- [x] 使用 executing-plans 的 ledger 保存已完成任务、验证证据及必要的 Ruling；不重复已完成任务。
- [x] 完成后使用 requesting-code-review 对整个分支作一次独立审阅；修复重要问题时先写复现测试，再运行完整单元测试。
- [x] 使用 verification-before-completion 核验最终结果，再使用 finishing-a-development-branch 汇报可集成状态。用户未要求前不合并、不推送、不发布；保留 worktree 供继续工作。

## Worktree Baseline

2026-10-30：在新 worktree 离线安装依赖，提权执行 `npm test`，**277 passing (8s)**。此前两项失败均未在可运行本地监听和设置锁的环境中复现；后续以此通过基线比较。

## Completion Record

- 分支：`feature/cli-localization`；原目录保持干净的 `main`。
- 首次功能验收的完整离线测试：316 项通过；中英文真实 zsh 补全、动态轻量查询、配置跨进程保存、原始 JSON 和脱敏均已覆盖。
- `npm run docs:commands`、`git diff --check`、`npm pack --dry-run` 通过；发布包包含 48 个文件，包含新运行时模块，未包含测试与设计/计划。
- 独立整分支审阅（gpt-6-astra，`9d53767..aeef31f`）：没有 Critical / Important 问题，结论 Ready to merge: Yes。
- 按确认的计划保留分支和 worktree，不合并、不推送、不发布。

### Review Feedback Follow-up — 2026-10-31

用户确认处理原审阅的三个小项，其中无命令行为按用户选择统一为错误帮助：

1. 无参数的 `fnos` 与 `fnos --lang en` 均将帮助写入 stderr、返回 `1`；显式 `--help` 仍写入 stdout、返回 `0`。原有正常无参数帮助设计以此用户决定为准。
2. 参数过多错误只插值命令名称，连接词由翻译模板提供；中英文和不含命令名的根错误均有回归测试。
3. 所有已注册命令的直接 `outputHelp()` 均按环境变量、持久偏好、默认值解析语言，保留错误帮助的 stderr 分流；命令解析进行中继续使用参数选择的语言。

三个问题均先用实际失败的回归测试复现，再修改实现。直接帮助覆盖根、分组、叶子、点号兼容入口及多级工具命令，并验证重复切换语言不修改设置文件或泄漏调用上下文。

本轮新增 6 项回归测试，全量 `npm test` 为 **322 passing (13s)**；命令参考生成同步，`git diff --check` 通过。

### Implementation Decisions

- 英文消息原文作为字典键，动态内容使用命名插值；修改文案需同步两份字典，否则会触发覆盖检查或英文回退。
- README 人工核对，不新增只匹配人类文档措辞的测试；文案遗漏仍依赖人工发现。
- 验收限定离线，不访问 NAS/真实 OAuth 服务；真机差异未验证。
- 并发调用使用独立 Commander 实例，不扩展同一可变实例的并发重入语义；嵌入调用方需自行隔离实例。
- 错误路径沿用原有控制字符处理，未发现翻译导致的新退化；本次未扩展该类错误输出的净化覆盖。
