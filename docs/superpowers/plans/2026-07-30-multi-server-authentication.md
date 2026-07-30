# Multi-Server Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `fnos-cli` 按名称保存、选择、更新和删除多组 fnOS server 凭证，并把现有单 server 配置无损升级为 `servers.default`。

**Architecture:** `settings` 负责规范结构、校验、失败安全写入和一次性迁移；新的 `server-selector` 只负责无敏感信息的终端选择；`auth-helper` 异步解析临时凭证或命名 server。命令层统一注册 `--server`，客户端在 token 回退密码登录后按 `serverName` 写回原记录，不引入全局活动 server。

**Tech Stack:** Node.js 18+、CommonJS、Commander 11、Node 内置 `readline/promises`、Mocha、`node:assert/strict`、fnos SDK 0.4。

## Global Constraints

- Node.js 最低版本保持 `>=18`，不得增加第三方运行时或开发依赖。
- server 名称必须匹配 `[A-Za-z0-9][A-Za-z0-9._-]{0,63}`，区分大小写，文档建议小写。
- `login` 未指定 `--server` 时始终保存为 `default`；业务命令和 `logout` 未指定时执行零项、单项、多项统一选择规则。
- `--server` 与任意 `-e/-u/-p` 互斥；完整临时凭证不落盘，部分临时凭证继续使用认证退出码 `3`。
- 选择列表只显示 name、endpoint、username，写入 `stderr`；业务结果只写入 `stdout`。
- 配置目录权限保持 `0700`，`settings.json` 权限保持 `0600`；迁移或保存失败不得破坏原文件。
- 已知认证字段固定为 `endpoint`、`username`、`password`、`token`、`longToken`、`secret`、`credentialVersion`、`secretFormat`。
- 不新增活动 server 状态，也不新增 `server list/use/rename` 命令。
- 所有新增错误继续经过现有 `errorMessage` 脱敏。
- 使用英文 Angular/Conventional Commits 提交消息；提交消息不得包含 `Co-Authored-By`。

## File Structure

### Create

- `src/utils/server-selector.js`：排序 server 摘要、判断 TTY、渲染编号列表、读取选择。
- `test/unit/server-selector.test.js`：server selector 的纯离线测试。

### Modify

- `src/utils/settings.js`：多 server 配置、迁移、校验、失败安全写入和命名 CRUD。
- `src/utils/auth-helper.js`：异步解析临时凭证、显式 server 和交互选择。
- `src/utils/client.js`：按目标 `serverName` 保存登录结果。
- `src/commands/options.js`：注册并校验 `-s, --server <name>`。
- `src/commands/auth.js`：命名 login 和选择式 logout。
- `src/commands/runner.js`：等待异步凭证解析。
- `scripts/generate-command-reference.js`：在命令参考中记录共享认证选项。
- `README.md`：多 server 用法、选择规则和迁移说明。
- `CHANGELOG.md`：记录未发布的多 server 功能和配置升级。
- `docs/commands.md`：由生成脚本刷新。
- `test/unit/settings.test.js`：配置迁移、CRUD、冲突、权限和失败安全测试。
- `test/unit/auth-helper.test.js`：凭证来源、互斥、选择和错误测试。
- `test/unit/command-options.test.js`：server 选项和名称校验测试。
- `test/unit/command-runner.test.js`：异步解析等待测试。
- `test/unit/auth-commands.test.js`：login/logout 命名行为测试。
- `test/unit/client.test.js`：按名称写回凭证测试。
- `test/unit/program.test.js`：真实 CLI 非 TTY 多 server 行为测试。
- `test/unit/documentation.test.js`：文档同步断言。
- `test/smoke/cli.test.js`：默认和命名 server 的真实 mock-server 流程。

---

### Task 1: Multi-Server Settings Schema and Migration

**Files:**
- Modify: `src/utils/settings.js:1-84`
- Modify: `test/unit/settings.test.js:1-47`

**Interfaces:**
- Consumes: Node `fs`、`os`、`path`、`crypto.randomUUID()`。
- Produces: `AUTH_FIELDS`、`SERVER_NAME_PATTERN`、`ConfigurationError`、`isValidServerName(name)`、`Settings.listServers()`、`Settings.getCredentials(serverName)`、`Settings.saveCredentials(serverName, credentials)`、`Settings.clearCredentials(serverName)`。

- [ ] **Step 1: Write failing migration and named CRUD tests**

Replace the old settings assertions and add the following concrete cases to `test/unit/settings.test.js`:

```js
it('migrates legacy credentials to default and preserves unrelated settings', () => {
  const store = settingsStore();
  store.save({
    endpoint: 'legacy:5666',
    username: 'admin',
    password: 'pw',
    credentialVersion: 2,
    token: 'token',
    longToken: 'long',
    secret: 'secret',
    secretFormat: 'decrypted-v1',
    theme: 'dark'
  });

  assert.deepEqual(store.listServers(), [
    { name: 'default', endpoint: 'legacy:5666', username: 'admin' }
  ]);
  assert.deepEqual(store.load(), {
    servers: {
      default: {
        endpoint: 'legacy:5666',
        username: 'admin',
        password: 'pw',
        credentialVersion: 2,
        token: 'token',
        longToken: 'long',
        secret: 'secret',
        secretFormat: 'decrypted-v1'
      }
    },
    theme: 'dark'
  });
});

it('merges legacy credentials into a named-server map without a default', () => {
  const store = settingsStore();
  store.save({
    endpoint: 'legacy:5666',
    username: 'legacy-user',
    password: 'legacy-pw',
    servers: {
      office: {
        endpoint: 'office:5666',
        username: 'office-user',
        password: 'office-pw'
      }
    }
  });

  assert.deepEqual(
    store.listServers().map(({ name }) => name).sort(),
    ['default', 'office']
  );
  const data = store.load();
  assert.equal(data.endpoint, undefined);
  assert.equal(data.servers.default.endpoint, 'legacy:5666');
  assert.equal(data.servers.office.endpoint, 'office:5666');
});

it('deduplicates identical legacy and default credentials', () => {
  const store = settingsStore();
  const credentials = {
    endpoint: 'home:5666',
    username: 'admin',
    password: 'pw'
  };
  store.save({ ...credentials, servers: { default: { ...credentials } } });

  assert.equal(store.getCredentials('default').endpoint, 'home:5666');
  assert.deepEqual(store.load(), { servers: { default: credentials } });
});

it('rejects partial legacy credentials and malformed server maps', () => {
  const partialStore = settingsStore();
  partialStore.save({ endpoint: 'partial:5666' });
  assert.throws(
    () => partialStore.listServers(),
    (error) => error.name === 'ConfigurationError' && error.exitCode === 1
  );

  const malformedStore = settingsStore();
  malformedStore.save({ servers: [] });
  assert.throws(
    () => malformedStore.listServers(),
    (error) => error.name === 'ConfigurationError' && error.exitCode === 1
  );
});

it('stores and deletes independent named credentials', () => {
  const store = settingsStore();
  store.save({ theme: 'dark' });
  store.saveCredentials('default', {
    endpoint: 'home:5666', username: 'home-user', password: 'home-pw'
  });
  store.saveCredentials('office', {
    endpoint: 'office:5666', username: 'office-user', password: 'office-pw'
  });

  assert.equal(store.getCredentials('default').endpoint, 'home:5666');
  assert.equal(store.getCredentials('office').endpoint, 'office:5666');
  assert.equal(store.clearCredentials('office'), true);
  assert.equal(store.getCredentials('office'), null);
  assert.equal(store.getCredentials('default').endpoint, 'home:5666');
  assert.deepEqual(store.load().theme, 'dark');
});

it('rejects conflicting mixed formats without modifying the file', () => {
  const store = settingsStore();
  const original = {
    endpoint: 'legacy:5666',
    username: 'legacy-user',
    password: 'legacy-pw',
    servers: {
      default: {
        endpoint: 'new:5666',
        username: 'new-user',
        password: 'new-pw'
      }
    }
  };
  store.save(original);

  assert.throws(
    () => store.listServers(),
    (error) => error.name === 'ConfigurationError' && error.exitCode === 1
  );
  assert.deepEqual(store.load(), original);
});

it('keeps settings permissions strict after named writes', () => {
  const store = settingsStore();
  store.saveCredentials('default', {
    endpoint: 'host:5666', username: 'admin', password: 'pw'
  });
  assert.equal(fs.statSync(store.settingsDir).mode & 0o777, 0o700);
  assert.equal(fs.statSync(store.settingsPath).mode & 0o777, 0o600);
});

it('preserves the previous file when atomic replacement fails', () => {
  const store = settingsStore();
  store.save({ theme: 'before' });
  const originalRenameSync = fs.renameSync;
  fs.renameSync = (source, target) => {
    if (target === store.settingsPath) throw new Error('rename failed');
    return originalRenameSync(source, target);
  };
  try {
    assert.throws(() => store.save({ theme: 'after' }), /rename failed/);
  } finally {
    fs.renameSync = originalRenameSync;
  }
  assert.deepEqual(store.load(), { theme: 'before' });
});
```

Change the invalid JSON test so `store.load()` must throw a redacted `ConfigurationError` instead of returning `null`:

```js
assert.throws(
  () => store.load(),
  (error) => error.name === 'ConfigurationError' &&
    error.exitCode === 1 &&
    error.message === 'Failed to load settings: invalid JSON.'
);
```

- [ ] **Step 2: Run the settings tests and verify the new API is missing**

Run:

```bash
npx mocha test/unit/settings.test.js
```

Expected: FAIL because `store.listServers` does not exist and `saveCredentials` still accepts only one argument.

- [ ] **Step 3: Implement schema validation, migration, atomic save, and named CRUD**

In `src/utils/settings.js`, add these constants and helpers:

```js
const { randomUUID } = require('node:crypto');

const AUTH_FIELDS = [
  'endpoint', 'username', 'password', 'token', 'longToken', 'secret',
  'credentialVersion', 'secretFormat'
];
const REQUIRED_CREDENTIAL_FIELDS = ['endpoint', 'username', 'password'];
const SERVER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
    this.exitCode = 1;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidServerName(name) {
  return typeof name === 'string' && SERVER_NAME_PATTERN.test(name);
}

function pickCredentials(record) {
  return Object.fromEntries(
    AUTH_FIELDS
      .filter((field) => Object.prototype.hasOwnProperty.call(record, field))
      .map((field) => [field, record[field]])
  );
}

function validateCredentialRecord(record, label) {
  if (!isPlainObject(record) ||
      REQUIRED_CREDENTIAL_FIELDS.some((field) =>
        typeof record[field] !== 'string' || record[field].length === 0)) {
    throw new ConfigurationError(`Invalid credentials for server "${label}".`);
  }
}

function sameKnownCredentials(left, right) {
  return AUTH_FIELDS.every((field) => left[field] === right[field]);
}
```

Make `load()` throw safe configuration errors without including raw file content. Change `save()` to write a same-directory temporary file, `chmod` it to `0600`, rename it over `settings.json`, and remove the temporary file on failure:

```js
save(data) {
  this._ensureDir();
  const temporaryPath = `${this.settingsPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), { mode: 0o600 });
    fs.chmodSync(temporaryPath, 0o600);
    fs.renameSync(temporaryPath, this.settingsPath);
    fs.chmodSync(this.settingsPath, 0o600);
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    console.error('Failed to save settings.');
    throw error;
  }
}
```

Make `_ensureDir()` enforce `0700` even when the directory already exists:

```js
_ensureDir() {
  fs.mkdirSync(this.settingsDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(this.settingsDir, 0o700);
}
```

Make `load()` map syntax and filesystem failures to safe messages without logging file content:

```js
load() {
  if (!fs.existsSync(this.settingsPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ConfigurationError('Failed to load settings: invalid JSON.');
    }
    throw new ConfigurationError('Failed to load settings.');
  }
}
```

Add a private credential-loading method with the approved migration rules:

```js
_loadCredentialSettings() {
  const data = this.load() || {};
  if (!isPlainObject(data)) throw new ConfigurationError('Invalid settings structure.');

  const hasServers = Object.prototype.hasOwnProperty.call(data, 'servers');
  const servers = hasServers ? data.servers : {};
  if (!isPlainObject(servers)) throw new ConfigurationError('Invalid servers configuration.');

  for (const [name, credentials] of Object.entries(servers)) {
    if (!isValidServerName(name)) {
      throw new ConfigurationError(`Invalid server name in settings: "${name}".`);
    }
    validateCredentialRecord(credentials, name);
  }

  const hasLegacy = AUTH_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(data, field));
  if (!hasLegacy) return { ...data, servers };

  const legacy = pickCredentials(data);
  validateCredentialRecord(legacy, 'default');
  if (servers.default && !sameKnownCredentials(legacy, servers.default)) {
    throw new ConfigurationError(
      'Conflicting legacy credentials and servers.default were found.'
    );
  }

  const migrated = { ...data, servers: { ...servers, default: servers.default || legacy } };
  for (const field of AUTH_FIELDS) delete migrated[field];
  this.save(migrated);
  return migrated;
}
```

Implement the public named operations:

```js
listServers() {
  const data = this._loadCredentialSettings();
  return Object.entries(data.servers).map(([name, credentials]) => ({
    name,
    endpoint: credentials.endpoint,
    username: credentials.username
  }));
}

getCredentials(serverName = 'default') {
  const data = this._loadCredentialSettings();
  const credentials = data.servers[serverName];
  return credentials ? pickCredentials(credentials) : null;
}

saveCredentials(serverName, credentials) {
  if (typeof serverName === 'object' && credentials === undefined) {
    credentials = serverName;
    serverName = 'default';
  }
  if (!isValidServerName(serverName)) {
    throw new ConfigurationError(`Invalid server name: "${serverName}".`);
  }
  const record = pickCredentials({
    credentialVersion: 2,
    secretFormat: 'decrypted-v1',
    ...credentials
  });
  validateCredentialRecord(record, serverName);
  const data = this._loadCredentialSettings();
  this.save({ ...data, servers: { ...data.servers, [serverName]: record } });
}

clearCredentials(serverName = 'default') {
  const data = this._loadCredentialSettings();
  if (!Object.prototype.hasOwnProperty.call(data.servers, serverName)) return false;
  const servers = { ...data.servers };
  delete servers[serverName];
  this.save({ ...data, servers });
  return true;
}
```

The one-argument `saveCredentials(credentials)` branch is transitional so the existing client remains green until Task 5; remove it in Task 5.

Export the new symbols while preserving the singleton and `Settings` export:

```js
module.exports = settings;
module.exports.Settings = Settings;
module.exports.AUTH_FIELDS = AUTH_FIELDS;
module.exports.SERVER_NAME_PATTERN = SERVER_NAME_PATTERN;
module.exports.ConfigurationError = ConfigurationError;
module.exports.isValidServerName = isValidServerName;
```

- [ ] **Step 4: Run focused and full unit tests**

Run:

```bash
npx mocha test/unit/settings.test.js
npm test
```

Expected: the settings tests pass, followed by the complete unit suite passing.

- [ ] **Step 5: Commit the settings layer**

```bash
git add src/utils/settings.js test/unit/settings.test.js
git commit -m "feat: store named server credentials"
```

---

### Task 2: Interactive Server Selector

**Files:**
- Create: `src/utils/server-selector.js`
- Create: `test/unit/server-selector.test.js`

**Interfaces:**
- Consumes: `Array<{name: string, endpoint: string, username: string}>` from `Settings.listServers()`。
- Produces: `ServerSelectionError`、`sortServers(servers)`、`selectServer(servers, dependencies) -> Promise<string>`。

- [ ] **Step 1: Write failing selector tests**

Create `test/unit/server-selector.test.js`:

```js
const assert = require('node:assert/strict');
const { describe, it } = require('mocha');
const {
  ServerSelectionError,
  sortServers,
  selectServer
} = require('../../src/utils/server-selector');

function output(isTTY = true) {
  return {
    isTTY,
    values: [],
    write(value) { this.values.push(value); }
  };
}

const servers = [
  { name: 'zeta', endpoint: 'zeta:5666', username: 'z-user' },
  { name: 'default', endpoint: 'home:5666', username: 'admin' },
  { name: 'alpha', endpoint: 'alpha:5666', username: 'a-user' }
];

describe('server selector', () => {
  it('sorts default first and the remaining names lexically', () => {
    assert.deepEqual(
      sortServers(servers).map(({ name }) => name),
      ['default', 'alpha', 'zeta']
    );
  });

  it('returns the only server without prompting', async () => {
    let prompted = false;
    const selected = await selectServer([servers[0]], {
      input: { isTTY: false },
      output: output(false),
      prompt: async () => { prompted = true; return '1'; }
    });
    assert.equal(selected, 'zeta');
    assert.equal(prompted, false);
  });

  it('renders non-sensitive choices and retries invalid input', async () => {
    const target = output();
    const answers = ['9', '2'];
    const selected = await selectServer(servers.slice(0, 2), {
      input: { isTTY: true },
      output: target,
      prompt: async () => answers.shift()
    });
    assert.equal(selected, 'zeta');
    const rendered = target.values.join('');
    assert.match(rendered, /default.*home:5666.*admin/s);
    assert.match(rendered, /zeta.*zeta:5666.*z-user/s);
    assert.doesNotMatch(rendered, /password|token|secret/i);
  });

  it('rejects non-interactive ambiguity with available names', async () => {
    await assert.rejects(
      selectServer(servers.slice(0, 2), {
        input: { isTTY: false },
        output: output(false)
      }),
      (error) => error instanceof ServerSelectionError &&
        error.exitCode === 3 &&
        /--server/.test(error.message) &&
        /default/.test(error.message) &&
        /zeta/.test(error.message)
    );
  });

  it('maps end-of-input to a selection error', async () => {
    await assert.rejects(
      selectServer(servers.slice(0, 2), {
        input: { isTTY: true },
        output: output(),
        prompt: async () => null
      }),
      (error) => error instanceof ServerSelectionError && error.exitCode === 3
    );
  });
});
```

- [ ] **Step 2: Run the selector test and verify the module is missing**

Run:

```bash
npx mocha test/unit/server-selector.test.js
```

Expected: FAIL with `Cannot find module '../../src/utils/server-selector'`.

- [ ] **Step 3: Implement the selector without a third-party dependency**

Create `src/utils/server-selector.js`:

```js
const readline = require('node:readline/promises');

class ServerSelectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ServerSelectionError';
    this.exitCode = 3;
  }
}

function sortServers(servers) {
  return [...servers].sort((left, right) => {
    if (left.name === 'default') return right.name === 'default' ? 0 : -1;
    if (right.name === 'default') return 1;
    if (left.name < right.name) return -1;
    if (left.name > right.name) return 1;
    return 0;
  });
}

async function terminalPrompt(message, { input, output }) {
  const terminal = readline.createInterface({ input, output, terminal: true });
  return new Promise((resolve, reject) => {
    let settled = false;
    const resolveOnce = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    terminal.once('SIGINT', () => {
      terminal.close();
      resolveOnce(null);
    });
    terminal.once('close', () => resolveOnce(null));
    terminal.question(message).then(resolveOnce, reject).finally(() => {
      terminal.close();
    });
  });
}

function availableNames(servers) {
  return sortServers(servers).map(({ name }) => name).join(', ');
}

async function selectServer(servers, dependencies = {}) {
  const ordered = sortServers(servers);
  if (ordered.length === 0) {
    throw new ServerSelectionError(
      'No saved servers found. Run "fnos login" first.'
    );
  }
  if (ordered.length === 1) return ordered[0].name;

  const input = dependencies.input || process.stdin;
  const output = dependencies.output || process.stderr;
  const prompt = dependencies.prompt || terminalPrompt;
  if (!input.isTTY || !output.isTTY) {
    throw new ServerSelectionError(
      `Multiple saved servers are available: ${availableNames(ordered)}. ` +
      'Use --server <name>.'
    );
  }

  output.write('Select a server:\n');
  ordered.forEach((server, index) => {
    output.write(
      `  ${index + 1}) ${server.name}  ${server.endpoint}  (${server.username})\n`
    );
  });

  while (true) {
    let answer;
    try {
      answer = await prompt(`Server [1-${ordered.length}]: `, { input, output });
    } catch {
      throw new ServerSelectionError('Server selection was cancelled.');
    }
    if (answer === null || answer === undefined) {
      throw new ServerSelectionError('Server selection was cancelled.');
    }
    const trimmed = String(answer).trim();
    if (/^\d+$/.test(trimmed)) {
      const index = Number(trimmed) - 1;
      if (ordered[index]) return ordered[index].name;
    }
    output.write(`Enter a number from 1 to ${ordered.length}.\n`);
  }
}

module.exports = {
  ServerSelectionError,
  selectServer,
  sortServers
};
```

- [ ] **Step 4: Run focused and full unit tests**

Run:

```bash
npx mocha test/unit/server-selector.test.js
npm test
```

Expected: selector tests and all existing unit tests pass.

- [ ] **Step 5: Commit the selector**

```bash
git add src/utils/server-selector.js test/unit/server-selector.test.js
git commit -m "feat: add interactive server selection"
```

---

### Task 3: Server Option and Asynchronous Credential Resolution

**Files:**
- Modify: `src/commands/options.js:1-128`
- Modify: `src/utils/auth-helper.js:1-75`
- Modify: `src/commands/runner.js:1-37`
- Modify: `test/unit/command-options.test.js:1-72`
- Modify: `test/unit/auth-helper.test.js:1-25`
- Modify: `test/unit/command-runner.test.js:22-62`
- Modify: `test/unit/program.test.js:1-32`

**Interfaces:**
- Consumes: `isValidServerName(name)`、`Settings.listServers()`、`Settings.getCredentials(name)`、`selectServer(servers, dependencies)`。
- Produces: `registerServerOption(command)`、`resolveServerName(requestedName, dependencies)`、异步 `resolveCredentials(options, dependencies)`；保存凭证结果包含 `source: "settings_file"` 和 `serverName`。

- [ ] **Step 1: Write failing option and credential-resolution tests**

Add to `test/unit/command-options.test.js`:

```js
it('registers and validates the shared server option', () => {
  const command = new Command('network-list').exitOverride();
  registerAuthenticationOptions(command);
  command.parse(['node', 'network-list', '--server', 'office-nas'], { from: 'node' });
  assert.equal(command.opts().server, 'office-nas');
  assert.throws(
    () => command.parse(['node', 'network-list', '--server', 'bad name'], { from: 'node' }),
    (error) => error instanceof CommandParameterError && error.exitCode === 4
  );
});
```

Import `registerServerOption` in that test and assert it adds only `--server` to a fresh command:

```js
const logout = new Command('logout').exitOverride();
registerServerOption(logout);
assert.deepEqual(logout.options.map(({ long }) => long), ['--server']);
```

Replace `test/unit/auth-helper.test.js` with async cases:

```js
const assert = require('node:assert/strict');
const { describe, it } = require('mocha');
const {
  resolveCredentials,
  resolveServerName
} = require('../../src/utils/auth-helper');

const summaries = [
  { name: 'default', endpoint: 'home:5666', username: 'home-user' },
  { name: 'office', endpoint: 'office:5666', username: 'office-user' }
];
const records = {
  default: { endpoint: 'home:5666', username: 'home-user', password: 'home-pw' },
  office: { endpoint: 'office:5666', username: 'office-user', password: 'office-pw' }
};
const settingsStore = {
  listServers: () => summaries,
  getCredentials: (name) => records[name] || null
};

describe('credential resolution', () => {
  it('returns explicit named credentials with their source name', async () => {
    const credentials = await resolveCredentials(
      { server: 'office' },
      { settingsStore }
    );
    assert.deepEqual(credentials, {
      ...records.office,
      source: 'settings_file',
      serverName: 'office'
    });
  });

  it('uses complete temporary credentials without selecting a server', async () => {
    const credentials = await resolveCredentials({
      endpoint: 'temporary:5666',
      username: 'temp-user',
      password: 'temp-pw'
    }, {
      settingsStore,
      select: async () => assert.fail('selector must not run')
    });
    assert.equal(credentials.source, 'command_line');
    assert.equal(credentials.serverName, undefined);
  });

  it('rejects mixing a server name with any temporary credential option', async () => {
    await assert.rejects(
      resolveCredentials(
        { server: 'office', endpoint: 'temporary:5666' },
        { settingsStore }
      ),
      (error) => error.exitCode === 4
    );
  });

  it('preserves exit code 3 for partial temporary credentials', async () => {
    await assert.rejects(
      resolveCredentials(
        { endpoint: 'temporary:5666' },
        { settingsStore }
      ),
      (error) => error.message === 'PARTIAL_CREDENTIALS' && error.exitCode === 3
    );
  });

  it('selects when no source is explicit', async () => {
    const selected = [];
    const credentials = await resolveCredentials({}, {
      settingsStore,
      select: async (servers) => {
        selected.push(servers);
        return 'default';
      }
    });
    assert.deepEqual(selected[0], summaries);
    assert.equal(credentials.serverName, 'default');
  });

  it('lists names when an explicit server does not exist', async () => {
    await assert.rejects(
      resolveServerName('missing', { settingsStore }),
      (error) => error.exitCode === 3 &&
        /default/.test(error.message) &&
        /office/.test(error.message)
    );
  });
});
```

Add an async resolver assertion to `test/unit/command-runner.test.js` by changing the success test dependency:

```js
resolveCredentials: async () => {
  await Promise.resolve();
  return {
    endpoint: 'host:5666',
    username: 'admin',
    password: 'pw',
    source: 'command_line'
  };
},
```

Add a true non-TTY CLI test to `test/unit/program.test.js`. Create a temporary home with two server records, spawn `bin/fnos sysinfo.getHostName`, then assert no network call is attempted:

```js
it('requires --server for multiple saved servers in a non-TTY process', () => {
  const os = require('node:os');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-cli-program-'));
  const settingsDir = path.join(home, '.fnos');
  fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(path.join(settingsDir, 'settings.json'), JSON.stringify({
    servers: {
      default: { endpoint: '127.0.0.1:1', username: 'admin', password: 'pw' },
      office: { endpoint: '127.0.0.1:2', username: 'admin', password: 'pw' }
    }
  }));
  try {
    const result = spawnSync(process.execPath, [
      path.resolve(__dirname, '../../bin/fnos'),
      'sysinfo.getHostName'
    ], {
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    assert.equal(result.status, 3);
    assert.match(result.stderr, /--server/);
    assert.match(result.stderr, /default/);
    assert.match(result.stderr, /office/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run focused tests and verify synchronous resolution and missing options fail**

Run:

```bash
npx mocha \
  test/unit/command-options.test.js \
  test/unit/auth-helper.test.js \
  test/unit/command-runner.test.js \
  test/unit/program.test.js
```

Expected: FAIL because `--server` is unregistered, `resolveCredentials` is synchronous, and runner does not await it.

- [ ] **Step 3: Register and validate the server option**

In `src/commands/options.js`, import the shared validator:

```js
const { isValidServerName } = require('../utils/settings');
```

Then add:

```js
function parseServerName(value) {
  if (!isValidServerName(value)) {
    throw new CommandParameterError(
      '--server must match [A-Za-z0-9][A-Za-z0-9._-]{0,63}.'
    );
  }
  return value;
}

function registerServerOption(command) {
  command.option(
    '-s, --server <name>',
    'Saved server name',
    parseServerName
  );
  return command;
}
```

Call `registerServerOption(command)` at the start of `registerAuthenticationOptions()`. Export `parseServerName` and `registerServerOption`.

- [ ] **Step 4: Implement asynchronous named credential resolution**

Replace the saved-credential branch in `src/utils/auth-helper.js` with these interfaces:

```js
const settings = require('./settings');
const { selectServer } = require('./server-selector');
const {
  CommandParameterError,
  parseServerName
} = require('../commands/options');

function credentialError(message) {
  const error = new Error(message);
  error.name = 'AuthenticationError';
  error.exitCode = 3;
  return error;
}

function availableNames(servers) {
  return servers.map(({ name }) => name).join(', ');
}

async function resolveServerName(requestedName, dependencies = {}) {
  const settingsStore = dependencies.settingsStore || settings;
  const select = dependencies.select || selectServer;
  const selectorDependencies = dependencies.selectorDependencies || {};
  const servers = settingsStore.listServers();

  if (requestedName !== undefined) {
    parseServerName(requestedName);
    if (!servers.some(({ name }) => name === requestedName)) {
      throw credentialError(
        `Saved server "${requestedName}" was not found. ` +
        `Available servers: ${availableNames(servers) || '(none)'}.`
      );
    }
    return requestedName;
  }

  return select(servers, selectorDependencies);
}

async function resolveCredentials(options, dependencies = {}) {
  const settingsStore = dependencies.settingsStore || settings;
  const provided = [options.endpoint, options.username, options.password]
    .filter(Boolean).length;

  if (options.server !== undefined && provided > 0) {
    throw new CommandParameterError(
      '--server cannot be combined with -e/--endpoint, -u/--username, or -p/--password.'
    );
  }
  if (provided > 0 && provided < 3) throw credentialError('PARTIAL_CREDENTIALS');
  if (provided === 3) {
    return {
      endpoint: options.endpoint,
      username: options.username,
      password: options.password,
      source: 'command_line'
    };
  }

  const serverName = await resolveServerName(options.server, {
    ...dependencies,
    settingsStore
  });
  const credentials = settingsStore.getCredentials(serverName);
  if (!credentials) {
    throw credentialError(`Saved server "${serverName}" was not found.`);
  }
  return {
    ...credentials,
    source: 'settings_file',
    serverName
  };
}
```

Preserve exports for `hasPartialCredentials` and `validateCommandLineCredentials`, and add `resolveServerName`. Reuse `credentialError` rather than creating a second exit-code implementation.

- [ ] **Step 5: Await the resolver and finish command integration**

In `src/commands/runner.js`, change:

```js
const credentials = resolve(context.options);
```

to:

```js
const credentials = await resolve(context.options);
```

Ensure `src/commands/index.js` remains unchanged: it already passes each business command's parsed options to runner, and `registerAuthenticationOptions()` now adds `--server`.

- [ ] **Step 6: Run focused and full unit tests**

Run:

```bash
npx mocha \
  test/unit/command-options.test.js \
  test/unit/auth-helper.test.js \
  test/unit/command-runner.test.js \
  test/unit/program.test.js
npm test
```

Expected: all focused tests and the complete unit suite pass.

- [ ] **Step 7: Commit option and resolution support**

```bash
git add \
  src/commands/options.js \
  src/utils/auth-helper.js \
  src/commands/runner.js \
  test/unit/command-options.test.js \
  test/unit/auth-helper.test.js \
  test/unit/command-runner.test.js \
  test/unit/program.test.js
git commit -m "feat: resolve named server credentials"
```

---

### Task 4: Named Login and Selectable Logout

**Files:**
- Modify: `src/commands/auth.js:1-49`
- Modify: `test/unit/auth-commands.test.js:1-113`

**Interfaces:**
- Consumes: `registerServerOption(command)`、`resolveServerName(requestedName, dependencies)`、`Settings.listServers()`、`Settings.clearCredentials(name)`。
- Produces: login passes `serverName` into `createClient()`；logout asynchronously deletes exactly one selected name。

- [ ] **Step 1: Write failing login and logout command tests**

Extend the existing subprocess-style tests in `test/unit/auth-commands.test.js`.

For login, parse both forms and assert the target:

```js
registerLoginCommand(program, {
  createClient: async (options) => {
    received = options;
    return { close: () => { closed += 1; } };
  },
  stderr: () => {}
});
program.parseAsync([
  'node', 'fnos', 'login',
  '--server', 'office',
  '-e', '127.0.0.1:1',
  '-u', 'admin',
  '-p', 'pw'
]).then(() => {
  assert.equal(received.serverName, 'office');
  assert.equal(received.saveCredentials, true);
  assert.equal(closed, 1);
  process.stdout.write('LOGIN_NAMED_OK');
});
```

Add a separate case without `--server` and assert:

```js
assert.equal(received.serverName, 'default');
```

For logout, inject two summaries and a deterministic selector:

```js
registerLogoutCommand(program, {
  settings: {
    listServers: () => [
      { name: 'default', endpoint: 'home:5666', username: 'admin' },
      { name: 'office', endpoint: 'office:5666', username: 'admin' }
    ],
    getCredentials: (name) => ({ endpoint: `${name}:5666`, username: 'admin', password: 'pw' }),
    clearCredentials: (name) => { cleared = name; return true; }
  },
  selectServer: async () => 'office',
  stdout: (value) => output.push(value),
  stderr: (value) => errors.push(value)
});
program.parseAsync(['node', 'fnos', 'logout']).then(() => {
  assert.equal(cleared, 'office');
  assert.match(output[0], /office/);
  assert.equal(errors.length, 0);
  process.stdout.write('LOGOUT_SELECTED_OK');
});
```

Add cases for:

```js
// Explicit name deletes only that name.
program.parseAsync(['node', 'fnos', 'logout', '--server', 'default']);

// No saved servers is idempotent success and never invokes the selector.
listServers: () => []
```

- [ ] **Step 2: Run auth command tests and verify target names are not passed**

Run:

```bash
npx mocha test/unit/auth-commands.test.js
```

Expected: FAIL because login omits `serverName` and logout has no `--server` or selector.

- [ ] **Step 3: Pass the login target name**

In `registerLoginCommand()`, leave the existing required endpoint, username, password and two-factor options unchanged. Add:

```js
serverName: options.server || 'default',
```

to the object passed to `createClient()`.

- [ ] **Step 4: Make logout asynchronous and reuse the selector rules**

Import `registerServerOption`, `resolveServerName`, and the default `selectServer`. Register only the server option on logout:

```js
const command = program
  .command('logout')
  .description('Logout and clear saved credentials');
registerServerOption(command);
```

Add the injected dependencies before registering the action:

```js
const stderr = dependencies.stderr || console.error;
const resolveName = dependencies.resolveServerName || resolveServerName;
```

Implement the action with its own error boundary so injected unit programs receive the same behavior as the main CLI:

```js
command.action(async (options) => {
  try {
    const servers = store.listServers();
    if (servers.length === 0) {
      stdout('No saved credentials found.');
      process.exitCode = 0;
      return;
    }
    const serverName = await resolveName(options.server, {
      settingsStore: store,
      select: dependencies.selectServer || selectServer,
      selectorDependencies: dependencies.selectorDependencies
    });
    store.clearCredentials(serverName);
    stdout(`Logged out from "${serverName}" successfully. Credentials cleared.`);
    process.exitCode = 0;
  } catch (error) {
    stderr(`Error: ${errorMessage(error)}`);
    process.exitCode = error.exitCode || 1;
  }
});
```

- [ ] **Step 5: Run focused and full unit tests**

Run:

```bash
npx mocha test/unit/auth-commands.test.js
npm test
```

Expected: all authentication command tests and the full unit suite pass.

- [ ] **Step 6: Commit named auth commands**

```bash
git add src/commands/auth.js test/unit/auth-commands.test.js
git commit -m "feat: support named login and logout"
```

---

### Task 5: Persist Renewed Credentials to the Source Server

**Files:**
- Modify: `src/utils/client.js:89-148`
- Modify: `src/utils/settings.js` transitional `saveCredentials` overload
- Modify: `test/unit/client.test.js:18-223`
- Modify: `test/unit/settings.test.js` strict signature assertion

**Interfaces:**
- Consumes: saved credentials containing `serverName` or login options containing `serverName`。
- Produces: strict `settings.saveCredentials(serverName, credentials)` calls; token-success path performs no write; password-success path writes exactly one named record。

- [ ] **Step 1: Write failing named write-back tests**

Change the client test dependency capture:

```js
function dependencies(client, saved = []) {
  return {
    sdk: { FnosClient: class { constructor() { return client; } } },
    settings: {
      saveCredentials: (serverName, value) => saved.push([serverName, value])
    },
    logger: { info() {}, debug() {} },
    saved
  };
}
```

Change the password migration assertion to:

```js
assert.deepEqual(deps.saved[0], ['default', {
  endpoint: 'wss://host:5667',
  username: 'admin',
  password: 'pw',
  credentialVersion: 2,
  token: 'token',
  longToken: 'long',
  secret: 'decrypted',
  secretFormat: 'decrypted-v1'
}]);
```

Strengthen the rejected-token fallback test:

```js
const deps = dependencies(client);
await clientUtils.createClientWithCredentials({
  endpoint: 'office:5666',
  username: 'admin',
  password: 'pw',
  source: 'settings_file',
  serverName: 'office',
  credentialVersion: 2,
  token: 'token',
  longToken: 'long',
  secret: 'decrypted',
  secretFormat: 'decrypted-v1'
}, {}, deps);
assert.equal(client.calls.some(([name]) => name === 'login'), true);
assert.equal(deps.saved[0][0], 'office');
assert.equal(deps.saved[0][1].endpoint, 'office:5666');
```

Strengthen the successful token test so it proves no write occurs:

```js
const deps = dependencies(client);
await clientUtils.createClientWithCredentials({
  endpoint: 'host:5666',
  username: 'admin',
  password: 'pw',
  source: 'settings_file',
  serverName: 'default',
  credentialVersion: 2,
  token: 'token',
  longToken: 'long',
  secret: 'decrypted',
  secretFormat: 'decrypted-v1'
}, {}, deps);
assert.equal(deps.saved.length, 0);
```

In the rejected password test, capture dependencies and assert failed login does not overwrite the record:

```js
const deps = dependencies(client);
await assert.rejects(
  clientUtils.createClientWithCredentials(
    {
      endpoint: 'host:5666',
      username: 'admin',
      password: 'wrong',
      source: 'settings_file',
      serverName: 'default'
    },
    {},
    deps
  ),
  (error) => error instanceof clientUtils.AuthenticationError &&
    error.exitCode === 3
);
assert.equal(deps.saved.length, 0);
```

Add a named login save test:

```js
it('saves an explicit login to its requested server name', async () => {
  const client = new FakeClient();
  const deps = dependencies(client);
  await clientUtils.createClient({
    endpoint: 'home:5666',
    username: 'admin',
    password: 'pw',
    saveCredentials: true,
    serverName: 'home'
  }, deps);
  assert.equal(deps.saved[0][0], 'home');
});
```

Add to `test/unit/settings.test.js`:

```js
assert.throws(
  () => store.saveCredentials({
    endpoint: 'host:5666', username: 'admin', password: 'pw'
  }),
  (error) => error.name === 'ConfigurationError'
);
```

- [ ] **Step 2: Run client and settings tests and verify the old save signature fails**

Run:

```bash
npx mocha test/unit/client.test.js test/unit/settings.test.js
```

Expected: FAIL because client passes only the credential object and settings still accepts the transitional overload.

- [ ] **Step 3: Save successful password login results under one target name**

In `createClientWithCredentials()`, replace the current one-argument save with:

```js
const serverName = options.serverName || credentials.serverName || 'default';
settingsStore.saveCredentials(serverName, {
  endpoint: credentials.endpoint,
  username: credentials.username,
  password: credentials.password,
  credentialVersion: 2,
  token: result.token || null,
  longToken: result.longToken || null,
  secret: decryptedSecret,
  secretFormat: 'decrypted-v1'
});
```

Keep it inside the existing condition:

```js
if (options.saveCredentials || credentials.source === 'settings_file') {
```

This preserves the no-write behavior for successful token login and temporary business credentials.

- [ ] **Step 4: Remove the transitional settings overload**

In `Settings.saveCredentials(serverName, credentials)`, remove:

```js
if (typeof serverName === 'object' && credentials === undefined) {
  credentials = serverName;
  serverName = 'default';
}
```

The existing name validation then converts a one-argument object call into a `ConfigurationError`.

- [ ] **Step 5: Run focused and full unit tests**

Run:

```bash
npx mocha test/unit/client.test.js test/unit/settings.test.js
npm test
```

Expected: all focused tests and the full unit suite pass.

- [ ] **Step 6: Commit named credential persistence**

```bash
git add \
  src/utils/client.js \
  src/utils/settings.js \
  test/unit/client.test.js \
  test/unit/settings.test.js
git commit -m "fix: update credentials for the selected server"
```

---

### Task 6: Documentation and Generated Command Reference

**Files:**
- Modify: `scripts/generate-command-reference.js:10-33`
- Modify: `test/unit/documentation.test.js:19-49`
- Modify: `README.md:8-108`
- Modify: `CHANGELOG.md:1-24`
- Regenerate: `docs/commands.md`

**Interfaces:**
- Consumes: approved CLI syntax and migration semantics。
- Produces: generated command reference containing the shared `--server` option and user-facing migration documentation。

- [ ] **Step 1: Write failing documentation assertions**

In the existing generated-reference test in `test/unit/documentation.test.js`, add:

```js
assert.match(actual, /-s, --server <name>/);
assert.match(actual, /Saved server name/);
```

In the existing README/CHANGELOG test, add:

```js
assert.match(readme, /fnos login --server office/);
assert.match(readme, /servers\.default/);
assert.match(readme, /非交互/);
assert.match(changelog, /## \[Unreleased\]/);
assert.match(changelog, /多 server/);
```

- [ ] **Step 2: Run documentation tests and verify the content is absent**

Run:

```bash
npx mocha test/unit/documentation.test.js
```

Expected: FAIL because the shared server option and migration text are not documented.

- [ ] **Step 3: Extend the command reference generator**

Insert this shared section after the command count in `renderCommandReference()`:

```js
'## Shared Authentication Options',
'',
'Every business command accepts these authentication options.',
'',
'| Option | Description |',
'|---|---|',
'| `-s, --server <name>` | Saved server name. |',
'| `-e, --endpoint <endpoint>` | Temporary server endpoint. |',
'| `-u, --username <username>` | Temporary username. |',
'| `-p, --password <password>` | Temporary password. |',
'| `--twofa-code <code>` | Six-digit two-factor code. |',
'| `--trust-device` | Trust this device after two-factor login. |',
'| `--verify-ssl` | Verify the WSS server certificate. |',
'',
'`--server` cannot be combined with `-e`, `-u`, or `-p`. ' +
  'Temporary endpoint, username, and password must be supplied together.',
''
```

Keep the business option tables unchanged.

- [ ] **Step 4: Document exact CLI and migration behavior**

Update the README authentication section with concrete examples:

```markdown
fnos login -e nas.example.com:5666 -u admin -p password
fnos login --server office -e office.example.com:5666 -u admin -p password
fnos sysinfo.getHostName --server office
fnos logout --server office
```

State explicitly:

```markdown
未指定 `--server` 的 login 保存为 `default`。业务命令和 logout
在只有一个已保存 server 时自动选择；有多个时在交互终端显示列表。
在 CI、管道等非交互环境中必须显式提供 `--server`。

旧版顶层单 server 凭证会在首次凭证访问时一次性迁移为
`servers.default`。升级后的配置不再供旧版 CLI 读取。
```

Document the mutual exclusion between `--server` and temporary `-e/-u/-p`, while retaining the warning that passwords are local plaintext settings rather than keychain-protected secrets.

Add this unreleased section to the top of `CHANGELOG.md` before `0.3.0`:

```markdown
## [Unreleased]

### 新增

- login、logout 和全部业务命令支持使用 `--server` 管理和选择多 server 凭证
- 多个已保存 server 可在交互终端中通过编号列表选择

### 变更

- 旧版顶层单 server 凭证会一次性升级为 `servers.default`
- 非交互环境存在多个 server 时必须显式提供 `--server`
```

- [ ] **Step 5: Regenerate the reference and run documentation tests**

Run:

```bash
npm run docs:commands
npx mocha test/unit/documentation.test.js
npm test
```

Expected: generated reference matches the renderer, documentation tests pass, and the complete unit suite passes.

- [ ] **Step 6: Commit documentation**

```bash
git add \
  scripts/generate-command-reference.js \
  test/unit/documentation.test.js \
  README.md \
  CHANGELOG.md \
  docs/commands.md
git commit -m "docs: document multi-server authentication"
```

---

### Task 7: Smoke Coverage and Final Verification

**Files:**
- Modify: `test/smoke/cli.test.js:46-71`

**Interfaces:**
- Consumes: the complete CLI implemented in Tasks 1-6 and the pinned fnos mock server at `127.0.0.1:5666`。
- Produces: end-to-end evidence for default compatibility, named isolation, token reuse, and logout preservation。

- [ ] **Step 1: Update the legacy smoke flow for the new canonical schema**

Change the existing login flow assertions:

```js
const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
assert.equal(data.servers.default.credentialVersion, 2);
data.theme = 'dark';
data.servers.default.password = 'wrong-password-to-prove-token-reuse';
fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), { mode: 0o600 });
```

After `fnos logout`, assert:

```js
assert.deepEqual(
  JSON.parse(fs.readFileSync(settingsPath, 'utf8')),
  { servers: {}, theme: 'dark' }
);
```

- [ ] **Step 2: Add an end-to-end named server isolation test**

Add:

```js
it('keeps named server credentials independent', () => {
  const testHome = home();
  const defaultLogin = runCli([
    'login',
    '-e', '127.0.0.1:5666',
    '-u', 'admin',
    '-p', 'admin'
  ], testHome);
  assert.equal(defaultLogin.status, 0, defaultLogin.stderr || defaultLogin.error?.message);

  const officeLogin = runCli([
    'login',
    '--server', 'office',
    '-e', '127.0.0.1:5666',
    '-u', 'admin',
    '-p', 'admin'
  ], testHome);
  assert.equal(officeLogin.status, 0, officeLogin.stderr || officeLogin.error?.message);

  const query = runCli([
    '--raw',
    'sysinfo.getHostName',
    '--server', 'office'
  ], testHome);
  assert.equal(query.status, 0, query.stderr || query.error?.message);
  assert.equal(JSON.parse(query.stdout).result, 'succ');

  const logout = runCli(['logout', '--server', 'office'], testHome);
  assert.equal(logout.status, 0, logout.stderr || logout.error?.message);
  assert.match(logout.stdout, /office/);

  const settingsPath = path.join(testHome, '.fnos', 'settings.json');
  const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.ok(data.servers.default);
  assert.equal(data.servers.office, undefined);
});
```

- [ ] **Step 3: Run the offline suite before mock-dependent tests**

Run:

```bash
npm test
git diff --check
```

Expected: all unit tests pass and `git diff --check` prints no errors.

- [ ] **Step 4: Run the pinned mock-server smoke suite**

With the README-documented pinned `fnos-mock-server` commit
`d9592a05a8e07082b954921acfae3a9a915f3c01` listening on `127.0.0.1:5666`
and `FNOS_MOCK_TWOFA_USERS=twofauser`, run:

```bash
npm run test:smoke
```

Expected: the default login/token/logout flow, two-factor flow, named server flow, all 111 business commands, and invalid-argument flow pass.

- [ ] **Step 5: Run complete project verification**

Run:

```bash
npm run docs:commands
npm run test:all
git diff --exit-code -- docs/commands.md
git status --short
```

Expected:

- `npm run test:all` exits `0`。
- regenerating `docs/commands.md` creates no diff。
- `git status --short` shows only the intended smoke-test change before the final commit。

- [ ] **Step 6: Commit smoke coverage**

```bash
git add test/smoke/cli.test.js
git commit -m "test: cover multi-server authentication flows"
```

- [ ] **Step 7: Confirm the branch is clean and review commit messages**

Run:

```bash
git status --short
git log --format='%h %s%n%b' main..HEAD
```

Expected: the worktree is clean; every new commit uses an English Conventional Commit subject and no commit body contains a co-author trailer.
