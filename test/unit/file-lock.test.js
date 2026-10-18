const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { describe, it, afterEach } = require('mocha');
let locks = {};
try { locks = require('../../src/utils/file-lock'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
const dirs = [];
function lockPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-lock-'));
  dirs.push(dir);
  return path.join(dir, 'server.lock');
}
afterEach(() => dirs.splice(0).forEach(dir => fs.rmSync(dir, { recursive: true, force: true })));

describe('cross-process file locks', () => {
  it('serializes contenders and makes release idempotent', async () => {
    assert.equal(typeof locks.acquireFileLock, 'function');
    const file = lockPath();
    const release = await locks.acquireFileLock(file);
    let entered = false;
    const contender = locks.acquireFileLock(file).then(unlock => { entered = true; unlock(); });
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(entered, false);
    release(); release();
    await contender;
    assert.equal(entered, true);
  });

  it('times out rather than stealing a live process lock', async () => {
    assert.equal(typeof locks.acquireFileLock, 'function');
    const file = lockPath();
    const release = await locks.acquireFileLock(file);
    try { await assert.rejects(locks.acquireFileLock(file, { timeout: 30 }), /lock|busy/i); }
    finally { release(); }
  });

  it('recovers a lock after its owning process exits', async () => {
    assert.equal(typeof locks.acquireFileLock, 'function');
    const file = lockPath();
    const modulePath = path.resolve(__dirname, '../../src/utils/file-lock');
    const child = spawn(process.execPath, ['-e', `require(${JSON.stringify(modulePath)}).acquireFileLock(${JSON.stringify(file)}).then(() => process.stdout.write('locked'));`]);
    await once(child, 'exit');
    const release = await locks.acquireFileLock(file, { timeout: 500 });
    release();
    assert.equal(fs.existsSync(file), false);
  });
});
