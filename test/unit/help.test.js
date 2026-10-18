const assert = require('node:assert/strict');
const os = require('node:os');
const { afterEach, describe, it } = require('mocha');
const { createProgram } = require('../../src');
const { runCli } = require('../helpers/run-cli');

afterEach(() => { process.exitCode = undefined; });

function help(...args) {
  const result = runCli(args, os.tmpdir());
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.equal(result.stderr, '');
  return result.stdout;
}

describe('hierarchical help', () => {
  it('shows only command groups, utility commands, and global options at the root', () => {
    const output = help('--help');
    assert.match(output, /\n  user\s+.*User/i);
    assert.match(output, /\n  docker\s+.*Docker/);
    assert.match(output, /\n  login /);
    assert.match(output, /\n  completion /);
    assert.match(output, /--raw/);
    assert.match(output, /--verbose/);
    assert.doesNotMatch(output, /user\.info|listContainers|--server|--name/);
    assert.match(output, /fnos <command> --help/);
    assert.equal(help(), output);
  });

  it('expands just the selected group with authentication and global options', () => {
    const output = help('user', '--help');
    assert.match(output, /^Usage: fnos user /);
    assert.match(output, /\n  info\s+Get user information/);
    assert.match(output, /\n  getPreference /);
    assert.match(output, /--server <name>/);
    assert.match(output, /--endpoint <endpoint>/);
    assert.match(output, /--raw/);
    assert.match(output, /--verbose/);
    assert.doesNotMatch(output, /listContainers|--name <name>/);
    assert.match(output, /fnos user <command> --help/);
    assert.equal(help('user'), output);
  });

  it('shows business, authentication, and global options for a leaf', () => {
    const output = help('user', 'getPreference', '--help');
    assert.match(output, /^Usage: fnos user getPreference /);
    assert.match(output, /--name <name>/);
    assert.match(output, /--server <name>/);
    assert.match(output, /--twofa-code <code>/);
    assert.match(output, /--verify-ssl/);
    assert.match(output, /--raw/);
    assert.match(output, /--silly/);
    assert.doesNotMatch(output, /Commands:|listContainers/);
    assert.equal((output.match(/--server/g) || []).length, 1);
    assert.equal((output.match(/--raw/g) || []).length, 1);
  });

  it('keeps dotted help available and hides legacy option spellings', () => {
    const output = help('network.getInfo', '--help');
    assert.match(output, /^Usage: fnos network\.getInfo /);
    assert.match(output, /--if-name <name>/);
    assert.match(output, /--raw/);
    assert.doesNotMatch(output, /--ifName/);
    assert.doesNotMatch(help('network', 'getInfo', '--help'), /--ifName/);
  });

  it('supports explicit help navigation and utility command help', () => {
    assert.equal(help('help', 'user'), help('user', '--help'));
    assert.equal(help('user', 'help', 'getPreference'), help('user', 'getPreference', '--help'));
    const output = help('completion', 'install', '--help');
    assert.match(output, /--raw/);
    assert.doesNotMatch(output, /--server|user\.info/);
  });

  it('rejects unknown subcommands instead of treating them as an empty group', () => {
    const result = runCli(['user', 'does-not-exist'], os.tmpdir());
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unknown command.*does-not-exist/);
  });
});

describe('hierarchical command execution', () => {
  const cases = [
    ['leaf authentication', ['user', 'getPreference', '--name', 'theme', '-s', 'office', '--raw']],
    ['group authentication', ['--raw', 'user', '-s', 'office', 'getPreference', '--name', 'theme']],
    ['dotted compatibility', ['user.getPreference', '--name', 'theme', '-s', 'office', '--raw']]
  ];
  for (const [label, args] of cases) {
    it(`passes the same SDK arguments and raw output with ${label}`, async () => {
      const calls = [];
      const output = [];
      let closed = 0;
      const response = { result: 'succ', data: { name: 'theme', value: 'dark' } };
      const program = createProgram({
        resolveCredentials: async (options) => {
          assert.equal(options.server, 'office');
          return { endpoint: 'nas:5666', username: 'admin', password: 'test-password' };
        },
        createClient: async () => ({ close: () => { closed += 1; } }),
        getSDKInstance: (_client, className) => {
          assert.equal(className, 'User');
          return { getPreference: async (...values) => { calls.push(values); return response; } };
        },
        stdout: (value) => output.push(value),
        stderr: (value) => assert.fail(value)
      }).exitOverride();

      await program.parseAsync(args, { from: 'user' });

      assert.equal(process.exitCode, 0);
      assert.deepEqual(calls, [['theme', 10000]]);
      assert.equal(output.length, 1);
      assert.deepEqual(JSON.parse(output[0]), response);
      assert.equal(closed, 1);
    });
  }

  it('validates missing business options before resolving credentials', async () => {
    const errors = [];
    const program = createProgram({
      resolveCredentials: () => assert.fail('must validate before authentication'),
      stderr: (value) => errors.push(value)
    }).exitOverride();
    await program.parseAsync(['user', 'getUserTwofaConfig'], { from: 'user' });
    assert.equal(process.exitCode, 4);
    assert.match(errors[0], /--uid is required/);
  });
});
