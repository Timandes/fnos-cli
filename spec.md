# 插件系统规格说明

## 1. 概述

本文档定义了 fnos-cli 插件系统的功能规格说明。插件系统允许用户通过加载外部模块来扩展 fnos-cli 的命令行功能，同时保持与现有命令的兼容性。

**参考系统**：OpenClaw 插件系统（github.com/opewclaw/openclaw）

## 2. 用户故事

### US-1: 作为第三方开发者，我希望创建自定义插件
我想要为 fnos-cli 开发一个插件，添加新的命令来处理特定的工作流程（如自动化备份、批量文件处理等），以便用户可以通过 `fnos <plugin-name> <command>` 的方式使用这些功能。

**接受标准**：
- 提供脚手架工具 `fnos create-plugin <name>` 快速创建插件模板
- 提供插件 SDK，包含类型定义和工具函数
- 提供开发文档和示例插件
- 插件可以注册多个命令
- 插件命令支持全局选项（--raw, -v 等）

### US-2: 作为 fnos-cli 用户，我希望在配置文件中指定插件路径
我想要在 `~/.fnos/settings.json` 中配置插件的存储位置，以便我可以：
1. 使用项目根目录 `plugins/` 中的官方插件
2. 指定自定义路径来加载我自己的插件

**接受标准**：
- 配置文件支持 `pluginPaths` 数组指定多个插件路径
- 插件路径可以是绝对路径或相对于用户主目录的路径
- 启动时自动扫描所有指定路径并加载插件

### US-3: 作为 fnos-cli 用户，我希望通过 --help 查看插件命令
我想要运行 `fnos --help` 或 `fnos <plugin-name> --help` 时，能够看到所有可用的插件命令及其描述，以便了解如何使用它们。

**接受标准**：
- `fnos --help` 显示所有插件名称
- `fnos <plugin-name> --help` 显示该插件的所有命令
- 每个命令都有清晰的描述

### US-4: 作为 fnos-cli 用户，我希望插件可以访问我的认证凭据
我编写的插件需要连接到 NAS 服务器执行操作，所以我希望插件能够访问我在 `fnos login` 时保存的认证凭据（endpoint, username, password），而不需要我重复输入。

**接受标准**：
- 插件通过依赖注入访问认证凭据
- 凭据以只读方式提供给插件
- 插件无法修改存储的凭据

### US-5: 作为 fnos-cli 用户，我希望插件配置有独立的配置节
我想要在 `settings.json` 中为每个插件配置独立的参数（如备份路径、调度时间等），并且系统应该验证这些配置的正确性。

**接受标准**：
- 每个插件有独立的配置节：`plugins.<pluginName>: { ... }`
- 插件必须提供 JSON Schema 来验证配置
- 配置无效时，插件加载失败并显示错误信息

### US-6: 作为 fnos-cli 用户，我希望命令冲突时能够得到明确的错误提示
当我想安装的插件试图注册一个与现有命令名称相同的命令时，系统应该拒绝加载该插件并告诉我冲突的命令名称，以便我能够修复问题。

**接受标准**：
- 检测命令名称冲突（包括内置命令和其他插件命令）
- 冲突时显示清晰的错误信息
- 拒绝加载冲突的插件

## 3. 功能需求

### 3.1 插件发现机制

**FR-1.1**: WHEN fnos-cli 启动时，THEN 系统应扫描以下路径发现插件：
1. 项目根目录的 `plugins/` 文件夹
2. `settings.json` 中 `pluginPaths` 数组指定的所有路径

**FR-1.2**: WHEN 扫描插件目录时，THEN 系统应查找包含 `package.json` 且其中包含 `fnos.plugin` 字段的目录。

**FR-1.3**: WHEN 配置文件中的 `pluginPaths` 指定路径时，THEN 系统仅支持绝对路径，不支持 `~` 扩展或相对路径。

**FR-1.3**: WHEN 发现插件时，THEN 系统应加载插件的入口文件（由 `package.json` 中的 `main` 或 `fnos.plugin.entry` 指定）。

### 3.2 插件清单（Manifest）

**FR-2.1**: WHEN 插件定义清单时，THEN `package.json` 中的 `fnos.plugin` 字段必须包含：
- `name`: 插件唯一标识符（必须与目录名匹配）
- `version`: 插件版本号（语义化版本）
- `entry`: 插件入口文件路径（相对于插件根目录）
- `commands`: 命令数组（可选，也可在入口文件中定义）

**FR-2.2**: WHEN 插件入口文件加载时，THEN 它必须导出一个对象，包含：
- `name`: 插件名称
- `version`: 插件版本
- `description`: 插件描述
- `schema`: JSON Schema 验证对象
- `init`: 初始化函数 `(config, deps) => commands`

**FR-2.3**: WHEN 插件同时定义了 `package.json` 中的 `commands` 和入口文件返回的 `commands` 时，THEN 系统应合并两者，如果存在重复的命令名称则报错并拒绝加载该插件。

**FR-2.3**: WHEN 插件的 `schema` 字段存在时，THEN 它必须是一个有效的 JSON Schema，用于验证 `settings.json` 中 `plugins.<pluginName>` 的配置。

### 3.3 插件配置

**FR-3.1**: WHEN 插件加载时，THEN 系统应从 `settings.json` 读取 `plugins.<pluginName>` 配置节。

**FR-3.2**: WHEN 插件配置存在时，THEN 系统应使用插件提供的 `schema` 验证配置。

**FR-3.3**: WHEN 验证配置时，THEN 系统应使用 `ajv` 库进行 JSON Schema 验证。

**FR-3.3**: WHEN 配置验证失败时，THEN 系统应拒绝加载该插件并显示详细的验证错误信息。

**FR-3.4**: WHEN 插件配置不存在时，THEN 系统应使用空对象 `{}` 作为配置（如果 schema 允许）。

### 3.4 命令注册

**FR-4.1**: WHEN 插件的 `init` 函数执行时，THEN 它应返回一个命令对象，其中每个键是命令名称，值是命令配置：
```javascript
{
  "commandName": {
    description: "Command description",
    action: async (options) => { /* command logic */ },
    params: [
      { name: "param1", required: true, description: "..." },
      { name: "param2", option: "--custom-name <value>", description: "..." }
    ]
  }
}
```

**FR-4.2**: WHEN 插件命令的 `params` 数组定义时，THEN 系统应使用混合模式映射参数：
- 如果 `param` 只包含 `name` 字段，自动生成 `--<name> <value>` 选项
- 如果 `param` 包含 `option` 字段，使用自定义的选项格式
- 如果 `param.required` 为 true，标记为必需参数

**FR-4.3**: WHEN 插件注册命令时，THEN 系统应将命令注册为 `fnos <pluginName> <commandName>`。

**FR-4.4**: WHEN 检测到命令名称冲突时（与内置命令或其他插件命令冲突），THEN 系统应：
1. 停止加载该插件
2. 显示错误信息：`Plugin <pluginName> failed to load: command '<commandName>' conflicts with existing command`
3. 继续加载其他插件

**FR-4.5**: WHEN 插件命令执行时，THEN 它应自动支持以下全局选项：
- `--raw`: 输出原始 JSON
- `-v, --verbose`: 详细日志（info 级别）
- `-vv, --debug`: 调试日志（debug 级别）
- `-vvv, --silly`: 最详细日志（silly 级别）

### 3.5 依赖注入

**FR-5.1**: WHEN 插件的 `init` 函数被调用时，THEN 它应接收一个 `deps` 对象，包含：
- `logger`: Winston logger 实例
- `settings`: Settings 实例（用于访问配置）
- `auth`: 认证凭据对象 `{ endpoint, username, password, token, longToken, secret }`
- `getSDKInstance`: 函数 `(client, className) => SDKInstance`

**FR-5.2**: WHEN 插件通过 `deps.auth` 访问凭据时，THEN 凭据对象应为只读，任何修改尝试应抛出错误。

**FR-5.3**: WHEN 插件命令的 `action` 函数被调用时，THEN 它应接收一个 `options` 对象，包含：
- 命令特定的参数
- 全局选项（--raw, --verbose 等）
- 已解析的认证凭据（通过命令行或配置文件）

### 3.6 错误处理

**FR-6.1**: WHEN 插件加载过程中发生错误时，THEN 系统应：
1. 记录错误日志（error 级别）
2. 显示用户友好的错误消息
3. 跳过该插件，继续加载其他插件

**FR-6.2**: WHEN 插件命令执行过程中抛出错误时，THEN 系统应：
1. 捕获错误
2. 记录详细错误日志（如果启用 --debug 或 --verbose）
3. 显示用户友好的错误消息
4. 以非零退出码退出

### 3.7 插件 SDK

**FR-7.1**: WHEN 提供插件 SDK 时，THEN SDK 应内嵌在 fnos-cli 中，插件通过 `require('fnos-cli/sdk')` 访问，并包含：
- TypeScript 类型定义（`.d.ts` 文件）
- 命令注册辅助函数
- 配置验证辅助函数（基于 ajv）
- 常用工具函数（如错误处理、日志封装）

**FR-7.2**: WHEN SDK 导出类型时，THEN 应包含以下类型：
- `PluginDefinition`: 插件定义接口
- `CommandConfig`: 命令配置接口
- `PluginDeps`: 依赖注入接口
- `CommandOptions`: 命令选项接口

### 3.8 脚手架工具

**FR-8.1**: WHEN 用户运行 `fnos create-plugin <name>` 时，THEN 系统应：
1. 在当前目录创建 `<name>/` 文件夹
2. 生成 `package.json` 文件，包含 `fnos.plugin` 清单
3. 生成 `index.js` 入口文件，包含插件模板代码（JavaScript）
4. 生成 `README.md` 文件，包含开发说明
5. 生成 `.gitignore` 文件

**FR-8.2**: WHEN 生成插件模板时，THEN 生成的代码应包含：
- 完整的插件定义结构
- 示例命令（支持混合模式参数映射）
- 配置 Schema 示例（ajv 格式）
- JSDoc 注释

## 4. 非功能需求

### 4.1 性能

**NFR-1.1**: WHEN fnos-cli 启动时，THEN 插件加载时间应小于 2 秒（假设有 10 个插件）。

**NFR-1.2**: WHEN 插件命令执行时，THEN 命令响应时间应与内置命令相当（通常小于 5 秒）。

### 4.2 安全

**NFR-2.1**: WHEN 加载插件时，THEN 系统应验证插件文件的完整性（可选，未来版本可添加签名验证）。

**NFR-2.2**: WHEN 插件访问认证凭据时，THEN 凭据应以只读方式提供，插件无法修改。

**NFR-2.3**: WHEN 插件配置包含敏感信息时，THEN 这些信息应存储在 `settings.json` 中，并设置适当的文件权限（600）。

### 4.3 可维护性

**NFR-3.1**: WHEN 插件系统架构设计时，THEN 应遵循以下原则：
- 模块化设计：插件加载、验证、注册分离
- 单一职责：每个模块只负责一个功能
- 依赖注入：减少模块间耦合

**NFR-3.2**: WHEN 编写插件系统代码时，THEN 应为所有公共函数添加 JSDoc 注释。

**NFR-3.3**: WHEN 提供插件 SDK 时，THEN SDK 应与主 CLI 版本保持兼容。

### 4.4 兼容性

**NFR-4.1**: WHEN 插件系统设计时，THEN 应与现有命令系统兼容，不影响现有命令的功能。

**NFR-4.2**: WHEN 插件系统设计时，THEN 应支持 Node.js v14+（与现有 fnos-cli 兼容）。

### 4.5 可扩展性

**NFR-5.1**: WHEN 未来需要添加新的插件功能时，THEN 插件接口应支持扩展（如添加新的生命周期钩子）。

**NFR-5.2**: WHEN 插件系统设计时，THEN 应支持插件之间的依赖关系（可选，未来版本）。

**NFR-5.3**: WHEN 开发插件时，THEN 开发者需要重启 CLI 才能加载修改后的插件，不提供热重载功能以简化实现。

## 5. 边界情况和错误处理

### 5.1 插件发现边界情况

**BC-1.1**: WHEN 插件目录不存在时，THEN 系统应记录警告但不影响 CLI 启动。

**BC-1.2**: WHEN 插件目录为空时，THEN 系统应正常启动，显示"没有发现插件"的提示（可选）。

**BC-1.3**: WHEN 插件目录包含非插件目录时，THEN 系统应忽略这些目录。

**BC-1.4**: WHEN 插件的 `package.json` 缺少 `fnos.plugin` 字段时，THEN 系统应忽略该目录。

**BC-1.5**: WHEN 插件的入口文件不存在时，THEN 系统应拒绝加载该插件并显示错误。

**BC-1.6**: WHEN 配置文件中的 `pluginPaths` 包含非绝对路径时，THEN 系统应拒绝加载该路径并显示错误。

### 5.2 插件加载边界情况

**BC-2.1**: WHEN 插件的 `init` 函数抛出错误时，THEN 系统应捕获错误并跳过该插件。

**BC-2.2**: WHEN 插件的 `init` 函数返回非对象或无效命令对象时，THEN 系统应拒绝加载该插件。

**BC-2.3**: WHEN 插件的 `schema` 不是有效的 JSON Schema 时，THEN 系统应拒绝加载该插件。

**BC-2.4**: WHEN 插件配置验证失败时，THEN 系统应显示详细的验证错误路径和消息。

### 5.3 命令注册边界情况

**BC-3.1**: WHEN 插件尝试注册空命令列表时，THEN 系统应允许加载（插件可能只提供扩展功能，不提供命令）。

**BC-3.2**: WHEN 插件命令名称包含非法字符时，THEN 系统应拒绝注册该命令。

**BC-3.3**: WHEN 插件命令名称与内置命令冲突时，THEN 系统应拒绝加载该插件并显示冲突信息。

**BC-3.4**: WHEN 两个插件尝试注册相同的命令名称时，THEN 系统应拒绝加载第二个插件并显示冲突信息。

**BC-3.5**: WHEN 插件的 `package.json` 和入口文件都定义了相同的命令名称时，THEN 系统应拒绝加载该插件并显示重复定义错误。

### 5.4 配置边界情况

**BC-4.1**: WHEN `settings.json` 中不存在 `plugins` 配置节时，THEN 系统应使用空对象 `{}`。

**BC-4.2**: WHEN 插件配置节存在但为空时，THEN 系统应使用空对象 `{}` 作为配置。

**BC-4.3**: WHEN 插件配置节包含 schema 中未定义的字段时，THEN 系统应根据 JSON Schema 的 `additionalProperties` 设置决定是否允许。

### 5.5 依赖注入边界情况

**BC-5.1**: WHEN 用户未登录时（没有认证凭据），THEN `deps.auth` 应为 `null`。

**BC-5.2**: WHEN 插件尝试修改 `deps.auth` 对象时，THEN 系统应抛出错误。

**BC-5.3**: WHEN 插件尝试访问不存在的依赖时，THEN 系统应返回 `undefined` 或抛出错误。

### 5.6 命令执行边界情况

**BC-6.1**: WHEN 用户调用不存在的插件命令时，THEN 系统应显示"未知命令"错误。

**BC-6.2**: WHEN 插件命令缺少必需参数时，THEN 系统应显示参数说明并退出。

**BC-6.3**: WHEN 插件命令执行超时时，THEN 系统应终止命令并显示超时错误。

**BC-6.4**: WHEN 插件命令返回非 JSON 结果时，THEN 系统应根据 `--raw` 选项决定输出格式。

### 5.7 参数映射边界情况

**BC-7.1**: WHEN 插件命令的 `params` 数组中包含无效的 `option` 格式时，THEN 系统应拒绝注册该命令并显示错误。

**BC-7.2**: WHEN 插件命令的 `params` 数组中参数名称为空时，THEN 系统应拒绝注册该命令并显示错误。

**BC-7.3**: WHEN 用户提供的参数值无法解析为期望的类型时，THEN 系统应显示类型转换错误并提示正确的格式。

## 6. 验收标准

### AC-1: 插件发现和加载
- [ ] fnos-cli 启动时能够扫描 `plugins/` 目录和配置文件中指定的路径
- [ ] 能够正确识别包含 `fnos.plugin` 清单的插件
- [ ] 能够加载插件的入口文件并执行 `init` 函数

### AC-2: 命令注册
- [ ] 插件命令能够注册为 `fnos <pluginName> <commandName>`
- [ ] 命令冲突时能够正确检测并拒绝加载
- [ ] 插件命令支持全局选项（--raw, -v 等）

### AC-3: 配置管理
- [ ] 插件配置能够从 `settings.json` 的 `plugins.<pluginName>` 读取
- [ ] 配置验证失败时能够显示详细的错误信息
- [ ] 配置不存在时能够使用默认值

### AC-4: 依赖注入
- [ ] 插件能够通过 `deps` 对象访问 logger、settings、auth
- [ ] 认证凭据以只读方式提供
- [ ] 插件能够使用 `getSDKInstance` 创建 SDK 实例

### AC-5: 错误处理
- [ ] 插件加载失败时能够记录错误并跳过
- [ ] 命令执行失败时能够显示友好的错误信息
- [ ] 插件错误不影响其他插件的加载

### AC-6: 开发工具
- [ ] `fnos create-plugin` 能够创建完整的插件模板
- [ ] 插件 SDK 提供完整的类型定义和工具函数
- [ ] 提供开发文档和示例插件

## 7. 参考资料

- OpenClaw Plugin System: https://deepwiki.com/openclaw/openclaw/10.1-plugin-system-overview
- OpenClaw Creating Custom Plugins: https://deepwiki.com/openclaw/openclaw/10.3-creating-custom-plugins
- Commander.js Documentation: https://www.npmjs.com/package/commander
- JSON Schema Specification: https://json-schema.org/