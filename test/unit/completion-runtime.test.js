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
