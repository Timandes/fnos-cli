const assert = require('node:assert/strict');
const { HTTPSRequiredError } = require('fnos');
const { describe, it } = require('mocha');
const { COMMAND_CATALOG } = require('../../src/commands/catalog');

function loadRunner() {
  try {
    return require('../../src/commands/runner');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('../../src/commands/runner')) return {};
    throw error;
  }
}

const runner = loadRunner();

function requireRunner() {
  assert.equal(typeof runner.runCommand, 'function', 'command runner must be implemented');
  assert.equal(typeof runner.errorMessage, 'function', 'runner error formatter must be implemented');
}

describe('command runner', () => {
  it('validates arguments before creating a client', async () => {
    requireRunner();
    let created = false;
    const errors = [];
    const code = await runner.runCommand({
      domain: COMMAND_CATALOG.backup,
      definition: COMMAND_CATALOG.backup.commands.listTasks,
      options: {}, globalOptions: {}
    }, {
      createClient: async () => { created = true; },
      stderr: (value) => errors.push(value)
    });
    assert.equal(code, 4);
    assert.equal(created, false);
    assert.match(errors[0], /direction/);
  });

  it('executes a method, formats output, and closes once', async () => {
    requireRunner();
    let closed = 0;
    const client = { close: () => { closed += 1; } };
    const calls = [];
    const output = [];
    const code = await runner.runCommand({
      domain: COMMAND_CATALOG.network,
      definition: COMMAND_CATALOG.network.commands.list,
      options: { endpoint: 'host:5666', username: 'admin', password: 'pw' },
      globalOptions: { raw: true }
    }, {
      createClient: async () => client,
      getSDKInstance: () => ({ list: async (...args) => { calls.push(args); return { result: 'succ' }; } }),
      resolveCredentials: () => ({ endpoint: 'host:5666', username: 'admin', password: 'pw', source: 'command_line' }),
      stdout: (value) => output.push(value),
      stderr: () => {}
    });
    assert.equal(code, 0);
    assert.deepEqual(calls, [[0, 10000]]);
    assert.deepEqual(JSON.parse(output[0]), { result: 'succ' });
    assert.equal(closed, 1);
  });

  it('reports both HTTPS redirect addresses and returns exit code 1', async () => {
    requireRunner();
    const errors = [];
    const redirect = new HTTPSRequiredError(
      'ws://host:5666/websocket',
      'https://host:5667/',
      301
    );
    const code = await runner.runCommand({
      domain: COMMAND_CATALOG.network,
      definition: COMMAND_CATALOG.network.commands.list,
      options: { endpoint: 'host:5666', username: 'admin', password: 'pw' },
      globalOptions: {}
    }, {
      resolveCredentials: () => ({ endpoint: 'host:5666', username: 'admin', password: 'pw' }),
      createClient: async () => { throw redirect; },
      stderr: (value) => errors.push(value)
    });
    assert.equal(code, 1);
    assert.match(runner.errorMessage(redirect), /ws:\/\/host:5666\/websocket/);
    assert.match(errors[0], /https:\/\/host:5667\//);
    assert.match(errors[0], /wss:\/\//);
  });

  it('redacts sensitive values from command errors', async () => {
    requireRunner();
    const errors = [];
    const code = await runner.runCommand({
      domain: COMMAND_CATALOG.network,
      definition: COMMAND_CATALOG.network.commands.list,
      options: { endpoint: 'host:5666', username: 'admin', password: 'pw' },
      globalOptions: {}
    }, {
      resolveCredentials: () => ({ endpoint: 'host:5666', username: 'admin', password: 'pw' }),
      createClient: async () => {
        throw new Error('token=TOKEN_ERROR_SENTINEL password="PASSWORD ERROR,VALUE"');
      },
      stderr: (value) => errors.push(value)
    });
    assert.equal(code, 1);
    assert.doesNotMatch(errors[0], /TOKEN_ERROR_SENTINEL|PASSWORD ERROR,VALUE/);
    assert.match(errors[0], /\[REDACTED\]/);
  });

  it('executes the public host name SDK method and preserves its full response', async () => {
    requireRunner();
    let closed = 0;
    let methodCalled = false;
    let methodArgs;
    const output = [];
    const response = {
      result: 'succ', reqid: 'host-name-1', req: 'appcgi.sysinfo.getHostName', rev: '1',
      data: { hostName: 'mock-host', trimVersion: '1.0.0' }
    };
    const client = { close: () => { closed += 1; } };
    const code = await runner.runCommand({
      domain: COMMAND_CATALOG.sysinfo,
      definition: COMMAND_CATALOG.sysinfo.commands.getHostName,
      options: { endpoint: 'host:5666', username: 'admin', password: 'pw' },
      globalOptions: { raw: true }
    }, {
      resolveCredentials: () => ({ endpoint: 'host:5666', username: 'admin', password: 'pw' }),
      createClient: async () => client,
      getSDKInstance: () => ({
        getHostName: async (...args) => {
          methodCalled = true;
          methodArgs = args;
          return response;
        }
      }),
      stdout: (value) => output.push(value),
      stderr: () => {}
    });
    assert.equal(code, 0);
    assert.equal(methodCalled, true);
    assert.deepEqual(methodArgs, [10000]);
    assert.equal(closed, 1);
    assert.deepEqual(JSON.parse(output[0]), response);
  });
});
