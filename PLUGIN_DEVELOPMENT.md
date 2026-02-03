# 插件系统指南

本指南介绍如何为 fnos-cli 创建、配置和使用插件。

## 概述

fnos-cli 插件系统允许开发者使用自定义命令扩展 CLI。插件可以：

- 向 `fnos` CLI 注册新命令
- 访问 fnos SDK 进行系统操作
- 访问身份验证凭据（只读）
- 定义自己的配置架构
- 利用提供的 SDK 完成常见任务

## 创建插件

### 使用脚手架工具

创建新插件最简单的方法是使用 `create-plugin` 命令：

```bash
fnos create-plugin my-plugin \
  --path /path/to/plugins \
  --version "1.0.0" \
  --description "My awesome plugin" \
  --author "Your Name"
```

这将生成以下结构：

```
my-plugin/
├── package.json
└── index.js
```

### 手动插件结构

插件必须包含：

1. **package.json** - 带有 `fnos.plugin` 字段的插件清单
2. **index.js** - 导出 `init` 和 `schema` 的插件入口点

#### package.json 示例

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "main": "index.js",
  "author": "Your Name",
  "license": "MIT",
  "fnos": {
    "plugin": {
      "name": "my-plugin",
      "version": "1.0.0",
      "entry": "index.js"
    },
    "commands": {
      "command-name": {
        "description": "Command description"
      }
    }
  }
}
```

#### index.js 示例

```javascript
const sdk = require('fnos-cli/sdk');

// 插件配置架构
const schema = {
  type: 'object',
  properties: {
    option1: {
      type: 'string',
      description: 'An option',
      default: 'default-value'
    }
  },
  additionalProperties: false
};

/**
 * 插件初始化函数
 * @param {Object} config - 来自 settings.json 的插件配置
 * @param {Object} deps - 插件依赖项
 * @param {Object} deps.logger - Logger 实例
 * @param {Object} deps.settings - Settings 对象
 * @param {Object|null} deps.auth - 身份验证凭据（只读）
 * @param {Function} deps.getSDKInstance - 获取 SDK 客户端实例的函数
 * @returns {Object} 插件命令
 */
function init(config, deps) {
  const { logger } = deps;

  // 验证配置
  const validation = sdk.validateConfig(config, schema);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  // 返回插件命令
  return {
    commandName: {
      description: 'Command description',
      action: async (options) => {
        // 命令逻辑
        return { result: 'ok' };
      },
      params: [
        {
          name: 'param1',
          required: true,
          description: 'Parameter description'
        }
      ]
    }
  };
}

module.exports = { init, schema };
```

## 插件配置

### 添加配置

要向插件添加配置选项：

1. 在 `schema` 对象中定义属性
2. 通过 `init()` 中的 `config` 参数访问它们

```javascript
const schema = {
  type: 'object',
  properties: {
    apiKey: {
      type: 'string',
      description: 'API key for external service'
    },
    maxRetries: {
      type: 'number',
      description: 'Maximum number of retries',
      default: 3
    }
  },
  additionalProperties: false
};

function init(config, deps) {
  const { logger, auth } = deps;

  const apiKey = config.apiKey;
  const maxRetries = config.maxRetries || 3;

  // 使用配置
  logger.info(`Using maxRetries: ${maxRetries}`);

  return {
    // 命令...
  };
}
```

### settings.json 中的配置

将插件配置添加到 `~/.fnos/settings.json`：

```json
{
  "plugins": {
    "my-plugin": {
      "apiKey": "your-api-key",
      "maxRetries": 5
    }
  }
}
```

## 插件 SDK

插件 SDK 提供辅助函数和实用工具：

### validateConfig(config, schema)

根据 JSON Schema 验证插件配置。

```javascript
const validation = sdk.validateConfig(config, schema);
if (!validation.valid) {
  throw new Error(validation.errors.join(', '));
}
```

### createLogger(name)

创建命名 logger 实例。

```javascript
const logger = sdk.createLogger('my-plugin');
logger.info('Message');
logger.error('Error message');
```

### createSchemaValidator(schema)

创建可重用的架构验证器。

```javascript
const validator = sdk.createSchemaValidator(schema);
const result = validator(data);
```

### createPluginError(message, code)

创建带有可选错误代码的插件错误。

```javascript
const error = sdk.createPluginError('Something went wrong', 'PLUGIN_ERROR');
throw error;
```

### formatError(error)

格式化错误以便用户友好显示。

```javascript
const formatted = sdk.formatError(error);
console.error(formatted);
```

## 依赖项

`init` 函数接收以下依赖项：

### logger

Winston logger 实例。使用级别：`error`、`warn`、`info`、`debug`、`silly`。

```javascript
logger.info('Information message');
logger.error('Error message');
```

### settings

来自 `settings.json` 的全局设置对象。

```javascript
const settings = deps.settings;
```

### auth

身份验证凭据（只读代理）。包含：

```javascript
{
  endpoint: 'https://fnos.example.com',
  username: 'admin',
  password: 'password',
  token: 'auth-token',
  longToken: 'long-lived-token',
  secret: 'secret-key'
}
```

⚠️ **注意**：`auth` 对象是只读的。任何修改它的尝试都会抛出错误。

### getSDKInstance(client, className)

获取 fnos SDK 类的实例。

```javascript
const client = require('fnos');
const resourceMonitor = deps.getSDKInstance(client, 'ResourceMonitor');
const cpuInfo = await resourceMonitor.cpu();
```

## 命令参数

为命令定义参数：

```javascript
{
  commandName: {
    description: 'Command description',
    action: async (options) => {
      const { param1, param2 } = options;
      // 使用参数
    },
    params: [
      {
        name: 'param1',
        required: true,
        description: 'Required parameter'
      },
      {
        name: 'param2',
        required: false,
        description: 'Optional parameter'
      },
      {
        name: 'custom',
        required: false,
        option: '--custom-name <value>',
        description: 'Custom option format'
      }
    ]
  }
}
```

## 安装插件

### 官方插件（plugins/ 目录）

将插件复制到 fnos-cli 安装目录中的 `plugins/` 目录：

```bash
cp -r my-plugin /path/to/fnos-cli/plugins/
```

### 用户插件（settings.json）

将插件路径添加到 `settings.json`：

```json
{
  "pluginPaths": [
    "/absolute/path/to/my-plugin"
  ]
}
```

## 使用插件命令

安装后，插件命令在插件名称下可用：

```bash
# 列出所有命令
fnos --help

# 使用插件命令
fnos plugin-name command-name --param1 value1

# 带全局选项
fnos plugin-name command-name --param1 value1 --verbose --raw
```

## 示例：hello-plugin

请参阅 `plugins/hello-plugin/` 目录获取完整示例：

```bash
# 使用 hello 插件
fnos hello-plugin greet --name "World"

# 自定义问候
fnos hello-plugin greet --name "fnOS" --greeting "Welcome"

# 带详细输出
fnos hello-plugin greet --name "World" --verbose
```

## 错误处理

始终在命令操作中处理错误：

```javascript
action: async (options) => {
  try {
    // 命令逻辑
    return { result: 'success' };
  } catch (error) {
    logger.error(`Command failed: ${error.message}`);
    throw error; // 重新抛出以供 CLI 处理
  }
}
```

## 最佳实践

1. **验证配置**：始终在 `init()` 中验证配置
2. **使用 Logger**：使用提供的 logger 获取一致的输出
3. **处理错误**：使用 try-catch 块包装命令逻辑
4. **记录命令**：为命令和参数提供清晰的描述
5. **本地测试**：在部署前测试插件
6. **保持依赖最小**：只依赖你需要的内容
7. **尊重只读 Auth**：不要尝试修改 auth 对象
8. **使用 SDK 助手**：利用提供的 SDK 实用工具

## 故障排除

### 插件未加载

检查：

1. 插件清单有效（name、version、entry）
2. 插件路径是绝对路径
3. 没有与现有插件的命令冲突
4. 插件配置有效（如果定义了架构）

### 配置错误

检查：

1. 配置与架构匹配
2. 配置键中没有拼写错误
3. 类型与架构定义匹配

### 找不到命令

检查：

1. 插件已加载（检查启动日志）
2. 命令名称正确
3. 没有命令冲突

## 资源

- 插件 SDK：`src/sdk/index.js`
- 示例插件：`plugins/hello-plugin/`
- 规范：`spec.md`
- 计划：`plan.md`