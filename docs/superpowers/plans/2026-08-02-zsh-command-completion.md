# zsh Command Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native zsh Tab completion for fnos commands, options, finite values, and saved server names, with explicit persistent installation and no network access.

**Architecture:** Build a shell-independent completion model from Commander plus internal completion metadata, then render source and autoload variants of a zsh completion function. Keep ordinary candidates static in zsh; reserve `fnos __complete server` as a lightweight, read-only fast path and cache its results per zsh session.

**Tech Stack:** Node.js >=18, CommonJS, Commander.js 11.1, zsh >=5.8, Mocha 10, `node:assert/strict`.

## Global Constraints

- Support zsh 5.8 and 5.9 in the first release; do not add bash, fish, or PowerShell behavior.
- Add no runtime or development dependency; use Commander, Node.js standard modules, and zsh built-ins already available.
- Preserve all 111 business commands, their parsing behavior, validation messages, and exit codes.
- Ordinary command, option, boolean, and enum completion must not start Node.js or perform file/network I/O.
- Dynamic server completion must not load Commander, the fnOS SDK, or Winston, and must never connect to fnOS.
- Completion lookup must be read-only: pressing Tab must not migrate or rewrite legacy settings.
- `fnos completion install zsh` may write only after explicit invocation; it must not edit `.zshrc` or add an npm `postinstall` hook.
- The installed autoload file must start with `#compdef fnos`; the generated marker must be the second line.
- Use Angular/Conventional Commits messages in English and never add a `Co-Authored-By` trailer.
- Work only in `/Users/timandes/Projects/fnos/fnos-cli/.worktrees/zsh-completion` on `feature/zsh-completion`.

## File Map

- Create `src/completion/metadata.js`: attach non-invasive completion metadata to Commander `Option` and `Argument` objects.
- Create `src/completion/runtime.js`: implement the lightweight internal server-name protocol.
- Create `src/completion/spec.js`: normalize the Commander tree into a shell-independent model.
- Create `src/completion/zsh.js`: quote values and render source/autoload zsh scripts.
- Create `src/completion/installer.js`: safely and atomically install an autoload script.
- Create `src/commands/completion.js`: expose `completion [shell]` and `completion install <shell>`.
- Modify `src/commands/options.js`: annotate boolean, enum, and server options.
- Modify `src/utils/settings.js`: add a non-mutating server-name view and shared name ordering.
- Modify `src/utils/server-selector.js`: reuse the shared ordering without changing selection behavior.
- Modify `src/index.js`: register the public completion command.
- Modify `bin/fnos`: route `__complete` before importing the full CLI.
- Create focused tests under `test/unit/completion-*.test.js` and extend existing option, settings, program, and documentation tests.
- Modify `README.md` and `CHANGELOG.md`: document installation, refresh, temporary activation, and the feature entry.
- Modify `.github/workflows/tests.yml`: install zsh explicitly before running completion integration tests.

The approved design is `docs/superpowers/specs/2026-08-02-zsh-command-completion-design.md`.

---

### Task 1: Attach completion metadata to existing options

**Files:**
- Create: `src/completion/metadata.js`
- Create: `test/unit/completion-metadata.test.js`
- Modify: `src/commands/options.js:1-150`
- Modify: `test/unit/command-options.test.js:1-130`

**Interfaces:**
- Produces: `withCompletion(target, completion) -> target`.
- Produces: `getCompletion(target) -> null | { kind: 'values', values: string[] } | { kind: 'server' }`.
- Produces: `fixedValues(values) -> { kind: 'values', values: string[] }` with stringified, frozen values.
- Produces: `SERVER_COMPLETION -> { kind: 'server' }`.
- Later tasks consume metadata only through `getCompletion`; no task reads a private property directly.

- [ ] **Step 1: Write failing metadata unit tests**

Create `test/unit/completion-metadata.test.js`:

```js
const assert = require('node:assert/strict');
const { Option } = require('commander');
const { describe, it } = require('mocha');

const {
  SERVER_COMPLETION,
  fixedValues,
  getCompletion,
  withCompletion
} = require('../../src/completion/metadata');

describe('completion metadata', () => {
  it('attaches frozen value metadata without changing the target identity', () => {
    const option = new Option('--mode <mode>');
    const completion = fixedValues([0, 'one']);

    assert.equal(withCompletion(option, completion), option);
    assert.deepEqual(getCompletion(option), {
      kind: 'values',
      values: ['0', 'one']
    });
    assert.equal(Object.isFrozen(getCompletion(option)), true);
    assert.equal(Object.isFrozen(getCompletion(option).values), true);
  });

  it('returns null for unannotated targets and exposes immutable server metadata', () => {
    assert.equal(getCompletion(new Option('--plain')), null);
    assert.deepEqual(SERVER_COMPLETION, { kind: 'server' });
    assert.equal(Object.isFrozen(SERVER_COMPLETION), true);
  });
});
```

- [ ] **Step 2: Run the new test and verify the module is missing**

Run:

```bash
npx mocha test/unit/completion-metadata.test.js
```

Expected: FAIL with `Cannot find module '../../src/completion/metadata'`.

- [ ] **Step 3: Implement the metadata module**

Create `src/completion/metadata.js` with a module-local `Symbol` so Commander behavior is untouched:

```js
const COMPLETION = Symbol('fnosCompletion');

const SERVER_COMPLETION = Object.freeze({ kind: 'server' });

function fixedValues(values) {
  return Object.freeze({
    kind: 'values',
    values: Object.freeze(values.map((value) => String(value)))
  });
}

function withCompletion(target, completion) {
  Object.defineProperty(target, COMPLETION, {
    value: completion,
    enumerable: false,
    configurable: false,
    writable: false
  });
  return target;
}

function getCompletion(target) {
  return target?.[COMPLETION] || null;
}

module.exports = {
  SERVER_COMPLETION,
  fixedValues,
  getCompletion,
  withCompletion
};
```

- [ ] **Step 4: Add failing option-annotation assertions**

In `test/unit/command-options.test.js`, import `getCompletion`, register one boolean definition and one integer enum definition, and add these assertions to a new test:

```js
const { getCompletion } = require('../../src/completion/metadata');

it('annotates boolean, enum, and server options for completion', () => {
  const command = new Command('sample');
  registerBusinessOptions(command, [
    { name: 'all', flag: '--all <boolean>', type: 'boolean', description: 'All rows' },
    {
      name: 'direction',
      flag: '--direction <integer>',
      type: 'integer',
      allowedValues: [0, 1],
      description: 'Direction'
    },
    { name: 'name', flag: '--name <name>', type: 'string', description: 'Name' }
  ]);
  registerServerOption(command);

  const byLong = Object.fromEntries(command.options.map((option) => [option.long, option]));
  assert.deepEqual(getCompletion(byLong['--all']), {
    kind: 'values',
    values: ['true', 'false']
  });
  assert.deepEqual(getCompletion(byLong['--direction']), {
    kind: 'values',
    values: ['0', '1']
  });
  assert.equal(getCompletion(byLong['--name']), null);
  assert.deepEqual(getCompletion(byLong['--server']), { kind: 'server' });
});
```

- [ ] **Step 5: Run the option test and verify annotations are absent**

Run:

```bash
npx mocha test/unit/command-options.test.js --grep "annotates boolean"
```

Expected: FAIL because `getCompletion(byLong['--all'])` is `null`.

- [ ] **Step 6: Annotate options without changing their parsers**

Modify `src/commands/options.js` to import the metadata helpers, add this private helper, and use `Command#addOption` for the shared server option:

```js
const {
  SERVER_COMPLETION,
  fixedValues,
  withCompletion
} = require('../completion/metadata');

function completionForDefinition(definition) {
  if (definition.type === 'boolean') return fixedValues(['true', 'false']);
  if (Array.isArray(definition.allowedValues)) {
    return fixedValues(definition.allowedValues);
  }
  return null;
}

function registerBusinessOptions(command, definitions) {
  for (const definition of definitions) {
    const option = new Option(definition.flag, definition.description);
    const completion = completionForDefinition(definition);
    command.addOption(completion ? withCompletion(option, completion) : option);
    for (const legacyFlag of definition.legacyFlags || []) {
      command.addOption(
        new Option(legacyFlag, `${definition.description} (legacy spelling)`).hideHelp()
      );
    }
  }
  return command;
}

function registerServerOption(command) {
  const option = new Option('-s, --server <name>', 'Saved server name')
    .argParser(parseServerName);
  command.addOption(withCompletion(option, SERVER_COMPLETION));
  return command;
}
```

Keep `parseValue`, `buildMethodArguments`, and all legacy option registration behavior unchanged.

- [ ] **Step 7: Run focused and full option tests**

Run:

```bash
npx mocha test/unit/completion-metadata.test.js test/unit/command-options.test.js
```

Expected: PASS, including the existing invalid server-name and argument-validation tests.

- [ ] **Step 8: Commit the metadata deliverable**

```bash
git add src/completion/metadata.js src/commands/options.js test/unit/completion-metadata.test.js test/unit/command-options.test.js
git commit -m "feat: annotate completion value metadata"
```

---

### Task 2: Add a read-only, lightweight server completion path

**Files:**
- Create: `src/completion/runtime.js`
- Create: `test/unit/completion-runtime.test.js`
- Modify: `src/utils/settings.js:10-189`
- Modify: `src/utils/server-selector.js:1-90`
- Modify: `bin/fnos:1-8`
- Modify: `test/unit/settings.test.js:1-355`
- Modify: `test/unit/server-selector.test.js:1-40`

**Interfaces:**
- Produces: `Settings#listServerNamesReadOnly() -> string[]`, sorted with `default` first and all other names lexical.
- Produces: `sortServerNames(names: string[]) -> string[]` without mutating the input.
- Produces: `runCompletion(args, { settingsStore, stdout, stderr }) -> integer exit code`.
- `bin/fnos` consumes `runCompletion` only when the first user argument is exactly `__complete`.

- [ ] **Step 1: Write failing read-only settings tests**

Add tests to `test/unit/settings.test.js` that cover current, legacy, missing, and malformed settings:

```js
it('lists server names without migrating or modifying settings', () => {
  const store = settingsStore();
  store.save({
    endpoint: 'legacy:5666',
    username: 'legacy-user',
    password: 'legacy-pw',
    servers: {
      zeta: { endpoint: 'zeta:5666', username: 'z-user', password: 'z-pw' },
      alpha: { endpoint: 'alpha:5666', username: 'a-user', password: 'a-pw' }
    }
  });
  const before = fs.readFileSync(store.settingsPath);
  const beforeStat = fs.statSync(store.settingsPath);

  assert.deepEqual(store.listServerNamesReadOnly(), ['default', 'alpha', 'zeta']);
  assert.deepEqual(fs.readFileSync(store.settingsPath), before);
  const afterStat = fs.statSync(store.settingsPath);
  assert.equal(afterStat.ino, beforeStat.ino);
  assert.equal(afterStat.mtimeMs, beforeStat.mtimeMs);
});

it('returns no read-only names when settings do not exist', () => {
  const store = settingsStore();
  assert.deepEqual(store.listServerNamesReadOnly(), []);
  assert.equal(fs.existsSync(store.settingsPath), false);
});

it('rejects malformed records in the read-only server view', () => {
  const store = settingsStore();
  store.save({ servers: { office: { endpoint: 'office:5666' } } });
  assert.throws(
    () => store.listServerNamesReadOnly(),
    (error) => error.name === 'ConfigurationError' && error.exitCode === 1
  );
});
```

Extend the server selector ordering test to assert that `sortServerNames` itself returns
`['default', 'alpha', 'zeta']` and leaves its input unchanged.

- [ ] **Step 2: Run the focused settings tests and verify the method is absent**

Run:

```bash
npx mocha test/unit/settings.test.js test/unit/server-selector.test.js --grep "read-only|sorts default"
```

Expected: FAIL with `store.listServerNamesReadOnly is not a function`.

- [ ] **Step 3: Implement shared ordering and the read-only view**

Add to `src/utils/settings.js`:

```js
function sortServerNames(names) {
  return [...names].sort((left, right) => {
    if (left === 'default') return right === 'default' ? 0 : -1;
    if (right === 'default') return 1;
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  });
}
```

Add this method without calling `_loadCredentialSettings()` or `save()`:

```js
listServerNamesReadOnly() {
  const data = this.load();
  if (data === null) return [];
  if (!isPlainObject(data)) {
    throw new ConfigurationError('Invalid settings structure.');
  }
  const servers = data.servers === undefined ? {} : data.servers;
  if (!isPlainObject(servers)) {
    throw new ConfigurationError('Invalid servers configuration.');
  }
  for (const [name, credentials] of Object.entries(servers)) {
    if (!isValidServerName(name)) {
      throw new ConfigurationError(`Invalid server name in settings: "${name}".`);
    }
    validateCredentialRecord(credentials, name);
  }
  const names = Object.keys(servers);
  const hasLegacy = AUTH_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(data, field));
  if (hasLegacy) {
    const legacy = pickCredentials(data);
    validateCredentialRecord(legacy, 'default');
    if (servers.default && !sameKnownCredentials(legacy, servers.default)) {
      throw new ConfigurationError(
        'Conflicting legacy credentials and servers.default were found.'
      );
    }
    names.push('default');
  }
  return sortServerNames([...new Set(names)]);
}
```

Export `sortServerNames`. Refactor `sortServers` in `src/utils/server-selector.js` to map
the shared name order back to the original records:

```js
const { sortServerNames } = require('./settings');

function sortServers(servers) {
  const byName = new Map(servers.map((server) => [server.name, server]));
  return sortServerNames([...byName.keys()]).map((name) => byName.get(name));
}
```

- [ ] **Step 4: Run the settings and selector suites**

Run:

```bash
npx mocha test/unit/settings.test.js test/unit/server-selector.test.js
```

Expected: PASS, including all migration and interactive selection regression tests.

- [ ] **Step 5: Write failing runtime and fast-path tests**

Create `test/unit/completion-runtime.test.js` with injected streams and settings:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { describe, it } = require('mocha');
const { runCompletion } = require('../../src/completion/runtime');

function writable() {
  return {
    value: '',
    write(chunk) { this.value += chunk; }
  };
}

describe('completion runtime', () => {
  it('writes sorted server names one per line', () => {
    const stdout = writable();
    const stderr = writable();
    const status = runCompletion(['server'], {
      settingsStore: { listServerNamesReadOnly: () => ['default', 'office'] },
      stdout,
      stderr
    });
    assert.equal(status, 0);
    assert.equal(stdout.value, 'default\noffice\n');
    assert.equal(stderr.value, '');
  });

  it('silences settings errors but rejects unknown internal requests', () => {
    const stdout = writable();
    const stderr = writable();
    assert.equal(runCompletion(['server'], {
      settingsStore: { listServerNamesReadOnly: () => { throw new Error('broken'); } },
      stdout,
      stderr
    }), 0);
    assert.equal(stdout.value, '');
    assert.equal(stderr.value, '');
    assert.equal(runCompletion(['unknown'], { stdout, stderr }), 2);
    assert.match(stderr.value, /unsupported completion request/i);
  });

  it('routes the executable fast path without loading heavy modules', () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-complete-fast-'));
    const script = `
      const Module = require('node:module');
      const originalLoad = Module._load;
      Module._load = function(request, parent, isMain) {
        if (['commander', 'fnos', 'winston'].includes(request)) {
          throw new Error('heavy module loaded: ' + request);
        }
        return originalLoad.call(this, request, parent, isMain);
      };
      process.argv = [process.execPath, './bin/fnos', '__complete', 'server'];
      require('./bin/fnos');
      process.stdout.write('FAST_PATH_OK');
    `;
    try {
      const result = spawnSync(process.execPath, ['-e', script], {
        cwd: path.resolve(__dirname, '../..'),
        env: { ...process.env, HOME: homeDir },
        encoding: 'utf8'
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, 'FAST_PATH_OK');
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it('prints names without leaking real settings fields', () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-complete-secret-'));
    const settingsDir = path.join(homeDir, '.fnos');
    fs.mkdirSync(settingsDir);
    fs.writeFileSync(path.join(settingsDir, 'settings.json'), JSON.stringify({
      servers: {
        office: {
          endpoint: 'ENDPOINT_COMPLETION_SENTINEL',
          username: 'USERNAME_COMPLETION_SENTINEL',
          password: 'PASSWORD_COMPLETION_SENTINEL',
          token: 'TOKEN_COMPLETION_SENTINEL'
        }
      }
    }));
    try {
      const result = spawnSync(
        process.execPath,
        [path.resolve(__dirname, '../../bin/fnos'), '__complete', 'server'],
        { env: { ...process.env, HOME: homeDir }, encoding: 'utf8' }
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, 'office\n');
      assert.equal(result.stderr, '');
      assert.doesNotMatch(result.stdout, /COMPLETION_SENTINEL/);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 6: Run the runtime test and verify the module is absent**

Run:

```bash
npx mocha test/unit/completion-runtime.test.js
```

Expected: FAIL with `Cannot find module '../../src/completion/runtime'`.

- [ ] **Step 7: Implement the runtime and executable dispatch**

Create `src/completion/runtime.js`:

```js
const settings = require('../utils/settings');

function runCompletion(args, dependencies = {}) {
  const settingsStore = dependencies.settingsStore || settings;
  const stdout = dependencies.stdout || process.stdout;
  const stderr = dependencies.stderr || process.stderr;
  if (args.length !== 1 || args[0] !== 'server') {
    stderr.write('Error: unsupported completion request.\n');
    return 2;
  }
  try {
    const names = settingsStore.listServerNamesReadOnly();
    if (names.length > 0) stdout.write(`${names.join('\n')}\n`);
  } catch {
    return 0;
  }
  return 0;
}

module.exports = { runCompletion };
```

Replace `bin/fnos` with an early branch that does not import `../src` on the internal path:

```js
#!/usr/bin/env node

const args = process.argv.slice(2);

if (args[0] === '__complete') {
  const { runCompletion } = require('../src/completion/runtime');
  process.exitCode = runCompletion(args.slice(1));
} else {
  require('../src').main().catch((error) => {
    const { errorMessage } = require('../src/utils/errors');
    console.error(`Error: ${errorMessage(error)}`);
    process.exitCode = error.exitCode || 1;
  });
}
```

- [ ] **Step 8: Run runtime, settings, selector, and program tests**

Run:

```bash
npx mocha test/unit/completion-runtime.test.js test/unit/settings.test.js test/unit/server-selector.test.js test/unit/program.test.js
```

Expected: PASS with the published bin still executable and normal commands still using the full CLI.

- [ ] **Step 9: Commit the lightweight runtime deliverable**

```bash
git add bin/fnos src/completion/runtime.js src/utils/settings.js src/utils/server-selector.js test/unit/completion-runtime.test.js test/unit/settings.test.js test/unit/server-selector.test.js
git commit -m "feat: add lightweight server completion runtime"
```

---

### Task 3: Build a shell-independent completion model

**Files:**
- Create: `src/completion/spec.js`
- Create: `test/unit/completion-spec.test.js`

**Interfaces:**
- Consumes: `getCompletion(target)` from Task 1.
- Produces: `buildCompletionSpec(program) -> CommandSpec`.
- `CommandSpec` fields are exactly `name`, `description`, `path`, `options`, `arguments`, and `commands`.
- `OptionSpec` fields are exactly `flags`, `short`, `long`, `description`, `requiredValue`, `optionalValue`, `variadic`, `mandatory`, and `completion`.
- `ArgumentSpec` fields are exactly `name`, `description`, `required`, `variadic`, and `completion`.
- Task 4 renders only this public object shape and never reads Commander internals.

- [ ] **Step 1: Write failing model tests for real and nested commands**

Create `test/unit/completion-spec.test.js`:

```js
const assert = require('node:assert/strict');
const { Argument, Command } = require('commander');
const { describe, it } = require('mocha');
const { createProgram } = require('../../src');
const { fixedValues, withCompletion } = require('../../src/completion/metadata');
const { buildCompletionSpec } = require('../../src/completion/spec');

function findCommand(node, name) {
  return node.commands.find((command) => command.name === name);
}

describe('completion specification', () => {
  it('includes visible command options, global options, and value metadata', () => {
    const spec = buildCompletionSpec(createProgram());
    const docker = findCommand(spec, 'docker.listContainers');
    const byLong = Object.fromEntries(docker.options.map((option) => [option.long, option]));
    assert.ok(byLong['--raw']);
    assert.ok(byLong['--help']);
    assert.deepEqual(byLong['--all'].completion, {
      kind: 'values', values: ['true', 'false']
    });
    assert.deepEqual(byLong['--server'].completion, { kind: 'server' });
  });

  it('omits hidden legacy spellings', () => {
    const spec = buildCompletionSpec(createProgram());
    const network = findCommand(spec, 'network.getInfo');
    assert.equal(network.options.some((option) => option.long === '--ifName'), false);
    assert.equal(network.options.some((option) => option.long === '--if-name'), true);
  });

  it('recursively models child commands and annotated arguments', () => {
    const program = new Command('fnos').option('--global', 'Global option');
    const completion = program.command('completion').description('Generate completion');
    completion.addArgument(withCompletion(
      new Argument('[shell]', 'Shell name'),
      fixedValues(['zsh'])
    ));
    const install = completion.command('install').description('Install completion');
    install.addArgument(withCompletion(
      new Argument('<shell>', 'Shell name'),
      fixedValues(['zsh'])
    ));

    const spec = buildCompletionSpec(program);
    const completionSpec = findCommand(spec, 'completion');
    const installSpec = findCommand(completionSpec, 'install');
    assert.deepEqual(completionSpec.path, ['completion']);
    assert.deepEqual(installSpec.path, ['completion', 'install']);
    assert.deepEqual(completionSpec.arguments[0].completion.values, ['zsh']);
    assert.deepEqual(installSpec.arguments[0].completion.values, ['zsh']);
    assert.ok(installSpec.options.some((option) => option.long === '--global'));
  });
});
```

- [ ] **Step 2: Run the model test and verify the module is absent**

Run:

```bash
npx mocha test/unit/completion-spec.test.js
```

Expected: FAIL with `Cannot find module '../../src/completion/spec'`.

- [ ] **Step 3: Implement normalized option and argument conversion**

Create `src/completion/spec.js` with public Commander help APIs so implicit `--help` is included and hidden options are excluded:

```js
const { getCompletion } = require('./metadata');

function optionKey(option) {
  return option.long || option.short || option.flags;
}

function mergeOptions(...groups) {
  const merged = new Map();
  for (const option of groups.flat()) merged.set(optionKey(option), option);
  return [...merged.values()];
}

function optionSpec(option) {
  return {
    flags: option.flags,
    short: option.short || null,
    long: option.long || null,
    description: option.description || '',
    requiredValue: Boolean(option.required),
    optionalValue: Boolean(option.optional),
    variadic: Boolean(option.variadic),
    mandatory: Boolean(option.mandatory),
    completion: getCompletion(option)
  };
}

function argumentSpec(argument) {
  return {
    name: argument.name(),
    description: argument.description || '',
    required: Boolean(argument.required),
    variadic: Boolean(argument.variadic),
    completion: getCompletion(argument)
  };
}
```

- [ ] **Step 4: Implement recursive command conversion**

Continue `src/completion/spec.js`:

```js
function visibleOptions(command) {
  return command.createHelp().visibleOptions(command);
}

function visibleCommands(command) {
  return command.createHelp().visibleCommands(command);
}

function commandSpec(command, rootOptions, path = []) {
  const isRoot = path.length === 0;
  const options = isRoot
    ? visibleOptions(command)
    : mergeOptions(rootOptions, visibleOptions(command));
  return {
    name: command.name(),
    description: command.description(),
    path,
    options: options.map(optionSpec),
    arguments: command.registeredArguments.map(argumentSpec),
    commands: visibleCommands(command).map((child) =>
      commandSpec(child, rootOptions, [...path, child.name()]))
  };
}

function buildCompletionSpec(program) {
  const rootOptions = visibleOptions(program);
  return commandSpec(program, rootOptions);
}

module.exports = { buildCompletionSpec };
```

- [ ] **Step 5: Run model and option metadata tests**

Run:

```bash
npx mocha test/unit/completion-spec.test.js test/unit/completion-metadata.test.js test/unit/command-options.test.js
```

Expected: PASS. Inspect the failure if the installed Commander minor exposes a help option differently; keep use of `visibleOptions` and do not read `_helpOption` directly.

- [ ] **Step 6: Commit the model deliverable**

```bash
git add src/completion/spec.js test/unit/completion-spec.test.js
git commit -m "feat: build shell completion model"
```

---

### Task 4: Render source and autoload zsh completion scripts

**Files:**
- Create: `src/completion/zsh.js`
- Create: `test/unit/completion-zsh.test.js`

**Interfaces:**
- Consumes: the exact `CommandSpec` shape from Task 3.
- Produces: `renderZsh(spec, { format, version }) -> string`, where `format` is `source` or `autoload`.
- Produces: `quoteZsh(value) -> single-quoted zsh token` and `escapeZshSpecText(value) -> escaped `_arguments` text` for direct unit testing.
- The source format defines `_fnos` and ends with guarded `compdef _fnos fnos` registration.
- The autoload format starts with `#compdef fnos`, places the generated marker on line 2, redefines `_fnos` after first load, and dispatches the first completion request.

- [ ] **Step 1: Write failing renderer, quoting, and syntax tests**

Create `test/unit/completion-zsh.test.js`. Use a compact fixture with root options, one business command, and nested completion commands:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, describe, it } = require('mocha');
const { createProgram } = require('../../src');
const { buildCompletionSpec } = require('../../src/completion/spec');
const {
  escapeZshSpecText,
  quoteZsh,
  renderZsh
} = require('../../src/completion/zsh');

const temporaryDirectories = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function sampleSpec() {
  const globalOptions = [{
    flags: '--raw', short: null, long: '--raw', description: 'Raw output',
    requiredValue: false, optionalValue: false, variadic: false,
    mandatory: false, completion: null
  }];
  const server = {
    flags: '-s, --server <name>', short: '-s', long: '--server',
    description: 'Saved server', requiredValue: true, optionalValue: false,
    variadic: false, mandatory: false, completion: { kind: 'server' }
  };
  const all = {
    flags: '--all <boolean>', short: null, long: '--all', description: 'All rows',
    requiredValue: true, optionalValue: false, variadic: false,
    mandatory: false, completion: { kind: 'values', values: ['true', 'false'] }
  };
  return {
    name: 'fnos', description: 'CLI', path: [], options: globalOptions, arguments: [],
    commands: [{
      name: 'docker.listContainers', description: "List container's [state]",
      path: ['docker.listContainers'], options: [...globalOptions, server, all],
      arguments: [], commands: []
    }]
  };
}

describe('zsh completion renderer', () => {
  it('quotes shell tokens and arguments syntax independently', () => {
    assert.equal(quoteZsh("can't\nexpand $HOME"), "'can'\\''t\\nexpand $HOME'");
    assert.equal(escapeZshSpecText('a[b]:c\\d'), 'a\\[b\\]\\:c\\\\d');
  });

  it('renders source and autoload formats with the required header order', () => {
    const source = renderZsh(sampleSpec(), { format: 'source', version: '0.3.0' });
    const autoload = renderZsh(sampleSpec(), { format: 'autoload', version: '0.3.0' });
    assert.match(source, /_fnos\(\)/);
    assert.match(source, /compdef _fnos fnos/);
    assert.equal(autoload.split('\n')[0], '#compdef fnos');
    assert.equal(
      autoload.split('\n')[1],
      '# Generated by fnos-cli 0.3.0; DO NOT EDIT.'
    );
    assert.match(autoload, /docker\.listContainers/);
    assert.match(autoload, /true false/);
    assert.equal((autoload.match(/command fnos __complete server/g) || []).length, 1);
  });

  it('renders the full program below the defensive size ceiling', () => {
    const script = renderZsh(buildCompletionSpec(createProgram()), {
      format: 'autoload', version: '0.3.0'
    });
    assert.match(script, /sysinfo\.getHostName/);
    assert.match(script, /docker\.listContainers/);
    assert.match(script, /\(-s --server\)-s/);
    assert.match(script, /\(-s --server\)--server/);
    assert.doesNotMatch(script, /_files/);
    assert.doesNotMatch(script, /\beval\b/);
    const functionNames = [...script.matchAll(/^(_fnos[A-Za-z0-9_]*)\(\)/gm)]
      .map((match) => match[1]);
    assert.equal(new Set(functionNames).size, functionNames.length);
    assert.ok(Buffer.byteLength(script) < 256 * 1024);
  });

  it('passes zsh syntax checking when zsh is installed', function () {
    for (const format of ['source', 'autoload']) {
      const script = renderZsh(sampleSpec(), { format, version: '0.3.0' });
      const result = spawnSync('zsh', ['-n'], { input: script, encoding: 'utf8' });
      if (result.error?.code === 'ENOENT') this.skip();
      assert.equal(result.status, 0, result.stderr);
    }
  });

  it('registers source and autoload formats with compinit', function () {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-zsh-register-'));
    temporaryDirectories.push(directory);
    const sourcePath = path.join(directory, 'fnos-source.zsh');
    const autoloadPath = path.join(directory, '_fnos');
    fs.writeFileSync(sourcePath, renderZsh(sampleSpec(), {
      format: 'source', version: '0.3.0'
    }));
    fs.writeFileSync(autoloadPath, renderZsh(sampleSpec(), {
      format: 'autoload', version: '0.3.0'
    }));

    const sourceResult = spawnSync('zsh', [
      '-dfc',
      'autoload -Uz compinit; compinit -d "$1"; source "$2"; whence -w _fnos',
      'zsh', path.join(directory, 'source.zcompdump'), sourcePath
    ], { encoding: 'utf8' });
    if (sourceResult.error?.code === 'ENOENT') this.skip();
    assert.equal(sourceResult.status, 0, sourceResult.stderr);
    assert.match(sourceResult.stdout, /_fnos: function/);

    const autoloadResult = spawnSync('zsh', [
      '-dfc',
      'fpath=("$1" $fpath); autoload -Uz compinit; compinit -d "$2"; whence -w _fnos',
      'zsh', directory, path.join(directory, 'autoload.zcompdump')
    ], { encoding: 'utf8' });
    assert.equal(autoloadResult.status, 0, autoloadResult.stderr);
    assert.match(autoloadResult.stdout, /_fnos: function/);
  });
});
```

- [ ] **Step 2: Run the renderer test and verify the module is absent**

Run:

```bash
npx mocha test/unit/completion-zsh.test.js
```

Expected: FAIL with `Cannot find module '../../src/completion/zsh'`.

- [ ] **Step 3: Implement separate shell and `_arguments` escaping**

Create `src/completion/zsh.js` with control-character normalization before single-quote escaping:

```js
function visibleText(value) {
  return String(value).replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

function quoteZsh(value) {
  return `'${visibleText(value).replace(/'/g, `'\\''`)}'`;
}

function escapeZshSpecText(value) {
  return visibleText(value).replace(/[\\[\]:]/g, '\\$&');
}

function functionName(path) {
  if (path.length === 0) return '_fnos_root';
  const suffix = Buffer.from(path.join('\0'), 'utf8').toString('hex');
  return `_fnos_node_${suffix}`;
}
```

Use `escapeZshSpecText` before `quoteZsh` for every `_arguments` specification and
every `name:description` entry passed to `_describe`.

- [ ] **Step 4: Implement option value actions and server cache helpers**

Generate option specs with these exact rules:

```js
function optionAction(option) {
  if (!option.requiredValue && !option.optionalValue) return '';
  const labelMatch = option.flags.match(/[<[[]([^>\]]+)[>\]]/);
  const label = escapeZshSpecText(labelMatch?.[1] || 'value');
  const separator = option.optionalValue ? '::' : ':';
  if (option.completion?.kind === 'server') {
    return `${separator}${label}:->fnos_servers`;
  }
  if (option.completion?.kind === 'values') {
    const values = option.completion.values.map(escapeZshSpecText).join(' ');
    return `${separator}${label}:(${values})`;
  }
  return `${separator}${label}:`;
}

function renderOptionSpecs(option) {
  const names = [option.short, option.long].filter(Boolean);
  const exclusion = names.join(' ');
  const repeat = option.variadic ? '*' : '';
  const description = escapeZshSpecText(option.description);
  const action = optionAction(option);
  return names.map((name) =>
    `${repeat}(${exclusion})${name}[${description}]${action}`);
}
```

Render short and long names as separate `_arguments` specifications inside one mutual-
exclusion group. Do not put zsh brace expansion inside a single-quoted token; quoted brace
syntax would not expand and would produce an invalid candidate.

Define a module constant named `SERVER_HELPERS` containing the following exact zsh block,
and render it once per script. It must use an inode/size/mtime key, call the internal CLI
only after a cache miss, and bypass aliases with `command`:

```zsh
typeset -ga _fnos_server_cache
typeset -g _fnos_server_cache_key=''

_fnos_settings_key() {
  zmodload -F zsh/stat b:zstat 2>/dev/null || return 1
  local -A details
  if ! zstat -H details -- "$HOME/.fnos/settings.json" 2>/dev/null; then
    REPLY='missing'
    return 0
  fi
  REPLY="${details[inode]}:${details[size]}:${details[mtime]}"
}

_fnos_complete_servers() {
  local key
  if ! _fnos_settings_key; then
    local -a uncached
    uncached=("${(@f)$(command fnos __complete server 2>/dev/null)}")
    (( ${#uncached} )) && compadd -- "${uncached[@]}"
    return
  fi
  key="$REPLY"
  if [[ "$key" != "$_fnos_server_cache_key" ]]; then
    _fnos_server_cache=("${(@f)$(command fnos __complete server 2>/dev/null)}")
    _fnos_server_cache_key="$key"
  fi
  (( ${#_fnos_server_cache} )) && compadd -- "${_fnos_server_cache[@]}"
}
```

Store the block in a normal JavaScript template literal and prefix every zsh `${` sequence
with a single backslash in JavaScript source. Template-literal escaping removes that
backslash from the resulting zsh text while preventing Node from interpolating it.

- [ ] **Step 5: Implement recursive command-node rendering**

Flatten the `CommandSpec` tree, generate one zsh function per node, and use the node path
to assign positional indices. Each function must:

1. declare `context`, `state`, `state_descr`, `line`, and `opt_args`;
2. include fixed ancestor command positions, such as `1:command:(completion)`;
3. include all effective option specs from the node model;
4. merge the next positional argument's fixed values with visible child commands;
5. add `*::argument:->fnos_dispatch` whenever child dispatch remains possible;
6. call `_fnos_complete_servers` for `state=fnos_servers`;
7. dispatch a selected child by its exact escaped name.

Use these concrete generator helpers rather than hand-writing a 111-command case block:

```js
function flatten(node) {
  return [node, ...node.commands.flatMap(flatten)];
}

function childCandidates(node) {
  return node.commands.map((child) => ({
    value: child.name,
    description: child.description,
    functionName: functionName(child.path)
  }));
}

function fixedArgumentCandidates(argument) {
  if (argument?.completion?.kind !== 'values') return [];
  return argument.completion.values.map((value) => ({
    value,
    description: argument.description,
    functionName: null
  }));
}

function mergeCandidates(...groups) {
  const merged = new Map();
  for (const candidate of groups.flat()) {
    if (!merged.has(candidate.value)) merged.set(candidate.value, candidate);
  }
  return [...merged.values()];
}

function candidateEntry(candidate) {
  return quoteZsh(
    `${escapeZshSpecText(candidate.value)}:` +
    escapeZshSpecText(candidate.description || candidate.value)
  );
}
```

For the root, position 1 offers child commands. For a node at path depth `d`, ancestor
commands occupy positions 1 through `d`, and the node's first argument or child occupies
position `d + 1`. Render candidate arrays as quoted `value:description` pairs and select
them with `_describe`. Render child dispatch as a `case` on `line[d + 1]`; do not use
`eval` or shell-generated function names.

Implement the node generator with explicit candidate states and literal child cases:

```js
function renderCandidateCase(stateName, label, candidates) {
  const entries = candidates
    .map((candidate) => '        ' + candidateEntry(candidate))
    .join('\n');
  return [
    '    ' + stateName + ')',
    '      local -a candidates',
    '      candidates=(',
    entries,
    '      )',
    '      _describe ' + quoteZsh(label) + ' candidates',
    '      ;;'
  ].join('\n');
}

function renderNodeFunction(node) {
  const specs = [];
  const cases = [];
  const depth = node.path.length;
  for (const option of node.options) specs.push(...renderOptionSpecs(option));
  node.path.forEach((name, index) => {
    specs.push(
      String(index + 1) + ':command:(' + escapeZshSpecText(name) + ')'
    );
  });

  const children = childCandidates(node);
  node.arguments.forEach((argument, index) => {
    const position = depth + index + 1;
    const values = fixedArgumentCandidates(argument);
    const candidates = index === 0
      ? mergeCandidates(children, values)
      : values;
    const label = argument.description || argument.name;
    if (candidates.length === 0) {
      const repeat = argument.variadic ? '*' : '';
      specs.push(
        repeat + String(position) + ':' + escapeZshSpecText(label) + ':'
      );
      return;
    }
    const stateName = 'fnos_values_' + String(position);
    specs.push(
      String(position) + ':' + escapeZshSpecText(label) + ':->' + stateName
    );
    cases.push(renderCandidateCase(stateName, label, candidates));
  });

  if (node.arguments.length === 0 && children.length > 0) {
    const position = depth + 1;
    const stateName = 'fnos_values_' + String(position);
    specs.push(String(position) + ':command:->' + stateName);
    cases.push(renderCandidateCase(stateName, 'command', children));
  }

  if (node.options.some((option) => option.completion?.kind === 'server')) {
    cases.push('    fnos_servers)\n      _fnos_complete_servers\n      ;;');
  }
  if (children.length > 0) {
    const childPosition = depth + 1;
    specs.push('*::argument:->fnos_dispatch');
    const branches = children.map((child) =>
      '        ' + quoteZsh(child.value) + ') ' +
      child.functionName + ' "$@" ;;'
    ).join('\n');
    cases.push([
      '    fnos_dispatch)',
      '      case "${line[' + String(childPosition) + ']}" in',
      branches,
      '      esac',
      '      ;;'
    ].join('\n'));
  }

  const argumentsBlock = specs
    .map((spec) => '    ' + quoteZsh(spec))
    .join(' \\' + '\n');
  const lines = [
    functionName(node.path) + '() {',
    '  local context state state_descr line',
    '  typeset -A opt_args',
    '  _arguments -C \\',
    argumentsBlock + ' && return 0'
  ];
  if (cases.length > 0) {
    lines.push('  case "$state" in', cases.join('\n'), '  esac');
  }
  lines.push('}');
  return lines.join('\n');
}
```

Add a unit assertion that every function name in a full render is unique; hexadecimal path
encoding prevents collisions between names such as foo.bar and foo_bar. The generated
source must contain no eval call.

The main source-format footer is:

```zsh
_fnos() {
  _fnos_root "$@"
}
if (( $+functions[compdef] )); then
  compdef _fnos fnos
else
  print -u2 'fnos completion: initialize compinit before evaluating this script.'
fi
```

The autoload footer is:

```zsh
_fnos() {
  _fnos_root "$@"
}
_fnos_root "$@"
```

The second form serves the first autoload invocation immediately and uses the redefined
`_fnos` on subsequent invocations.

Assemble the final output with one trailing newline and validate the requested format:

```js
function renderZsh(spec, options = {}) {
  const format = options.format || 'source';
  const version = options.version || 'unknown';
  if (!['source', 'autoload'].includes(format)) {
    throw new TypeError(`Unsupported zsh completion format: ${format}`);
  }
  const definitions = flatten(spec)
    .map((node) => renderNodeFunction(node))
    .join('\n\n');
  const common = `${SERVER_HELPERS}\n\n${definitions}\n\n` +
    `_fnos() {\n  _fnos_root "$@"\n}`;
  if (format === 'source') {
    return `${common}\n` +
      `if (( $+functions[compdef] )); then\n` +
      `  compdef _fnos fnos\n` +
      `else\n` +
      `  print -u2 'fnos completion: initialize compinit before evaluating this script.'\n` +
      `fi\n`;
  }
  return `#compdef fnos\n` +
    `# Generated by fnos-cli ${version}; DO NOT EDIT.\n` +
    `${common}\n_fnos_root "$@"\n`;
}

module.exports = { escapeZshSpecText, quoteZsh, renderZsh };
```

- [ ] **Step 6: Run renderer tests and fix only concrete syntax/behavior failures**

Run:

```bash
npx mocha test/unit/completion-zsh.test.js
```

Expected: PASS. If zsh rejects a generated `_arguments` spec, inspect the exact generated
line and extend `escapeZshSpecText`; do not weaken the syntax test.

- [ ] **Step 7: Add an executable cache invalidation test**

Extend `test/unit/completion-zsh.test.js` with a test that creates:

- a temporary `bin/fnos` shell stub which appends one line to a counter and prints two names;
- a temporary `.fnos/settings.json`;
- a source-format script;
- a zsh process that stubs `compdef` and `compadd`, sources the script, calls
  `_fnos_complete_servers` twice, atomically replaces settings, and calls it a third time.

Use this concrete test body:

```js
it('caches server names until settings is atomically replaced', function () {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-zsh-cache-'));
  temporaryDirectories.push(directory);
  const binDir = path.join(directory, 'bin');
  const homeDir = path.join(directory, 'home');
  const settingsDir = path.join(homeDir, '.fnos');
  const counterPath = path.join(directory, 'count');
  const argumentsPath = path.join(directory, 'arguments');
  const scriptPath = path.join(directory, 'completion.zsh');
  fs.mkdirSync(binDir);
  fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(path.join(settingsDir, 'settings.json'), '{}\n');
  fs.writeFileSync(path.join(binDir, 'fnos'), [
    '#!/bin/sh',
    'printf "%s\\n" "$*" >> "$FNOS_ARGUMENTS"',
    'printf "call\\n" >> "$FNOS_COUNTER"',
    'printf "default\\noffice\\n"'
  ].join('\n'));
  fs.chmodSync(path.join(binDir, 'fnos'), 0o755);
  fs.writeFileSync(scriptPath, renderZsh(sampleSpec(), {
    format: 'source', version: '0.3.0'
  }));

  const code = [
    'compdef() { :; }',
    'compadd() { :; }',
    'source "$1"',
    '_fnos_complete_servers',
    '_fnos_complete_servers',
    'cp "$HOME/.fnos/settings.json" "$HOME/.fnos/settings.next"',
    'mv "$HOME/.fnos/settings.next" "$HOME/.fnos/settings.json"',
    '_fnos_complete_servers'
  ].join('\n');
  const result = spawnSync('zsh', ['-dfc', code, 'zsh', scriptPath], {
    env: {
      ...process.env,
      HOME: homeDir,
      PATH: `${binDir}:${process.env.PATH}`,
      FNOS_COUNTER: counterPath,
      FNOS_ARGUMENTS: argumentsPath
    },
    encoding: 'utf8'
  });
  if (result.error?.code === 'ENOENT') this.skip();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(counterPath, 'utf8').trim().split('\n').length, 2);
  assert.deepEqual(
    fs.readFileSync(argumentsPath, 'utf8').trim().split('\n'),
    ['__complete server', '__complete server']
  );
});
```

Also assert that the fake command receives exactly `__complete server` on both invocations.

- [ ] **Step 8: Run renderer and full model tests**

Run:

```bash
npx mocha test/unit/completion-zsh.test.js test/unit/completion-spec.test.js
```

Expected: PASS with two dynamic invocations across three calls and no dynamic invocation
for static command/option rendering.

- [ ] **Step 9: Commit the renderer deliverable**

```bash
git add src/completion/zsh.js test/unit/completion-zsh.test.js
git commit -m "feat: render zsh completion scripts"
```

---

### Task 5: Install zsh completion safely and atomically

**Files:**
- Create: `src/completion/installer.js`
- Create: `test/unit/completion-installer.test.js`

**Interfaces:**
- Consumes: an already-rendered autoload script whose first line is `#compdef fnos` and second line starts with `# Generated by fnos-cli `.
- Produces: `installZshCompletion(content, dependencies) -> absolute target path`.
- `dependencies` supports `homeDir`, `fsImpl`, and `randomId` for deterministic tests.
- Produces: `CompletionInstallError` with `exitCode = 4`.

- [ ] **Step 1: Write failing installer tests**

Create `test/unit/completion-installer.test.js` with temporary homes. Cover installation,
safe replacement, foreign-file refusal, symlink refusal, and rename failure:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, describe, it } = require('mocha');
const {
  CompletionInstallError,
  installZshCompletion
} = require('../../src/completion/installer');

const homes = [];
afterEach(() => {
  for (const home of homes.splice(0)) fs.rmSync(home, { recursive: true, force: true });
});

function home() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-completion-install-'));
  homes.push(directory);
  return directory;
}

const content = '#compdef fnos\n# Generated by fnos-cli 0.3.0; DO NOT EDIT.\n_arguments\n';

describe('zsh completion installer', () => {
  it('installs and replaces generated files without touching zshrc', () => {
    const homeDir = home();
    const zshrc = path.join(homeDir, '.zshrc');
    fs.writeFileSync(zshrc, '# user config\n');
    const target = installZshCompletion(content, {
      homeDir,
      randomId: () => 'first'
    });
    assert.equal(target, path.join(homeDir, '.fnos/completions/_fnos'));
    assert.equal(fs.readFileSync(target, 'utf8'), content);
    assert.equal(fs.readFileSync(zshrc, 'utf8'), '# user config\n');
    assert.equal(fs.statSync(path.dirname(target)).mode & 0o777, 0o700);
    assert.equal(fs.statSync(target).mode & 0o777, 0o644);
    assert.equal(installZshCompletion(content.replace('0.3.0', '0.4.0'), {
      homeDir,
      randomId: () => 'second'
    }), target);
  });

  it('refuses to overwrite a foreign regular file', () => {
    const homeDir = home();
    const target = path.join(homeDir, '.fnos/completions/_fnos');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '# user file\n');
    assert.throws(
      () => installZshCompletion(content, { homeDir, randomId: () => 'foreign' }),
      (error) => error instanceof CompletionInstallError && error.exitCode === 4
    );
    assert.equal(fs.readFileSync(target, 'utf8'), '# user file\n');
  });
});
```

Add these two concrete tests for link refusal and replacement failure:

```js
it('refuses a symbolic-link target', function () {
  if (process.platform === 'win32') this.skip();
  const homeDir = home();
  const completionDir = path.join(homeDir, '.fnos/completions');
  const foreign = path.join(homeDir, 'foreign');
  const target = path.join(completionDir, '_fnos');
  fs.mkdirSync(completionDir, { recursive: true });
  fs.writeFileSync(foreign, content);
  fs.symlinkSync(foreign, target);
  assert.throws(
    () => installZshCompletion(content, { homeDir, randomId: () => 'link' }),
    (error) => error instanceof CompletionInstallError && /non-regular/.test(error.message)
  );
  assert.equal(fs.readFileSync(foreign, 'utf8'), content);
});

it('refuses a symbolic-link completion directory', function () {
  if (process.platform === 'win32') this.skip();
  const homeDir = home();
  const settingsDir = path.join(homeDir, '.fnos');
  const foreignDirectory = path.join(homeDir, 'foreign-directory');
  fs.mkdirSync(settingsDir);
  fs.mkdirSync(foreignDirectory);
  fs.symlinkSync(foreignDirectory, path.join(settingsDir, 'completions'));
  assert.throws(
    () => installZshCompletion(content, { homeDir, randomId: () => 'dir-link' }),
    (error) => error instanceof CompletionInstallError && /non-directory/.test(error.message)
  );
  assert.deepEqual(fs.readdirSync(foreignDirectory), []);
});

it('preserves the old file and removes the temporary file when rename fails', () => {
  const homeDir = home();
  const target = installZshCompletion(content, {
    homeDir,
    randomId: () => 'initial'
  });
  const fsImpl = Object.create(fs);
  fsImpl.renameSync = () => { throw new Error('rename failed'); };
  assert.throws(
    () => installZshCompletion(content.replace('0.3.0', '0.4.0'), {
      homeDir,
      fsImpl,
      randomId: () => 'failed'
    }),
    (error) => error instanceof CompletionInstallError
  );
  assert.equal(fs.readFileSync(target, 'utf8'), content);
  assert.deepEqual(
    fs.readdirSync(path.dirname(target)).filter((name) => name.endsWith('.tmp')),
    []
  );
});
```

- [ ] **Step 2: Run the installer test and verify the module is absent**

Run:

```bash
npx mocha test/unit/completion-installer.test.js
```

Expected: FAIL with `Cannot find module '../../src/completion/installer'`.

- [ ] **Step 3: Implement validation and private directories**

Create `src/completion/installer.js`:

```js
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const os = require('node:os');
const path = require('node:path');

const GENERATED_PREFIX = '#compdef fnos\n# Generated by fnos-cli ';

class CompletionInstallError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CompletionInstallError';
    this.exitCode = 4;
  }
}

function ensureDirectory(directory, fsImpl) {
  if (fsImpl.existsSync(directory)) {
    const stat = fsImpl.lstatSync(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new CompletionInstallError(`Refusing non-directory completion path: ${directory}`);
    }
  } else {
    fsImpl.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  fsImpl.chmodSync(directory, 0o700);
}
```

- [ ] **Step 4: Implement ownership checks and atomic replacement**

Continue `src/completion/installer.js`:

```js
function installZshCompletion(content, dependencies = {}) {
  const fsImpl = dependencies.fsImpl || fs;
  const homeDir = dependencies.homeDir || os.homedir();
  const randomId = dependencies.randomId || randomUUID;
  const settingsDir = path.join(homeDir, '.fnos');
  const completionDir = path.join(settingsDir, 'completions');
  const target = path.join(completionDir, '_fnos');
  let temporary;
  try {
    if (!content.startsWith(GENERATED_PREFIX)) {
      throw new CompletionInstallError(
        'Refusing to install an invalid fnos completion script.'
      );
    }
    ensureDirectory(settingsDir, fsImpl);
    ensureDirectory(completionDir, fsImpl);
    if (fsImpl.existsSync(target)) {
      const stat = fsImpl.lstatSync(target);
      if (stat.isSymbolicLink() || !stat.isFile()) {
        throw new CompletionInstallError(
          `Refusing non-regular completion file: ${target}`
        );
      }
      if (!fsImpl.readFileSync(target, 'utf8').startsWith(GENERATED_PREFIX)) {
        throw new CompletionInstallError(
          `Refusing to overwrite non-fnos completion file: ${target}`
        );
      }
    }
    temporary = `${target}.${process.pid}.${randomId()}.tmp`;
    fsImpl.writeFileSync(temporary, content, { mode: 0o644, flag: 'wx' });
    fsImpl.chmodSync(temporary, 0o644);
    fsImpl.renameSync(temporary, target);
    return target;
  } catch (error) {
    if (temporary) {
      try { fsImpl.rmSync(temporary, { force: true }); } catch {}
    }
    if (error instanceof CompletionInstallError) throw error;
    throw new CompletionInstallError(`Failed to install zsh completion at ${target}.`);
  }
}

module.exports = {
  CompletionInstallError,
  GENERATED_PREFIX,
  installZshCompletion
};
```

Do not call `chmodSync(target)` after `renameSync`; all fallible permission work must finish
before replacement, matching the existing settings durability rule.

- [ ] **Step 5: Run installer tests and a direct mode check**

Run:

```bash
npx mocha test/unit/completion-installer.test.js
```

Expected: PASS. On Unix, the installed file is 0644 and both directories are 0700; the
test may skip exact mode assertions on `win32` while keeping content and refusal assertions.

- [ ] **Step 6: Commit the installer deliverable**

```bash
git add src/completion/installer.js test/unit/completion-installer.test.js
git commit -m "feat: install zsh completion scripts"
```

---

### Task 6: Expose public completion commands and integrate the full model

**Files:**
- Create: `src/commands/completion.js`
- Create: `test/unit/completion-commands.test.js`
- Modify: `src/index.js:3-27`
- Modify: `test/unit/program.test.js:14-32`
- Modify: `test/unit/completion-spec.test.js`

**Interfaces:**
- Consumes: `buildCompletionSpec`, `renderZsh`, `installZshCompletion`, and Task 1 argument metadata.
- Produces: `registerCompletionCommand(program, dependencies) -> Command`.
- Command grammar is `fnos completion [shell]` plus child command `fnos completion install <shell>`.
- Supported shell validation accepts only the exact value `zsh` and throws `UnsupportedShellError` with `exitCode = 4` otherwise.
- Dependency injection keys are `renderCompletion`, `installCompletion`, `completionOutput`, `stdout`, and `stderr`.

- [ ] **Step 1: Write failing command registration tests**

Create `test/unit/completion-commands.test.js`:

```js
const assert = require('node:assert/strict');
const { afterEach, describe, it } = require('mocha');
const { createProgram } = require('../../src');

afterEach(() => { process.exitCode = undefined; });

describe('completion commands', () => {
  it('renders zsh source output from the complete program', async () => {
    const writes = [];
    let renderedProgram;
    const program = createProgram({
      renderCompletion(currentProgram, format) {
        renderedProgram = currentProgram;
        assert.equal(format, 'source');
        return '# source script\n';
      },
      completionOutput: { write: (value) => writes.push(value) }
    });
    await program.parseAsync(['node', 'fnos', 'completion', 'zsh']);
    assert.equal(renderedProgram, program);
    assert.deepEqual(writes, ['# source script\n']);
    assert.equal(process.exitCode || 0, 0);
  });

  it('renders and installs the autoload format explicitly', async () => {
    const messages = [];
    const installs = [];
    const program = createProgram({
      renderCompletion: (_program, format) => {
        assert.equal(format, 'autoload');
        return '#compdef fnos\n# Generated by fnos-cli 0.3.0; DO NOT EDIT.\n';
      },
      installCompletion: (content) => {
        installs.push(content);
        return '/tmp/home/.fnos/completions/_fnos';
      },
      stdout: (value) => messages.push(value)
    });
    await program.parseAsync(['node', 'fnos', 'completion', 'install', 'zsh']);
    assert.equal(installs.length, 1);
    assert.match(messages.join('\n'), /\.fnos\/completions\/_fnos/);
    assert.match(messages.join('\n'), /fpath=/);
  });

  it('rejects unsupported shells without writing a script', async () => {
    const errors = [];
    const writes = [];
    const program = createProgram({
      completionOutput: { write: (value) => writes.push(value) },
      stderr: (value) => errors.push(value)
    });
    await program.parseAsync(['node', 'fnos', 'completion', 'bash']);
    assert.equal(process.exitCode, 4);
    assert.deepEqual(writes, []);
    assert.match(errors.join('\n'), /unsupported shell "bash"; supported shells: zsh/i);
  });
});
```

- [ ] **Step 2: Run the command test and verify registration is missing**

Run:

```bash
npx mocha test/unit/completion-commands.test.js
```

Expected: FAIL because `completion` is an unknown command.

- [ ] **Step 3: Implement the public command module**

Create `src/commands/completion.js`:

```js
const { Argument } = require('commander');
const { version } = require('../../package.json');
const { fixedValues, withCompletion } = require('../completion/metadata');
const { buildCompletionSpec } = require('../completion/spec');
const { renderZsh } = require('../completion/zsh');
const { installZshCompletion } = require('../completion/installer');
const { errorMessage } = require('../utils/errors');

class UnsupportedShellError extends Error {
  constructor(shell) {
    super(`unsupported shell "${shell}"; supported shells: zsh`);
    this.name = 'UnsupportedShellError';
    this.exitCode = 4;
  }
}

function shellArgument(flags) {
  return withCompletion(
    new Argument(flags, 'Shell name'),
    fixedValues(['zsh'])
  );
}

function requireZsh(shell) {
  if (shell !== 'zsh') throw new UnsupportedShellError(shell);
}
```

Implement registration with distinct raw-script and informational outputs:

```js
function registerCompletionCommand(program, dependencies = {}) {
  const completionOutput = dependencies.completionOutput || process.stdout;
  const stdout = dependencies.stdout || console.log;
  const stderr = dependencies.stderr || console.error;
  const render = dependencies.renderCompletion || ((currentProgram, format) =>
    renderZsh(buildCompletionSpec(currentProgram), { format, version }));
  const installCompletion = dependencies.installCompletion || installZshCompletion;

  const report = (error) => {
    stderr(`Error: ${errorMessage(error)}`);
    process.exitCode = error.exitCode || 1;
  };

  const command = program.command('completion')
    .description('Generate shell completion')
    .addArgument(shellArgument('[shell]'));
  command.action((shell) => {
    if (shell === undefined) {
      command.outputHelp();
      return;
    }
    try {
      requireZsh(shell);
      completionOutput.write(render(program, 'source'));
      process.exitCode = 0;
    } catch (error) {
      report(error);
    }
  });

  const install = command.command('install')
    .description('Install shell completion for the current user')
    .addArgument(shellArgument('<shell>'));
  install.action((shell) => {
    try {
      requireZsh(shell);
      const target = installCompletion(render(program, 'autoload'));
      stdout(
        `Installed zsh completion at ${target}.\n` +
        'Add this before compinit in ~/.zshrc:\n' +
        'fpath=(~/.fnos/completions $fpath)\n' +
        'autoload -Uz compinit\n' +
        'compinit'
      );
      process.exitCode = 0;
    } catch (error) {
      report(error);
    }
  });
  return command;
}

module.exports = { UnsupportedShellError, registerCompletionCommand };
```

- [ ] **Step 4: Register completion in the program**

Import `registerCompletionCommand` in `src/index.js` and call it after logout registration
and before the 111 business commands:

```js
registerLoginCommand(program, dependencies);
registerLogoutCommand(program, dependencies);
registerCompletionCommand(program, dependencies);
registerCommands(program, dependencies);
```

- [ ] **Step 5: Update model and program regression assertions**

In `test/unit/program.test.js`, change the top-level count from 113 to 114, update the test
description, and assert `completion` exists while `__complete` does not.

In `test/unit/completion-spec.test.js`, add an integration test:

```js
it('models the public completion grammar but not the internal runtime', () => {
  const spec = buildCompletionSpec(createProgram());
  const completion = findCommand(spec, 'completion');
  assert.ok(completion);
  assert.deepEqual(completion.arguments[0].completion.values, ['zsh']);
  assert.equal(findCommand(completion, 'install').arguments[0].completion.values[0], 'zsh');
  assert.equal(findCommand(spec, '__complete'), undefined);
});
```

- [ ] **Step 6: Run command, model, renderer, and program tests**

Run:

```bash
npx mocha test/unit/completion-commands.test.js test/unit/completion-spec.test.js test/unit/completion-zsh.test.js test/unit/program.test.js
```

Expected: PASS with 114 public top-level commands and no internal Commander command.

- [ ] **Step 7: Exercise actual generated output through the executable**

Run:

```bash
node bin/fnos completion zsh | zsh -n
```

Expected: exit 0 and no stderr.

Then run:

```bash
node bin/fnos completion bash
```

Expected: exit 4, no script on stdout, and the supported-shell error on stderr.

- [ ] **Step 8: Commit the command integration deliverable**

```bash
git add src/commands/completion.js src/index.js test/unit/completion-commands.test.js test/unit/completion-spec.test.js test/unit/program.test.js
git commit -m "feat: expose zsh completion commands"
```

---

### Task 7: Document, package-check, and verify the completed feature

**Files:**
- Modify: `README.md:8-34,116-156`
- Modify: `CHANGELOG.md:8-15`
- Modify: `.github/workflows/tests.yml:12-45`
- Modify: `test/unit/ci-workflow.test.js:1-20`
- Modify: `test/unit/documentation.test.js:38-51`
- Modify: `test/unit/package-metadata.test.js:15-23` only if the runtime file list expectation needs clarification; the existing `src/` entry already publishes all new modules.

**Interfaces:**
- Consumes: final CLI syntax and paths from Task 6.
- Produces: user instructions that distinguish first install, upgrade refresh, temporary activation, and persistent activation.
- No implementation module consumes this task.

- [ ] **Step 1: Add failing documentation assertions**

Extend `test/unit/documentation.test.js`:

```js
assert.match(readme, /fnos completion install zsh/);
assert.match(readme, /eval "\$\(fnos completion zsh\)"/);
assert.match(readme, /~\/\.fnos\/completions/);
assert.match(readme, /npm update -g fnos-cli/);
assert.match(changelog, /zsh.*Tab.*补全/i);
```

- [ ] **Step 2: Run the documentation test and verify the new text is absent**

Run:

```bash
npx mocha test/unit/documentation.test.js
```

Expected: FAIL on the first completion-related README assertion.

- [ ] **Step 3: Document first installation and persistent activation**

Add a `### zsh Tab 补全` subsection immediately after the npm/source installation block in
`README.md`. Include these exact commands and explain that `.zshrc` is not edited automatically:

```bash
fnos completion install zsh
```

```zsh
fpath=(~/.fnos/completions $fpath)
autoload -Uz compinit
compinit
```

State that `fpath` must be set before an existing framework calls `compinit`; users whose
framework already initializes completion should not invoke `compinit` a second time.

- [ ] **Step 4: Document temporary activation and upgrade refresh**

Add:

```zsh
eval "$(fnos completion zsh)"
```

for the temporary/session path, and:

```bash
npm update -g fnos-cli
fnos completion install zsh
```

for upgrades. Explain that commands/options/boolean/enums are static, while `--server`
names refresh from `~/.fnos/settings.json` without network access.

Update the README feature list and project tree to mention `src/completion/` and the public
completion command.

- [ ] **Step 5: Add the Unreleased changelog entry**

Under `## [Unreleased]` -> `### 新增`, add one bullet stating that zsh Tab completion now
covers commands, options, finite values, and saved server names, with explicit installation.

- [ ] **Step 6: Run documentation and package metadata tests**

Before running the documentation checks, add an explicit zsh installation step to
`.github/workflows/tests.yml` immediately after `actions/setup-node`:

```yaml
      - name: Install zsh for completion tests
        run: sudo apt-get update && sudo apt-get install --yes zsh
```

Add this assertion to `test/unit/ci-workflow.test.js`:

```js
assert.match(workflow, /apt-get install --yes zsh/);
```

Run:

```bash
npx mocha test/unit/documentation.test.js test/unit/package-metadata.test.js test/unit/ci-workflow.test.js
```

Expected: PASS. Do not add individual completion files to `package.json#files`; the existing
`src/` directory entry is the intentional publication boundary.

- [ ] **Step 7: Run all offline unit tests**

Run:

```bash
npm test
```

Expected: all existing 90 tests plus all newly added completion tests pass with 0 failures.

- [ ] **Step 8: Run end-to-end generation and installation checks**

Create a temporary home and run:

```bash
completion_test_home=$(mktemp -d)
node bin/fnos completion zsh | zsh -n
env HOME="$completion_test_home" node bin/fnos completion install zsh
head -n 2 "$completion_test_home/.fnos/completions/_fnos"
zsh -n "$completion_test_home/.fnos/completions/_fnos"
env HOME="$completion_test_home" node bin/fnos __complete server
```

Expected:

- both syntax checks exit 0;
- line 1 is `#compdef fnos`;
- line 2 starts with `# Generated by fnos-cli 0.3.0;`;
- the empty-home server query prints nothing and exits 0;
- the installer prints the target path and `.zshrc` snippet but does not create `.zshrc`.

- [ ] **Step 9: Verify representative Tab interactions in a clean zsh PTY**

Start an interactive zsh with project `bin/` first on PATH and load the installed completion:

```bash
env HOME="$completion_test_home" PATH="$PWD/bin:$PATH" zsh -dfi
```

Inside that PTY, run:

```zsh
fpath=(~/.fnos/completions $fpath)
autoload -Uz compinit
compinit -d ~/.fnos/completion-test.zcompdump
```

Type each line and send a literal Tab at the marked point:

```text
fnos sys<Tab>
fnos docker.listContainers --<Tab>
fnos docker.listContainers --all <Tab>
fnos completion <Tab>
```

Expected: command names, command-specific options, `true`/`false`, and `zsh`/`install`
appear respectively. The automated runtime and cache tests provide the deterministic
`--server` coverage without reading the developer's real settings. Exit the temporary zsh
after recording the observed candidates, then remove only the validated temporary directory:

```bash
test -n "$completion_test_home" && rm -r -- "$completion_test_home"
```

- [ ] **Step 10: Inspect the final diff and commit documentation**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: only the planned source, test, README, and changelog files are changed; there are
no temporary completion scripts in the repository.

Commit:

```bash
git add README.md CHANGELOG.md .github/workflows/tests.yml test/unit/documentation.test.js test/unit/ci-workflow.test.js
git commit -m "docs: document zsh command completion"
```

- [ ] **Step 11: Perform completion verification before declaring success**

Invoke `superpowers:verification-before-completion`, rerun the commands it requires, confirm
`git status --short` is clean, and report the exact test count and zsh syntax results. Do not
create a pull request or merge the branch unless the user separately authorizes that action.
