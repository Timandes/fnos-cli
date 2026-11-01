const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { describe, it } = require('mocha');

describe('real password terminal', function () {
  this.timeout(25000);
  it('hides input, restores terminal attributes and exits after success, Ctrl-C and EOF', function () {
    if (process.platform === 'win32') this.skip();
    const python = spawnSync('python3', ['--version']);
    if (python.error?.code === 'ENOENT') this.skip();
    const result = spawnSync('python3', ['test/helpers/password-pty.py', process.execPath], {
      cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', timeout: 23000
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.match(result.stdout, /no password echo; terminal restored/);
  });
});
