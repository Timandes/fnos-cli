// Run in a disposable Node process so the injected subprocess failure cannot
// affect other tests or the module cache. All paths come from a test mkdtemp.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const [home, stage] = process.argv.slice(2);
const directory = path.join(home, '.fnos');
const originalExec = cp.execFileSync;
const originalWrite = fs.writeFileSync;
let failed = false;
let writesAfterFailure = 0;
let descriptorWrites = 0;
fs.writeFileSync = function (...args) {
  if (failed) writesAfterFailure++;
  if (typeof args[0] === 'number') descriptorWrites++;
  return originalWrite.apply(this, args);
};
cp.execFileSync = function (exe, args, options) {
  const target = options?.env?.FNOS_PRIVATE_PATH;
  if (target && ((stage === 'directory' && target === directory) ||
      (stage === 'key' && target === path.join(directory, 'password.key')) ||
      (stage === 'settings' && path.dirname(target) === directory && target.endsWith('.tmp')))) {
    failed = true;
    throw Object.assign(new Error('ACL_PASSWORD_SENTINEL ACL_TOKEN_SENTINEL ACL_KEY_SENTINEL'), {
      status: 23, stdout: Buffer.from('ACL_KEY_SENTINEL'),
      stderr: Buffer.from('ACL_PASSWORD_SENTINEL\nFNOS_ACL_EXCEPTION:System.UnauthorizedAccessException\nFNOS_ACL_HRESULT:-2147024891\nACL_TOKEN_SENTINEL')
    });
  }
  // Isolate the selected failure boundary: earlier ACL calls must not mask it.
  // Real permission semantics are verified separately with the OS DACL query.
  if (target) return;
  return originalExec.call(this, exe, args, options);
};
const { Settings } = require('../../src/utils/settings');
const settings = new Settings(home);
console.error = () => {};
let failure;
try {
  if (stage === 'key') settings.saveCredentials('home', { endpoint: 'nas', username: 'test', password: 'ACL_PASSWORD_SENTINEL', token: 'ACL_TOKEN_SENTINEL' });
  else settings.save({ password: 'ACL_PASSWORD_SENTINEL', token: 'ACL_TOKEN_SENTINEL' }, { encryptPasswords: false });
} catch (error) { failure = error; }
assert.ok(failed, 'the selected ACL call must fail');
assert.ok(failure, 'the settings operation must reject the failed ACL');
assert.equal(writesAfterFailure, 0, 'no data writes may follow the failed ACL');
assert.equal(descriptorWrites, 0, 'no key/settings bytes may be written before ACL protection succeeds');
// Include non-enumerable cause/message/stack in the leak check.
assert.doesNotMatch(require('node:util').inspect(failure, { depth: null }), /ACL_(PASSWORD|TOKEN|KEY)_SENTINEL/);
assert.equal(failure.cause?.status, 23, 'preserve the sanitized subprocess exit status');
assert.deepEqual(failure.cause?.exceptionTypes, ['System.UnauthorizedAccessException']);
process.stdout.write(JSON.stringify({ rejected: true, writesAfterFailure, diagnostics: failure.cause }));
