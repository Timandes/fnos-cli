# 插件系统技术实现计划

## 1. 系统架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         fnos-cli                            │
├─────────────────────────────────────────────────────────────┤
│  index.js (主入口)                                           │
│    ↓                                                         │
│  PluginLoader (插件加载器)                                    │
│    ↓                                                         │
│  PluginRegistry (插件注册表)                                  │
│    ↓                                                         │
│  CommandRegistrar (命令注册器)                               │
│    ↓                                                         │
│  Commander.js Program (命令行程序)                            │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │
┌─────────────────────────────┴──────────────────────────────┐
│                     插件系统组件                              │
├─────────────────────────────────────────────────────────────┤
│  src/plugins/                                                │
│  ├── loader.js           - 插件加载器                        │
│  ├── registry.js         - 插件注册表                        │
│  ├── registrar.js        - 命令注册器                        │
│  ├── config.js           - 插件配置管理                      │
│  ├── schema-validator.js - Schema 验证器 (ajv)               │
│  └── scaffold.js         - 脚手架工具                        │
│                                                             │
│  src/sdk/                                                   │
│  └── index.js            - 插件 SDK                          │
│                                                             │
│  plugins/ (官方插件目录)                                      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心组件

#### 1.2.1 PluginLoader (插件加载器)

**职责**：
- 扫描插件目录（`plugins/` 和配置文件中的 `pluginPaths`）
- 读取插件清单（`package.json` 中的 `fnos.plugin` 字段）
- 加载插件入口文件
- 验证插件配置
- 调用插件初始化函数
- 返回已加载的插件列表

**接口**：
```javascript
class PluginLoader {
  /**
   * 加载所有插件
   * @param {Object} options - 加载选项
   * @param {string[]} options.pluginPaths - 插件路径列表
   * @param {Object} options.settings - 设置对象
   * @param {Object} options.deps - 依赖注入对象
   * @returns {Promise<Object>} 已加载的插件映射 { pluginName: pluginInstance }
   */
  async loadAll(options): Promise<Object>

  /**
   * 加载单个插件
   * @param {string} pluginPath - 插件路径
   * @param {Object} options - 加载选项
   * @returns {Promise<Object>} 插件实例
   */
  async load(pluginPath, options): Promise<Object>

  /**
   * 读取插件清单
   * @param {string} pluginPath - 插件路径
   * @returns {Promise<Object>} 插件清单
   */
  async readManifest(pluginPath): Promise<Object>

  /**
   * 验证插件清单
   * @param {Object} manifest - 插件清单
   * @returns {boolean} 是否有效
   */
  validateManifest(manifest): boolean

  /**
   * 调用插件初始化函数
   * @param {Object} plugin - 插件定义对象
   * @param {Object} config - 插件配置
   * @param {Object} deps - 依赖注入对象
   * @returns {Promise<Object>} 命令对象
   */
  async initPlugin(plugin, config, deps): Promise<Object>
}
```

#### 1.2.2 PluginRegistry (插件注册表)

**职责**：
- 管理已加载的插件
- 维护插件到命令的映射
- 检测命令冲突
- 提供插件查询接口

**接口**：
```javascript
class PluginRegistry {
  /**
   * 注册插件
   * @param {string} pluginName - 插件名称
   * @param {Object} plugin - 插件实例
   * @returns {boolean} 注册是否成功
   */
  register(pluginName, plugin): boolean

  /**
   * 检查命令冲突
   * @param {string} commandName - 命令名称
   * @returns {Object|null} 冲突信息或 null
   */
  checkConflict(commandName): Object|null

  /**
   * 获取所有插件
   * @returns {Object} 插件映射
   */
  getAll(): Object

  /**
   * 获取指定插件
   * @param {string} pluginName - 插件名称
   * @returns {Object|null} 插件实例或 null
   */
  get(pluginName): Object|null

  /**
   * 获取所有命令
   * @returns {Array<Object>} 命令列表
   */
  getAllCommands(): Array<Object>

  /**
   * 清空注册表
   */
  clear(): void
}
```

#### 1.2.3 CommandRegistrar (命令注册器)

**职责**：
- 将插件命令注册到 Commander.js
- 处理参数映射（混合模式）
- 添加全局选项支持
- 统一错误处理

**接口**：
```javascript
class CommandRegistrar {
  /**
   * 注册所有插件命令
   * @param {Command} program - Commander.js program 实例
   * @param {Object} registry - 插件注册表
   */
  registerAll(program, registry): void

  /**
   * 注册单个插件命令
   * @param {Command} program - Commander.js program 实例
   * @param {string} pluginName - 插件名称
   * @param {string} commandName - 命令名称
   * @param {Object} commandConfig - 命令配置
   */
  registerCommand(program, pluginName, commandName, commandConfig): void

  /**
   * 映射参数到命令行选项
   * @param {Command} cmd - Commander.js 命令实例
   * @param {Array<Object>} params - 参数数组
   */
  mapParams(cmd, params): void

  /**
   * 包装命令处理函数
   * @param {Function} action - 原始 action 函数
   * @param {Object} pluginDeps - 插件依赖
   * @returns {Function} 包装后的 action 函数
   */
  wrapAction(action, pluginDeps): Function
}
```

#### 1.2.4 PluginConfig (插件配置管理)

**职责**：
- 从 `settings.json` 读取插件配置
- 使用 ajv 验证配置
- 提供配置访问接口

**接口**：
```javascript
class PluginConfig {
  /**
   * 获取插件配置
   * @param {string} pluginName - 插件名称
   * @param {Object} settings - 设置对象
   * @returns {Object} 插件配置
   */
  getConfig(pluginName, settings): Object

  /**
   * 验证插件配置
   * @param {Object} config - 配置对象
   * @param {Object} schema - JSON Schema
   * @returns {Object} 验证结果 { valid, errors }
   */
  validate(config, schema): Object

  /**
   * 创建只读认证凭据
   * @param {Object} credentials - 原始凭据
   * @returns {Object} 只读凭据
   */
  createReadonlyAuth(credentials): Object
}
```

#### 1.2.5 SchemaValidator (Schema 验证器)

**职责**：
- 使用 ajv 验证 JSON Schema
- 生成友好的错误消息

**接口**：
```javascript
class SchemaValidator {
  /**
   * 创建验证器实例
   * @param {Object} schema - JSON Schema
   * @returns {Function} 验证函数
   */
  createValidator(schema): Function

  /**
   * 验证数据
   * @param {Object} data - 待验证数据
   * @param {Function} validate - 验证函数
   * @returns {Object} 验证结果 { valid, errors }
   */
  validate(data, validate): Object

  /**
   * 格式化错误消息
   * @param {Array<Object>} errors - ajv 错误数组
   * @returns {string} 格式化的错误消息
   */
  formatErrors(errors): string
}
```

#### 1.2.6 PluginScaffold (脚手架工具)

**职责**：
- 创建插件目录结构
- 生成插件模板文件
- 提供示例代码

**接口**：
```javascript
class PluginScaffold {
  /**
   * 创建插件
   * @param {string} pluginName - 插件名称
   * @param {Object} options - 选项
   * @param {string} options.outputDir - 输出目录
   * @returns {Promise<boolean>} 创建是否成功
   */
  async create(pluginName, options): Promise<boolean>

  /**
   * 生成 package.json
   * @param {string} pluginName - 插件名称
   * @returns {Object} package.json 内容
   */
  generatePackageJson(pluginName): Object

  /**
   * 生成 index.js
   * @param {string} pluginName - 插件名称
   * @returns {string} index.js 内容
   */
  generateIndex(pluginName): string

  /**
   * 生成 README.md
   * @param {string} pluginName - 插件名称
   * @returns {string} README.md 内容
   */
  generateReadme(pluginName): string

  /**
   * 生成 .gitignore
   * @returns {string} .gitignore 内容
   */
  generateGitignore(): string
}
```

## 2. 数据模型

### 2.1 插件清单 (Plugin Manifest)

```javascript
{
  "name": "my-plugin",           // 插件唯一标识符
  "version": "1.0.0",            // 语义化版本
  "entry": "index.js",           // 入口文件路径
  "commands": {                  // 可选，可在入口文件中定义
    "command1": { ... }
  }
}
```

### 2.2 插件定义 (Plugin Definition)

```javascript
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Plugin description",
  "schema": {                    // JSON Schema
    "type": "object",
    "properties": { ... },
    "required": []
  },
  "init": async (config, deps) => { ... }  // 初始化函数
}
```

### 2.3 命令配置 (Command Config)

```javascript
{
  "description": "Command description",
  "action": async (options) => { ... },   // 命令处理函数
  "params": [                             // 参数数组
    {
      "name": "param1",                   // 参数名称
      "required": true,                   // 是否必需
      "description": "Parameter description",
      "option": "--custom-name <value>"   // 可选，自定义选项格式
    }
  ]
}
```

### 2.4 依赖注入对象 (Plugin Dependencies)

```javascript
{
  "logger": WinstonInstance,              // 日志记录器
  "settings": SettingsInstance,           // 设置实例
  "auth": {                               // 只读认证凭据
    "endpoint": string,
    "username": string,
    "password": string,
    "token": string,
    "longToken": string,
    "secret": string
  },
  "getSDKInstance": (client, className) => SDKInstance  // SDK 获取函数
}
```

### 2.5 命令选项对象 (Command Options)

```javascript
{
  // 命令特定参数
  "param1": "value1",

  // 全局选项
  "raw": false,
  "verbose": false,
  "debug": false,
  "silly": false,

  // 认证凭据（已解析）
  "credentials": { ... }
}
```

## 3. API 合约

### 3.1 插件初始化函数

```javascript
/**
 * 插件初始化函数
 * @param {Object} config - 插件配置（已验证）
 * @param {Object} deps - 依赖注入对象
 * @returns {Promise<Object>} 命令对象
 */
async function init(config, deps) {
  // 使用依赖
  deps.logger.info('Plugin initializing...');

  // 返回命令对象
  return {
    "command1": {
      description: "Command description",
      action: async (options) => {
        // 命令逻辑
        return { result: "success" };
      },
      params: [
        { name: "param1", required: true, description: "..." }
      ]
    }
  };
}
```

### 3.2 命令处理函数

```javascript
/**
 * 命令处理函数
 * @param {Object} options - 命令选项
 * @returns {Promise<any>} 命令结果
 */
async function action(options) {
  // 访问参数
  const param1 = options.param1;

  // 访问全局选项
  if (options.debug) {
    console.log('Debug mode enabled');
  }

  // 访问认证凭据
  const { endpoint, username, password } = options.credentials;

  // 返回结果
  return { result: "success" };
}
```

## 4. 配置管理

### 4.1 settings.json 结构

```json
{
  "endpoint": "nas.example.com:5666",
  "username": "admin",
  "password": "password",
  "token": "token_value",
  "longToken": "long_token_value",
  "secret": "secret_value",

  "pluginPaths": [
    "/home/user/custom-plugins",
    "/absolute/path/to/plugins"
  ],

  "plugins": {
    "my-plugin": {
      "setting1": "value1",
      "setting2": 123
    },
    "another-plugin": {
      "enabled": true,
      "config": { ... }
    }
  }
}
```

### 4.2 配置验证流程

```
1. 读取 settings.json 中的 plugins.<pluginName>
2. 获取插件的 schema
3. 使用 ajv 验证配置
4. 如果验证失败，显示详细错误并跳过插件
5. 如果验证成功，传递配置给插件的 init 函数
```

## 5. 插件加载流程

### 5.1 完整加载流程

```
1. 启动 fnos-cli
   ↓
2. 读取 settings.json
   ↓
3. 收集插件路径：
   - 项目根目录的 plugins/
   - settings.json 中的 pluginPaths 数组
   ↓
4. 扫描所有插件路径
   ↓
5. 对于每个目录：
   a. 检查是否存在 package.json
   b. 检查是否包含 fnos.plugin 字段
   c. 读取插件清单
   d. 验证清单格式
   ↓
6. 对于每个有效插件：
   a. 读取插件配置（plugins.<pluginName>）
   b. 使用 schema 验证配置
   c. 加载插件入口文件
   d. 调用插件的 init 函数
   e. 合并 package.json 和入口文件中的 commands
   f. 检查命令冲突
   g. 注册到 PluginRegistry
   ↓
7. 使用 CommandRegistrar 注册所有命令到 Commander.js
   ↓
8. 启动完成，等待用户命令
```

### 5.2 错误处理流程

```
插件加载错误：
1. 捕获错误
2. 记录详细错误日志
3. 显示用户友好的错误消息
4. 跳过该插件，继续加载其他插件

命令执行错误：
1. 捕获错误
2. 记录详细错误日志（如果启用 --debug 或 --verbose）
3. 显示用户友好的错误消息
4. 以非零退出码退出
```

## 6. 插件 SDK 设计

### 6.1 SDK 结构

```
src/sdk/
├── index.js          - SDK 主入口
├── types.d.ts        - TypeScript 类型定义
├── validators.js     - 验证辅助函数
├── logger.js         - 日志辅助函数
└── errors.js         - 错误辅助函数
```

### 6.2 SDK 导出

```javascript
// src/sdk/index.js
module.exports = {
  // 类型（JavaScript 运行时不使用，仅用于文档）
  PluginDefinition: {},
  CommandConfig: {},
  PluginDeps: {},
  CommandOptions: {},

  // 验证函数
  validateConfig: (config, schema) => { ... },
  createSchemaValidator: (schema) => { ... },

  // 日志函数
  createLogger: (name) => { ... },

  // 错误函数
  createPluginError: (message, code) => { ... },
  formatError: (error) => { ... }
};
```

### 6.3 TypeScript 类型定义

```typescript
// src/sdk/types.d.ts
export interface PluginDefinition {
  name: string;
  version: string;
  description: string;
  schema: JSONSchema7;
  init: (config: any, deps: PluginDeps) => Promise<Commands>;
}

export interface CommandConfig {
  description: string;
  action: (options: CommandOptions) => Promise<any>;
  params?: CommandParam[];
}

export interface CommandParam {
  name: string;
  required?: boolean;
  description?: string;
  option?: string;
}

export interface PluginDeps {
  logger: Winston.Logger;
  settings: any;
  auth: Readonly<AuthCredentials> | null;
  getSDKInstance: (client: any, className: string) => any;
}

export interface CommandOptions {
  [key: string]: any;
  raw?: boolean;
  verbose?: boolean;
  debug?: boolean;
  silly?: boolean;
  credentials?: AuthCredentials;
}

export interface AuthCredentials {
  endpoint: string;
  username: string;
  password: string;
  token: string;
  longToken: string;
  secret: string;
}

export interface Commands {
  [commandName: string]: CommandConfig;
}
```

## 7. 脚手架工具设计

### 7.1 生成文件结构

```
<plugin-name>/
├── package.json
├── index.js
├── README.md
└── .gitignore
```

### 7.2 package.json 模板

```json
{
  "name": "fnos-plugin-<plugin-name>",
  "version": "1.0.0",
  "description": "Description of <plugin-name>",
  "main": "index.js",
  "fnos": {
    "plugin": {
      "name": "<plugin-name>",
      "version": "1.0.0",
      "entry": "index.js"
    }
  },
  "keywords": ["fnos", "plugin"],
  "author": "",
  "license": "Apache-2.0",
  "dependencies": {
    "fnos-cli": "^0.2.0"
  }
}
```

### 7.3 index.js 模板

```javascript
/**
 * <plugin-name> Plugin for fnos-cli
 */

const { logger } = require('fnos-cli/sdk');

/**
 * Plugin definition
 */
module.exports = {
  name: '<plugin-name>',
  version: '1.0.0',
  description: 'Description of <plugin-name>',

  /**
   * Configuration schema (JSON Schema)
   */
  schema: {
    type: 'object',
    properties: {
      exampleSetting: {
        type: 'string',
        description: 'Example setting'
      }
    },
    required: []
  },

  /**
   * Initialize plugin
   * @param {Object} config - Plugin configuration
   * @param {Object} deps - Plugin dependencies
   * @returns {Promise<Object>} Commands object
   */
  async init(config, deps) {
    logger.info('Initializing <plugin-name> plugin...');

    // Return commands
    return {
      'example': {
        description: 'Example command',
        action: async (options) => {
          logger.info('Executing example command...');

          // Your command logic here
          const result = {
            message: 'Hello from <plugin-name>!',
            config: config
          };

          return result;
        },
        params: [
          {
            name: 'input',
            required: true,
            description: 'Input parameter'
          }
        ]
      }
    };
  }
};
```

## 8. 实现策略

### 8.1 开发顺序

1. **Phase 1: 核心基础设施**
   - 实现配置管理 (PluginConfig)
   - 实现 Schema 验证器 (SchemaValidator)
   - 实现插件 SDK

2. **Phase 2: 插件加载**
   - 实现插件加载器 (PluginLoader)
   - 实现插件注册表 (PluginRegistry)

3. **Phase 3: 命令注册**
   - 实现命令注册器 (CommandRegistrar)
   - 集成到主入口 (index.js)

4. **Phase 4: 开发工具**
   - 实现脚手架工具 (PluginScaffold)
   - 创建示例插件

5. **Phase 5: 测试和文档**
   - 编写单元测试
   - 编写集成测试
   - 编写开发文档

### 8.2 技术选型

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| CLI 框架 | Commander.js | 已使用 |
| 日志 | Winston | 已使用 |
| Schema 验证 | ajv | 高性能 JSON Schema 验证 |
| 文件系统 | Node.js fs | 内置 |
| 路径处理 | Node.js path | 内置 |

### 8.3 依赖安装

```bash
npm install ajv
npm install --save-dev @types/node
```

### 8.4 目录结构

```
fnos-cli/
├── src/
│   ├── index.js                    # 主入口
│   ├── commands/                   # 现有命令
│   ├── utils/                      # 现有工具
│   ├── plugins/                    # 新增：插件系统
│   │   ├── loader.js
│   │   ├── registry.js
│   │   ├── registrar.js
│   │   ├── config.js
│   │   ├── schema-validator.js
│   │   └── scaffold.js
│   └── sdk/                        # 新增：插件 SDK
│       ├── index.js
│       └── types.d.ts
├── plugins/                        # 新增：官方插件目录
├── test/                           # 测试
└── docs/                           # 文档
```

## 9. 安全考虑

### 9.1 插件安全

1. **凭据只读访问**
   - 使用 Object.freeze() 或 Proxy 创建只读认证凭据
   - 插件无法修改存储的凭据

2. **路径验证**
   - 确保插件路径是绝对路径
   - 防止路径遍历攻击

3. **配置验证**
   - 使用 ajv 严格验证插件配置
   - 防止恶意配置注入

### 9.2 文件权限

1. **settings.json**
   - 文件权限：600（仅所有者可读写）

2. **插件目录**
   - 插件文件权限遵循系统默认

## 10. 测试策略

### 10.1 单元测试

- PluginLoader 测试
- PluginRegistry 测试
- CommandRegistrar 测试
- PluginConfig 测试
- SchemaValidator 测试

### 10.2 集成测试

- 完整的插件加载流程
- 命令注册和执行
- 配置验证
- 错误处理

### 10.3 示例插件

创建一个简单的示例插件来验证整个系统：
- `plugins/example/`
- 提供一个简单的命令
- 使用配置和依赖注入

## 11. 性能优化

### 11.1 插件加载优化

1. **并行加载**
   - 使用 Promise.all 并行加载多个插件

2. **缓存**
   - 缓存已加载的插件（避免重复加载）

### 11.2 命令执行优化

1. **按需加载**
   - 插件代码在命令调用时才加载（可选，未来版本）

## 12. 未来扩展

### 12.1 可能的增强

1. **插件依赖管理**
   - 支持插件之间的依赖关系
   - 自动解析和加载依赖

2. **插件生命周期**
   - 添加 destroy 钩子
   - 支持插件卸载

3. **热重载**
   - 开发时支持插件热重载

4. **插件市场**
   - 发布和发现插件
   - 版本管理

5. **插件签名**
   - 验证插件来源和完整性