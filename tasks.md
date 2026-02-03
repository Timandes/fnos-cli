# 插件系统任务分解

本文档将插件系统的实现分解为可执行的小任务，每个任务预计 1-4 小时完成。

## 任务概览

| 阶段 | 任务数 | 预计时间 |
|------|--------|----------|
| Phase 1: 核心基础设施 | 4 | 6-8 小时 |
| Phase 2: 插件加载 | 3 | 4-6 小时 |
| Phase 3: 命令注册 | 2 | 3-4 小时 |
| Phase 4: 开发工具 | 2 | 3-4 小时 |
| Phase 5: 测试和文档 | 3 | 4-6 小时 |
| **总计** | **14** | **20-28 小时** |

---

## Phase 1: 核心基础设施

### Task 1.1: 安装依赖并创建目录结构

**优先级**: 高
**预计时间**: 1 小时
**依赖**: 无

**任务描述**:
- 安装 ajv 依赖包
- 创建 `src/plugins/` 目录
- 创建 `src/sdk/` 目录
- 创建 `plugins/` 目录（官方插件）

**验收标准**:
- [ ] `package.json` 中包含 `ajv` 依赖
- [ ] `src/plugins/` 目录存在
- [ ] `src/sdk/` 目录存在
- [ ] `plugins/` 目录存在
- [ ] 运行 `npm install` 成功

**命令**:
```bash
npm install ajv
mkdir -p src/plugins src/sdk plugins
```

---

### Task 1.2: 实现 SchemaValidator 类

**优先级**: 高
**预计时间**: 2 小时
**依赖**: Task 1.1

**任务描述**:
- 创建 `src/plugins/schema-validator.js`
- 实现使用 ajv 进行 JSON Schema 验证
- 实现友好的错误消息格式化
- 添加 JSDoc 注释

**验收标准**:
- [ ] SchemaValidator 类创建成功
- [ ] createValidator 方法能创建验证函数
- [ ] validate 方法能正确验证数据
- [ ] formatErrors 方法能生成友好的错误消息
- [ ] 所有方法有 JSDoc 注释

**测试用例**:
```javascript
// 测试有效配置
const valid = { name: "test" };
const schema = { type: "object", properties: { name: { type: "string" } } };
const result = validator.validate(valid, schema);
assert.strictEqual(result.valid, true);

// 测试无效配置
const invalid = { name: 123 };
const result = validator.validate(invalid, schema);
assert.strictEqual(result.valid, false);
assert.ok(result.errors.length > 0);
```

---

### Task 1.3: 实现 PluginConfig 类

**优先级**: 高
**预计时间**: 2 小时
**依赖**: Task 1.1, Task 1.2

**任务描述**:
- 创建 `src/plugins/config.js`
- 实现从 settings.json 读取插件配置
- 实现使用 SchemaValidator 验证配置
- 实现创建只读认证凭据（使用 Object.freeze）
- 添加 JSDoc 注释

**验收标准**:
- [ ] PluginConfig 类创建成功
- [ ] getConfig 方法能正确读取配置
- [ ] validate 方法能正确验证配置
- [ ] createReadonlyAuth 方法能创建只读凭据
- [ ] 尝试修改只读凭据时抛出错误
- [ ] 所有方法有 JSDoc 注释

**测试用例**:
```javascript
// 测试配置读取
const settings = { plugins: { "test-plugin": { setting1: "value1" } } };
const config = pluginConfig.getConfig("test-plugin", settings);
assert.deepStrictEqual(config, { setting1: "value1" });

// 测试只读凭据
const credentials = { endpoint: "test.com", username: "user", password: "pass" };
const readonly = pluginConfig.createReadonlyAuth(credentials);
assert.throws(() => { readonly.username = "new"; });
```

---

### Task 1.4: 实现插件 SDK

**优先级**: 高
**预计时间**: 2 小时
**依赖**: Task 1.1

**任务描述**:
- 创建 `src/sdk/index.js`
- 创建 `src/sdk/types.d.ts`（TypeScript 类型定义）
- 导出验证辅助函数
- 导出日志辅助函数
- 导出错误辅助函数
- 添加 JSDoc 注释

**验收标准**:
- [ ] `src/sdk/index.js` 创建成功
- [ ] `src/sdk/types.d.ts` 创建成功
- [ ] 导出 validateConfig 函数
- [ ] 导出 createSchemaValidator 函数
- [ ] 导出 createLogger 函数
- [ ] 导出 createPluginError 函数
- [ ] 导出 formatError 函数
- [ ] TypeScript 类型定义完整

**使用示例**:
```javascript
const { validateConfig, createLogger } = require('fnos-cli/sdk');

// 验证配置
const config = { setting: "value" };
const schema = { type: "object", properties: { setting: { type: "string" } } };
const result = validateConfig(config, schema);

// 创建日志
const logger = createLogger('my-plugin');
logger.info('Plugin initialized');
```

---

## Phase 2: 插件加载

### Task 2.1: 实现 PluginRegistry 类

**优先级**: 高
**预计时间**: 2 小时
**依赖**: 无

**任务描述**:
- 创建 `src/plugins/registry.js`
- 实现插件注册和管理
- 实现命令冲突检测
- 实现插件和命令查询
- 添加 JSDoc 注释

**验收标准**:
- [ ] PluginRegistry 类创建成功
- [ ] register 方法能注册插件
- [ ] checkConflict 方法能检测命令冲突
- [ ] getAll 方法能返回所有插件
- [ ] get 方法能获取指定插件
- [ ] getAllCommands 方法能返回所有命令
- [ ] clear 方法能清空注册表
- [ ] 所有方法有 JSDoc 注释

**测试用例**:
```javascript
// 测试插件注册
const plugin = { name: "test", commands: { "cmd1": { ... } } };
const registered = registry.register("test", plugin);
assert.strictEqual(registered, true);

// 测试冲突检测
const conflict = registry.checkConflict("cmd1");
assert.ok(conflict !== null);

// 测试重复注册
const registeredAgain = registry.register("test", plugin);
assert.strictEqual(registeredAgain, false);
```

---

### Task 2.2: 实现 PluginLoader 类

**优先级**: 高
**预计时间**: 3 小时
**依赖**: Task 1.2, Task 1.3, Task 2.1

**任务描述**:
- 创建 `src/plugins/loader.js`
- 实现插件目录扫描
- 实现插件清单读取和验证
- 实现插件配置验证
- 实现插件初始化
- 实现命令合并和冲突检测
- 添加错误处理
- 添加 JSDoc 注释

**验收标准**:
- [ ] PluginLoader 类创建成功
- [ ] loadAll 方法能加载所有插件
- [ ] load 方法能加载单个插件
- [ ] readManifest 方法能读取插件清单
- [ ] validateManifest 方法能验证清单格式
- [ ] initPlugin 方法能调用插件初始化
- [ ] 命令合并逻辑正确
- [ ] 冲突检测正确
- [ ] 错误处理完善
- [ ] 所有方法有 JSDoc 注释

**测试用例**:
```javascript
// 测试插件加载
const plugins = await loader.loadAll({
  pluginPaths: ["/absolute/path/to/plugins"],
  settings: { plugins: {} },
  deps: { logger, settings, auth: null }
});
assert.ok(Object.keys(plugins).length > 0);

// 测试清单验证
const validManifest = { name: "test", version: "1.0.0", entry: "index.js" };
assert.strictEqual(loader.validateManifest(validManifest), true);

const invalidManifest = { name: "test" };
assert.strictEqual(loader.validateManifest(invalidManifest), false);
```

---

### Task 2.3: 集成插件加载到主入口

**优先级**: 高
**预计时间**: 2 小时
**依赖**: Task 1.3, Task 2.1, Task 2.2

**任务描述**:
- 修改 `src/index.js`
- 在启动时加载插件
- 将插件注册表传递给命令注册器
- 添加插件加载日志
- 处理插件加载错误

**验收标准**:
- [ ] fnos-cli 启动时自动加载插件
- [ ] 插件加载错误不影响 CLI 启动
- [ ] 插件加载日志正确输出
- [ ] 插件注册表正确传递

**测试步骤**:
```bash
# 创建测试插件
mkdir -p plugins/test-plugin
cd plugins/test-plugin
npm init -y
# 添加 fnos.plugin 到 package.json
# 创建 index.js

# 测试插件加载
fnos --help  # 应该显示插件命令
```

---

## Phase 3: 命令注册

### Task 3.1: 实现 CommandRegistrar 类

**优先级**: 高
**预计时间**: 2 小时
**依赖**: Task 2.1

**任务描述**:
- 创建 `src/plugins/registrar.js`
- 实现插件命令注册到 Commander.js
- 实现混合模式参数映射
- 实现全局选项支持
- 实现命令包装和错误处理
- 添加 JSDoc 注释

**验收标准**:
- [ ] CommandRegistrar 类创建成功
- [ ] registerAll 方法能注册所有命令
- [ ] registerCommand 方法能注册单个命令
- [ ] mapParams 方法能正确映射参数
- [ ] wrapAction 方法能正确包装处理函数
- [ ] 全局选项正确支持
- [ ] 错误处理完善
- [ ] 所有方法有 JSDoc 注释

**测试用例**:
```javascript
// 测试命令注册
const commandConfig = {
  description: "Test command",
  action: async (options) => { return { result: "ok" }; },
  params: [
    { name: "param1", required: true, description: "Param 1" },
    { name: "param2", option: "--custom <value>", description: "Param 2" }
  ]
};

registrar.registerCommand(program, "test-plugin", "test", commandConfig);
// 命令应该注册为 fnos test-plugin test
```

---

### Task 3.2: 集成命令注册到主入口

**优先级**: 高
**预计时间**: 2 小时
**依赖**: Task 2.3, Task 3.1

**任务描述**:
- 修改 `src/index.js`
- 在插件加载后注册命令
- 确保插件命令正确显示在 --help 中
- 测试命令执行
- 添加命令执行日志

**验收标准**:
- [ ] 插件命令正确注册到 Commander.js
- [ ] `fnos --help` 显示所有插件名称
- [ ] `fnos <plugin-name> --help` 显示该插件的所有命令
- [ ] 命令执行正确
- [ ] 命令错误正确处理
- [ ] 命令日志正确输出

**测试步骤**:
```bash
# 测试帮助信息
fnos --help  # 应该显示插件名称
fnos test-plugin --help  # 应该显示插件命令

# 测试命令执行
fnos test-plugin test --param1 value1  # 应该正确执行
```

---

## Phase 4: 开发工具

### Task 4.1: 实现 PluginScaffold 类

**优先级**: 中
**预计时间**: 2 小时
**依赖**: 无

**任务描述**:
- 创建 `src/plugins/scaffold.js`
- 实现 create 方法创建插件目录和文件
- 实现 generatePackageJson 方法
- 实现 generateIndex 方法
- 实现 generateReadme 方法
- 实现 generateGitignore 方法
- 添加 JSDoc 注释

**验收标准**:
- [ ] PluginScaffold 类创建成功
- [ ] create 方法能创建完整的插件目录
- [ ] 生成的 package.json 包含 fnos.plugin 清单
- [ ] 生成的 index.js 包含插件模板代码
- [ ] 生成的 README.md 包含开发说明
- [ ] 生成的 .gitignore 正确
- [ ] 所有方法有 JSDoc 注释

**测试步骤**:
```bash
# 测试插件创建
fnos create-plugin my-new-plugin
ls my-new-plugin  # 应该显示 package.json, index.js, README.md, .gitignore
```

---

### Task 4.2: 注册脚手架命令

**优先级**: 中
**预计时间**: 2 小时
**依赖**: Task 4.1

**任务描述**:
- 创建 `src/commands/plugin.js`
- 实现 `fnos create-plugin` 命令
- 添加命令参数验证
- 添加命令帮助信息
- 集成到主入口

**验收标准**:
- [ ] `fnos create-plugin` 命令可用
- [ ] 命令参数正确验证
- [ ] 命令帮助信息正确
- [ ] 插件创建成功
- [ ] 错误处理完善

**测试步骤**:
```bash
# 测试命令
fnos create-plugin my-plugin  # 应该成功创建
fnos create-plugin --help    # 应该显示帮助信息
fnos create-plugin           # 应该显示参数错误
```

---

## Phase 5: 测试和文档

### Task 5.1: 创建示例插件

**优先级**: 中
**预计时间**: 2 小时
**依赖**: Task 3.2, Task 4.2

**任务描述**:
- 在 `plugins/` 目录创建示例插件
- 实现一个简单的命令
- 使用配置和依赖注入
- 编写 README.md

**验收标准**:
- [ ] 示例插件目录存在
- [ ] package.json 包含正确的 fnos.plugin 清单
- [ ] index.js 实现了插件定义
- [ ] 插件命令可用
- [ ] README.md 包含使用说明

**示例插件内容**:
```javascript
// plugins/example/index.js
module.exports = {
  name: 'example',
  version: '1.0.0',
  description: 'Example plugin',
  schema: {
    type: 'object',
    properties: {
      message: { type: 'string' }
    },
    required: []
  },
  async init(config, deps) {
    return {
      'hello': {
        description: 'Say hello',
        action: async (options) => {
          return { message: `Hello, ${options.name}!` };
        },
        params: [
          { name: 'name', required: true, description: 'Your name' }
        ]
      }
    };
  }
};
```

---

### Task 5.2: 编写单元测试

**优先级**: 中
**预计时间**: 3 小时
**依赖**: Task 1.2, Task 1.3, Task 2.1, Task 2.2, Task 3.1

**任务描述**:
- 创建 `test/plugins/` 目录
- 为每个核心类编写单元测试
- 测试正常流程和边界情况
- 确保测试覆盖率 > 80%

**验收标准**:
- [ ] SchemaValidator 测试完成
- [ ] PluginConfig 测试完成
- [ ] PluginRegistry 测试完成
- [ ] PluginLoader 测试完成
- [ ] CommandRegistrar 测试完成
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试通过

**运行测试**:
```bash
npm test
```

---

### Task 5.3: 编写开发文档

**优先级**: 低
**预计时间**: 2 小时
**依赖**: Task 5.1

**任务描述**:
- 创建 `docs/plugin-development.md`
- 编写插件开发指南
- 包含 API 参考
- 包含示例代码
- 包含最佳实践

**验收标准**:
- [ ] `docs/plugin-development.md` 存在
- [ ] 包含插件开发步骤
- [ ] 包含插件 SDK API 参考
- [ ] 包含示例代码
- [ ] 包含最佳实践

**文档大纲**:
```markdown
# Plugin Development Guide

## Introduction
## Getting Started
### Creating a Plugin
### Plugin Structure
## Plugin API
### Plugin Definition
### Command Configuration
### Dependency Injection
## Plugin SDK
### Validation
### Logging
### Error Handling
## Examples
### Simple Plugin
### Advanced Plugin
## Best Practices
## Troubleshooting
```

---

## 任务依赖关系图

```
Task 1.1 (安装依赖)
    ↓
    ├─→ Task 1.2 (SchemaValidator) ──→ Task 1.3 (PluginConfig)
    └─→ Task 1.4 (插件 SDK)
            ↓
Task 2.1 (PluginRegistry)
            ↓
    ┌───────┴───────┐
    ↓               ↓
Task 2.2        Task 1.3
(PluginLoader)   (PluginConfig)
    ↓               ↓
    └───────┬───────┘
            ↓
    Task 2.3 (集成加载)
            ↓
    ┌───────┴───────┐
    ↓               ↓
Task 3.1        Task 2.1
(CommandRegistrar)(PluginRegistry)
    ↓               ↓
    └───────┬───────┘
            ↓
    Task 3.2 (集成注册)
            ↓
    ┌───────┴───────┐
    ↓               ↓
Task 4.1        Task 5.1
(PluginScaffold) (示例插件)
    ↓               ↓
    └───────┬───────┘
            ↓
    Task 4.2 (脚手架命令)
            ↓
    ┌───────┴───────┐
    ↓               ↓
Task 5.2        Task 5.3
(单元测试)      (开发文档)
```

---

## 实施建议

### 1. 按顺序执行任务
严格按照任务依赖关系执行，确保每个任务完成后才进入下一个任务。

### 2. 每个任务完成后进行测试
每个任务完成后，运行相关的测试用例，确保功能正确。

### 3. 代码审查
在每个阶段完成后，进行代码审查，确保代码质量和一致性。

### 4. 文档同步更新
在实现功能的同时，更新相关的文档和注释。

### 5. 持续集成
如果可能，设置持续集成，自动运行测试。

---

## 验收标准总结

### 功能验收
- [ ] 插件能够从 `plugins/` 目录加载
- [ ] 插件能够从配置文件指定的路径加载
- [ ] 插件命令能够注册为 `fnos <plugin-name> <command>`
- [ ] 命令冲突时能够正确检测并拒绝加载
- [ ] 插件配置能够正确验证
- [ ] 插件能够访问认证凭据
- [ ] `fnos create-plugin` 命令能够创建插件模板
- [ ] 示例插件能够正常工作

### 质量验收
- [ ] 所有单元测试通过
- [ ] 测试覆盖率 > 80%
- [ ] 代码符合项目编码标准
- [ ] 所有公共函数有 JSDoc 注释
- [ ] 开发文档完整

### 性能验收
- [ ] 插件加载时间 < 2 秒（10 个插件）
- [ ] 命令响应时间与内置命令相当

---

## 附录

### A. 参考文档
- [spec.md](./spec.md) - 规格说明
- [plan.md](./plan.md) - 技术实现计划
- [constitution.md](./constitution.md) - 项目原则

### B. 工具和库
- ajv: https://ajv.js.org/
- Commander.js: https://www.npmjs.com/package/commander
- Winston: https://www.npmjs.com/package/winston

### C. 联系方式
如有问题，请联系项目维护者。