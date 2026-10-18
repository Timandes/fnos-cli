const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

function ownerAt(file) {
  try { return JSON.parse(fs.readFileSync(`${file}/owner.json`, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

function isDead(owner) {
  if (!Number.isInteger(owner?.pid) || owner.pid <= 0) return false;
  try { process.kill(owner.pid, 0); return false; }
  catch (error) { return error.code === 'ESRCH'; }
}

function createLock(file) {
  try { fs.mkdirSync(file, { mode: 0o700 }); }
  catch (error) { if (error.code === 'EEXIST') return null; throw error; }
  const id = randomUUID();
  try {
    fs.writeFileSync(`${file}/owner.json`, JSON.stringify({ pid: process.pid, id }), { mode: 0o600 });
  } catch (error) { fs.rmSync(file, { recursive: true, force: true }); throw error; }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (ownerAt(file)?.id === id) fs.rmSync(file, { recursive: true, force: true });
  };
}

function abandoned(file) {
  const owner = ownerAt(file);
  if (owner) return isDead(owner);
  try { return Date.now() - fs.statSync(file).mtimeMs > 1000; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

function reclaim(file) {
  // Serialize reclaimers and re-read ownership inside the reclamation guard.
  // Otherwise two stale readers could remove a newly acquired live lock.
  if (!abandoned(file)) return;
  const guard = `${file}.reap`;
  let release = createLock(guard);
  if (!release) {
    // A reclaimer can also die. Recover its guard under another guard,
    // applying the same ownership checks instead of bypassing exclusion.
    reclaim(guard);
    release = createLock(guard);
  }
  if (!release) return;
  try {
    if (abandoned(file)) fs.rmSync(file, { recursive: true, force: true });
  } finally { release(); }
}

function attempt(file) {
  const release = createLock(file);
  if (release) return release;
  reclaim(file);
  return createLock(file);
}

function busyError() {
  const error = new Error('Timed out waiting for the settings/server lock; another fnos command may be busy.');
  error.exitCode = 1;
  return error;
}

/** Acquire an exclusive process lock; caller must release it in finally. */
async function acquireFileLock(file, { timeout = 30000 } = {}) {
  const deadline = Date.now() + timeout;
  do {
    const release = attempt(file);
    if (release) return release;
    if (Date.now() >= deadline) throw busyError();
    await new Promise(resolve => setTimeout(resolve, 20));
  } while (true);
}

/** Hold a short synchronous lock around settings read/modify/write. */
function acquireFileLockSync(file, { timeout = 5000 } = {}) {
  const deadline = Date.now() + timeout;
  const wait = new Int32Array(new SharedArrayBuffer(4));
  do {
    const release = attempt(file);
    if (release) return release;
    if (Date.now() >= deadline) throw busyError();
    Atomics.wait(wait, 0, 0, 10);
  } while (true);
}

module.exports = { acquireFileLock, acquireFileLockSync };
