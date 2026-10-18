const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, describe, it } = require('mocha');

const homes = [];
afterEach(() => {
  for (const home of homes.splice(0)) fs.rmSync(home, { recursive: true, force: true });
});

function runScript(script) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-cli-auth-command-'));
  homes.push(home);
  return spawnSync(process.execPath, ['-e', script], {
    cwd: path.resolve(__dirname, '../..'),
    encoding: 'utf8',
    env: { ...process.env, HOME: home }
  });
}

describe('authentication commands', () => {
  it('accepts --verify-ssl for OAuth and passes the selected policy to login', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { createProgram } = require('./src');
      const program = createProgram({
        loginOAuth: async options => { assert.equal(options.verifySsl, true); return { authType: 'oauth' }; },
        stdout: () => {}
      });
      program.parseAsync(['node','fnos','login','--auth','oauth','-e','https://nas.example','--verify-ssl']);
    `);
    assert.equal(result.status, 0, result.stderr);
  });

  it('rejects the removed HTTP flag and does not introduce an insecure flag', () => {
    for (const flag of ['--allow-insecure-http', '--insecure']) {
      const result = runScript(`
        require('./src').createProgram().parseAsync(['node','fnos','login','--auth','oauth','-e','https://nas.example',${JSON.stringify(flag)}]);
      `);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /unknown option/);
    }
  });

  it('redacts OAuth refresh tokens, PKCE verifiers and Bearer authorization from errors', () => {
    const result = runScript(`
      const { redactSensitive } = require('./src/utils/logger');
      process.stdout.write(redactSensitive('refreshToken=REFRESH_SENTINEL refresh_token=REFRESH_SNAKE codeVerifier=VERIFIER_SENTINEL code_verifier=VERIFIER_SNAKE Authorization: Bearer BEARER_SENTINEL'));
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /REFRESH_SENTINEL|REFRESH_SNAKE|VERIFIER_SENTINEL|VERIFIER_SNAKE|BEARER_SENTINEL/);
  });

  it('selects OAuth explicitly without requiring username or password', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { createProgram } = require('./src');
      const program = createProgram({
        loginOAuth: async options => { assert.equal(options.server, 'oauth'); return { server: 'oauth', authType: 'oauth' }; },
        createClient: async () => { throw new Error('must not use password'); },
        stdout: value => process.stdout.write(value)
      });
      program.parseAsync(['node','fnos','--raw','login','--auth','oauth','--server','oauth','-e','https://nas.example']);
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { server: 'oauth', authType: 'oauth' });
  });

  it('rejects conflicting login options and incomplete password input before client creation', () => {
    for (const args of [
      ['--auth', 'oauth', '-e', 'https://nas.example', '-u', 'admin'],
      ['--auth', 'oauth', '-e', 'http://nas.example', '--verify-ssl'],
      ['--auth', 'password', '-e', 'nas', '-u', 'admin'],
      ['--auth', 'unknown', '-e', 'nas']
    ]) {
      const result = runScript(`
        const { createProgram } = require('./src');
        const program = createProgram({
          createClient: async () => { process.stdout.write('NETWORK'); },
          loginOAuth: async () => { process.stdout.write('NETWORK'); }
        });
        program.parseAsync(['node','fnos','login', ...${JSON.stringify(args)}]);
      `);
      assert.equal(result.status, 4, result.stderr);
      assert.doesNotMatch(result.stdout, /NETWORK/);
    }
  });

  it('runs login with injected client creation and closes the client', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { Command } = require('commander');
      const { registerLoginCommand } = require('./src/commands/auth');
      let closed = 0;
      let received;
      const program = new Command();
      registerLoginCommand(program, {
        createClient: async (options) => { received = options; return { close: () => { closed += 1; } }; },
        stderr: () => {}
      });
      program.parseAsync(['node', 'fnos', 'login', '-e', '127.0.0.1:1', '-u', 'admin', '-p', 'pw'])
        .then(() => {
          assert.equal(received.saveCredentials, true);
          assert.equal(received.serverName, 'default');
          assert.equal(closed, 1);
          assert.equal(process.exitCode, 0);
          process.stdout.write('LOGIN_OK');
        });
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'LOGIN_OK');
  });

  it('passes an explicitly named server to login', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { Command } = require('commander');
      const { registerLoginCommand } = require('./src/commands/auth');
      let received;
      const program = new Command();
      registerLoginCommand(program, {
        createClient: async (options) => {
          received = options;
          return { close: () => {} };
        },
        stderr: () => {}
      });
      program.parseAsync([
        'node', 'fnos', 'login', '-s', 'office',
        '-e', '127.0.0.1:1', '-u', 'admin', '-p', 'pw'
      ]).then(() => {
        assert.equal(received.serverName, 'office');
        process.stdout.write('NAMED_LOGIN_OK');
      });
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'NAMED_LOGIN_OK');
  });

  it('redacts sensitive values from login errors', () => {
    const result = runScript(`
      const { Command } = require('commander');
      const { registerLoginCommand } = require('./src/commands/auth');
      let captured = '';
      const program = new Command();
      registerLoginCommand(program, {
        createClient: async () => { throw new Error('token=TOKEN_LOGIN_SENTINEL password="PASSWORD LOGIN,VALUE"'); },
        stderr: (value) => { captured = value; }
      });
      program.parseAsync(['node', 'fnos', 'login', '-e', 'host:5666', '-u', 'admin', '-p', 'pw'])
        .then(() => process.stdout.write(captured));
    `);
    assert.equal(result.status, 1, result.stderr);
    assert.doesNotMatch(result.stdout, /TOKEN_LOGIN_SENTINEL|PASSWORD LOGIN,VALUE/);
    assert.match(result.stdout, /\[REDACTED\]/);
  });

  it('reports both HTTPS redirect addresses during login', () => {
    const result = runScript(`
      const { Command } = require('commander');
      const { HTTPSRequiredError } = require('fnos');
      const { registerLoginCommand } = require('./src/commands/auth');
      let captured = '';
      const program = new Command();
      registerLoginCommand(program, {
        createClient: async () => {
          throw new HTTPSRequiredError('ws://host:5666/websocket', 'https://host:5667/', 301);
        },
        stderr: (value) => { captured = value; }
      });
      program.parseAsync(['node', 'fnos', 'login', '-e', 'host:5666', '-u', 'admin', '-p', 'pw'])
        .then(() => process.stdout.write(captured));
    `);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /ws:\/\/host:5666\/websocket/);
    assert.match(result.stdout, /https:\/\/host:5667\//);
    assert.match(result.stdout, /wss:\/\//);
  });

  it('runs logout with injected settings and preserves process control', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { Command } = require('commander');
      const { registerLogoutCommand } = require('./src/commands/auth');
      let cleared;
      const output = [];
      const program = new Command();
      registerLogoutCommand(program, {
        settings: {
          listServers: () => [
            { name: 'default', endpoint: 'home:5666', username: 'admin' },
            { name: 'office', endpoint: 'office:5666', username: 'admin' }
          ],
          clearCredentials: (name) => { cleared = name; return true; }
        },
        stdout: (value) => output.push(value)
      });
      program.parseAsync(['node', 'fnos', 'logout', '-s', 'office']).then(() => {
        assert.equal(cleared, 'office');
        assert.match(output[0], /office/);
        assert.equal(process.exitCode, 0);
        process.stdout.write('LOGOUT_OK');
      });
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'LOGOUT_OK');
  });

  it('automatically logs out the only saved server', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { Command } = require('commander');
      const { registerLogoutCommand } = require('./src/commands/auth');
      let cleared;
      const output = [];
      const program = new Command();
      registerLogoutCommand(program, {
        settings: {
          listServers: () => [
            { name: 'office', endpoint: 'office:5666', username: 'admin' }
          ],
          clearCredentials: (name) => { cleared = name; return true; }
        },
        stdout: (value) => output.push(value)
      });
      program.parseAsync(['node', 'fnos', 'logout']).then(() => {
        assert.equal(cleared, 'office');
        assert.match(output[0], /office/);
        assert.equal(process.exitCode, 0);
        process.stdout.write('ONLY_SERVER_LOGOUT_OK');
      });
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'ONLY_SERVER_LOGOUT_OK');
  });

  it('succeeds when there are no saved servers', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { Command } = require('commander');
      const { registerLogoutCommand } = require('./src/commands/auth');
      const output = [];
      const program = new Command();
      registerLogoutCommand(program, {
        settings: {
          listServers: () => [],
          clearCredentials: () => { throw new Error('must not clear'); }
        },
        stdout: (value) => output.push(value)
      });
      program.parseAsync(['node', 'fnos', 'logout']).then(() => {
        assert.match(output[0], /No saved credentials/i);
        assert.equal(process.exitCode, 0);
        process.stdout.write('EMPTY_LOGOUT_OK');
      });
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'EMPTY_LOGOUT_OK');
  });

  it('rejects an explicit logout target when no servers are saved', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { Command } = require('commander');
      const { registerLogoutCommand } = require('./src/commands/auth');
      const output = [];
      const errors = [];
      const program = new Command();
      registerLogoutCommand(program, {
        settings: {
          listServers: () => [],
          clearCredentials: () => { throw new Error('must not clear'); }
        },
        stdout: (value) => output.push(value),
        stderr: (value) => errors.push(value)
      });
      program.parseAsync(['node', 'fnos', 'logout', '-s', 'office']).then(() => {
        assert.equal(output.length, 0);
        assert.match(errors[0], /office/);
        assert.equal(process.exitCode, 3);
        process.stdout.write('EMPTY_NAMED_LOGOUT_OK');
      });
    `);
    assert.equal(result.status, 3, result.stderr);
    assert.equal(result.stdout, 'EMPTY_NAMED_LOGOUT_OK');
  });

  it('uses the server selector before logging out from multiple servers', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { Command } = require('commander');
      const { registerLogoutCommand } = require('./src/commands/auth');
      const servers = [
        { name: 'default', endpoint: 'home:5666', username: 'home-user' },
        { name: 'office', endpoint: 'office:5666', username: 'office-user' }
      ];
      let offered;
      let cleared;
      const output = [];
      const program = new Command();
      registerLogoutCommand(program, {
        settings: {
          listServers: () => servers,
          clearCredentials: (name) => { cleared = name; return true; }
        },
        selectServer: async (values) => { offered = values; return 'office'; },
        stdout: (value) => output.push(value),
        stderr: () => {}
      });
      program.parseAsync(['node', 'fnos', 'logout']).then(() => {
        assert.deepEqual(offered, servers);
        assert.equal(cleared, 'office');
        assert.match(output[0], /office/);
        assert.equal(process.exitCode, 0);
        process.stdout.write('SELECTED_LOGOUT_OK');
      });
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'SELECTED_LOGOUT_OK');
  });

  it('reports server selection errors during logout', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { Command } = require('commander');
      const { registerLogoutCommand } = require('./src/commands/auth');
      const errors = [];
      const program = new Command();
      registerLogoutCommand(program, {
        settings: {
          listServers: () => [
            { name: 'default', endpoint: 'home:5666', username: 'home-user' },
            { name: 'office', endpoint: 'office:5666', username: 'office-user' }
          ],
          clearCredentials: () => { throw new Error('must not clear'); }
        },
        selectServer: async () => {
          const error = new Error('Selection cancelled.');
          error.exitCode = 3;
          throw error;
        },
        stdout: () => {},
        stderr: (value) => errors.push(value)
      });
      program.parseAsync(['node', 'fnos', 'logout']).then(() => {
        assert.match(errors[0], /Selection cancelled/);
        assert.equal(process.exitCode, 3);
        process.stdout.write('LOGOUT_SELECTION_ERROR_OK');
      });
    `);
    assert.equal(result.status, 3, result.stderr);
    assert.equal(result.stdout, 'LOGOUT_SELECTION_ERROR_OK');
  });

  it('rejects an explicitly named server that is not saved', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { Command } = require('commander');
      const { registerLogoutCommand } = require('./src/commands/auth');
      let cleared = false;
      const errors = [];
      const program = new Command();
      registerLogoutCommand(program, {
        settings: {
          listServers: () => [
            { name: 'default', endpoint: 'home:5666', username: 'home-user' }
          ],
          clearCredentials: () => { cleared = true; }
        },
        stdout: () => {},
        stderr: (value) => errors.push(value)
      });
      program.parseAsync(['node', 'fnos', 'logout', '-s', 'missing']).then(() => {
        assert.equal(cleared, false);
        assert.match(errors[0], /default/);
        assert.match(errors[0], /missing/);
        assert.equal(process.exitCode, 3);
        process.stdout.write('MISSING_LOGOUT_OK');
      });
    `);
    assert.equal(result.status, 3, result.stderr);
    assert.equal(result.stdout, 'MISSING_LOGOUT_OK');
  });
});
