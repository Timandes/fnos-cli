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
          assert.equal(closed, 1);
          assert.equal(process.exitCode, 0);
          process.stdout.write('LOGIN_OK');
        });
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'LOGIN_OK');
  });

  it('runs logout with injected settings and preserves process control', () => {
    const result = runScript(`
      const assert = require('node:assert/strict');
      const { Command } = require('commander');
      const { registerLogoutCommand } = require('./src/commands/auth');
      let cleared = 0;
      const output = [];
      const program = new Command();
      registerLogoutCommand(program, {
        settings: {
          getCredentials: () => ({ endpoint: 'host:5666', username: 'admin' }),
          clearCredentials: () => { cleared += 1; }
        },
        stdout: (value) => output.push(value)
      });
      program.parseAsync(['node', 'fnos', 'logout']).then(() => {
        assert.equal(cleared, 1);
        assert.match(output[0], /cleared/i);
        assert.equal(process.exitCode, 0);
        process.stdout.write('LOGOUT_OK');
      });
    `);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'LOGOUT_OK');
  });
});
