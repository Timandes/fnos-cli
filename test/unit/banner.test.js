const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, describe } = require('mocha');
const { it, createEnglishProgram: createProgram } = require('../helpers/english');
const sdkLogger = require('fnos/dist/logger').default;

const sdkTransports = [...sdkLogger.transports];

const LOGO_START = '   __        ___  ____     ____ _     ___';

function terminal(dependencies = {}) {
  const writes = [];
  const options = {
    stdoutIsTTY: true,
    stdoutColumns: 80,
    env: { TERM: 'xterm-256color', NO_COLOR: '' },
    stdout: value => writes.push(`${value}\n`),
    stderr: value => writes.push(`${value}\n`),
    resolveCredentials: async () => ({ endpoint: 'host:5666', username: 'admin', password: 'pw' }),
    createClient: async () => ({ close() {} }),
    getSDKInstance: () => ({
      getHostName: async () => ({ data: { hostname: 'nas-one' }, result: 'succ' })
    }),
    ...dependencies
  };
  const program = createProgram({ ...options, settings: options.settings || { acquireServerLock: async () => () => {} } });
  program.configureOutput({
    writeOut: value => writes.push(value),
    writeErr: value => writes.push(value)
  });
  const overrideExit = command => {
    command.exitOverride();
    command.commands.forEach(overrideExit);
  };
  overrideExit(program);
  return { program, options, writes, output: () => writes.join('') };
}

async function parse(program, args) {
  try {
    await program.parseAsync(['node', 'fnos', ...args]);
  } catch (error) {
    if (!['commander.helpDisplayed', 'commander.help', 'commander.version'].includes(error.code)) {
      throw error;
    }
  }
}

afterEach(() => {
  process.exitCode = undefined;
  for (const transport of sdkLogger.transports) {
    if (!sdkTransports.includes(transport)) sdkLogger.remove(transport);
  }
  for (const transport of sdkTransports) {
    if (!sdkLogger.transports.includes(transport)) sdkLogger.add(transport);
  }
});

describe('CLI logo banner', () => {
  it('prints the multiline logo once before business command output', async () => {
    const tty = terminal();
    await parse(tty.program, ['sysinfo.getHostName']);

    assert.ok(tty.output().startsWith(`${LOGO_START}\n`), tty.output());
    assert.equal(tty.output().split(LOGO_START).length - 1, 1);
    assert.equal(tty.output().split('\n')[5], '', 'separate the five-line logo from the result');
    assert.ok(tty.output().indexOf(LOGO_START) < tty.output().indexOf('nas-one'));
    assert.equal(process.exitCode, 0);
  });

  it('prints the logo before login begins', async () => {
    const events = [];
    const tty = terminal({
      stdout: value => events.push(value),
      createClient: async () => {
        events.push('login started');
        return { close() {} };
      }
    });
    await parse(tty.program, ['login', '-e', 'host:5666', '-u', 'admin', '-p', 'pw']);

    assert.match(events[0], /___/);
    assert.equal(events[1], 'login started');
  });

  it('prints the logo before logout output', async () => {
    const tty = terminal({ settings: { listServers: () => [] } });
    await parse(tty.program, ['logout']);

    assert.ok(tty.output().startsWith(LOGO_START), tty.output());
    assert.match(tty.output(), /No saved credentials found/);
  });

  it('prints the logo before a command reports an error', async () => {
    const tty = terminal({ resolveCredentials: async () => { throw new Error('cannot connect'); } });
    await parse(tty.program, ['sysinfo.getHostName']);

    assert.ok(tty.output().startsWith(LOGO_START), tty.output());
    assert.match(tty.output(), /Error: cannot connect/);
    assert.equal(process.exitCode, 1);
  });

  for (const args of [
    ['--help'], ['help'], ['help', 'login'], ['login', '--help'],
    ['sysinfo.getHostName', '--help'], ['completion'], ['completion', '--help'],
    ['completion', 'install', '--help']
  ]) {
    it(`prints the logo once before help for ${args.join(' ')}`, async () => {
      const tty = terminal();
      await parse(tty.program, args);

      assert.ok(tty.output().startsWith(`${LOGO_START}\n`), tty.output());
      assert.equal(tty.output().split(LOGO_START).length - 1, 1);
      assert.ok(tty.output().indexOf(LOGO_START) < tty.output().indexOf('Usage:'));
    });
  }

  it('prints the logo before help when no command is provided', () => {
    const result = spawnSync(process.execPath, ['-e', `
      Object.defineProperty(process.stdout, 'isTTY', { value: true });
      process.stdout.columns = 80;
      require('./src').main(['node', 'fnos']);
    `], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, FNOS_LANG: 'en', NO_COLOR: '' },
      encoding: 'utf8'
    });

    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.ok(result.stderr.startsWith(LOGO_START), result.stderr.slice(0, 200));
    assert.ok(result.stderr.indexOf(LOGO_START) < result.stderr.indexOf('Usage:'));
  });

  it('uses the compact brand when the terminal cannot fit the multiline logo', async () => {
    const tty = terminal({ stdoutColumns: 41, settings: { listServers: () => [] } });
    await parse(tty.program, ['logout']);

    assert.ok(tty.output().startsWith('fnOS CLI\n\n'), tty.output());
    assert.doesNotMatch(tty.output(), /___/);
  });

  it('fits the multiline logo at its exact width', async () => {
    const tty = terminal({ stdoutColumns: 42, settings: { listServers: () => [] } });
    await parse(tty.program, ['logout']);

    assert.ok(tty.output().startsWith(LOGO_START), tty.output());
    for (const line of tty.output().split('\n').slice(0, 5)) assert.ok(line.length <= 42);
  });

  it('uses the full logo when terminal width is unknown', async () => {
    const columns = process.stdout.columns;
    process.stdout.columns = undefined;
    try {
      const tty = terminal({ stdoutColumns: undefined, settings: { listServers: () => [] } });
      await parse(tty.program, ['logout']);

      assert.ok(tty.output().startsWith(LOGO_START), tty.output());
    } finally {
      process.stdout.columns = columns;
    }
  });

  it('styles the logo using the existing cyan theme in an eligible terminal', async () => {
    const tty = terminal({ env: { TERM: 'xterm-256color' }, settings: { listServers: () => [] } });
    await parse(tty.program, ['logout']);

    assert.match(tty.writes[0], /\u001b\[36m/);
    assert.ok(tty.writes[0].includes(LOGO_START));
  });

  for (const env of [{ TERM: 'xterm', NO_COLOR: '' }, { TERM: 'dumb' }]) {
    it(`keeps a plain logo for ${JSON.stringify(env)}`, async () => {
      const tty = terminal({ env, settings: { listServers: () => [] } });
      await parse(tty.program, ['logout']);

      assert.ok(tty.output().startsWith(LOGO_START), tty.output());
      assert.doesNotMatch(tty.output(), /\u001b/);
    });
  }

  it('keeps raw JSON unchanged in an interactive terminal', async () => {
    const tty = terminal();
    await parse(tty.program, ['sysinfo.getHostName', '--raw']);

    assert.equal(tty.output(), '{\n  "data": {\n    "hostname": "nas-one"\n  },\n  "result": "succ"\n}\n');
  });

  it('omits the logo from redirected output even if color is forced', async () => {
    const tty = terminal({ stdoutIsTTY: false, env: { FORCE_COLOR: '1' }, settings: { listServers: () => [] } });
    await parse(tty.program, ['logout']);

    assert.equal(tty.output(), 'No saved credentials found.\n');
  });

  it('omits the logo from redirected help', async () => {
    const tty = terminal({ stdoutIsTTY: false });
    await parse(tty.program, ['--help']);

    assert.ok(tty.output().startsWith('Usage: fnos '), tty.output());
    assert.doesNotMatch(tty.output(), /___|fnOS CLI|\u001b/);
  });

  it('keeps version output to a single version number', async () => {
    const tty = terminal();
    await parse(tty.program, ['--version']);

    assert.equal(tty.output(), '0.5.1\n');
  });

  it('omits the logo from shell completion source even in an interactive terminal', async () => {
    const writes = [];
    const tty = terminal({ completionOutput: { write: value => writes.push(value) } });
    await parse(tty.program, ['completion', 'zsh']);

    assert.equal(tty.output(), '');
    assert.ok(writes.join('').startsWith('typeset -ga _fnos_server_cache\n'));
    assert.doesNotMatch(writes.join(''), /fnOS CLI|___/);
  });

  it('prints the logo for the human-readable completion installation result', async () => {
    const tty = terminal({ installCompletion: () => '/tmp/home/.fnos/completions/_fnos' });
    await parse(tty.program, ['completion', 'install', 'zsh']);

    assert.ok(tty.output().startsWith(LOGO_START), tty.output());
    assert.match(tty.output(), /Installed zsh completion/);
  });
});
