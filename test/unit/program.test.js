const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { describe, it } = require('mocha');

describe('CLI program', () => {
  it('keeps the published bin entry executable', () => {
    const mode = fs.statSync(path.resolve(__dirname, '../../bin/fnos')).mode;
    assert.notEqual(mode & 0o111, 0, 'bin/fnos must have an executable bit');
  });

  it('is import-safe and registers 111 business commands plus public utility commands', () => {
    const script = `
      const assert = require('node:assert/strict');
      const entry = require('./src');
      assert.equal(typeof entry.createProgram, 'function');
      assert.equal(typeof entry.main, 'function');
      const program = entry.createProgram();
      const groups = program.commands.filter((command) =>
        command.commands.length && !['completion', 'config'].includes(command.name()));
      assert.equal(groups.length, 21);
      assert.equal(groups.reduce((count, group) => count + group.commands.length, 0), 111);
      assert.ok(groups.find((group) => group.name() === 'docker')
        .commands.some((command) => command.name() === 'listContainers'));
      assert.ok(groups.find((group) => group.name() === 'backup')
        .commands.some((command) => command.name() === 'listTasks'));
      const visible = program.createHelp().visibleCommands(program);
      assert.deepEqual(visible.filter((command) => command.name().includes('.'))
        .map((command) => command.name()), ['auth.status']);
      assert.ok(program.commands.some((command) => command.name() === 'completion'));
      assert.equal(program.commands.some((command) => command.name() === '__complete'), false);
      process.stdout.write('PROGRAM_OK');
    `;
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'PROGRAM_OK');
  });

  it('requires --server for multiple saved servers in a non-interactive shell', () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-program-'));
    const settingsDir = path.join(homeDir, '.fnos');
    fs.mkdirSync(settingsDir);
    fs.writeFileSync(path.join(settingsDir, 'settings.json'), JSON.stringify({
      servers: {
        default: { endpoint: '127.0.0.1:1', username: 'admin', password: 'pw' },
        office: { endpoint: '127.0.0.1:2', username: 'admin', password: 'pw' }
      }
    }));

    try {
      const result = spawnSync(
        process.execPath,
        [path.resolve(__dirname, '../../bin/fnos'), 'sysinfo.getHostName'],
        {
          cwd: path.resolve(__dirname, '../..'),
          env: { ...process.env, HOME: homeDir },
          encoding: 'utf8'
        }
      );

      assert.equal(result.status, 3, result.stderr);
      assert.match(result.stderr, /--server/);
      assert.match(result.stderr, /default/);
      assert.match(result.stderr, /office/);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });
});
