const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { describe, it } = require('mocha');

describe('CLI program', () => {
  it('keeps the published bin entry executable', () => {
    const mode = fs.statSync(path.resolve(__dirname, '../../bin/fnos')).mode;
    assert.notEqual(mode & 0o111, 0, 'bin/fnos must have an executable bit');
  });

  it('is import-safe and registers 111 business commands plus login and logout', () => {
    const script = `
      const assert = require('node:assert/strict');
      const entry = require('./src');
      assert.equal(typeof entry.createProgram, 'function');
      assert.equal(typeof entry.main, 'function');
      const program = entry.createProgram();
      assert.equal(program.commands.length, 113);
      assert.ok(program.commands.some((command) => command.name() === 'docker.listContainers'));
      assert.ok(program.commands.some((command) => command.name() === 'backup.listTasks'));
      process.stdout.write('PROGRAM_OK');
    `;
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'PROGRAM_OK');
  });
});
