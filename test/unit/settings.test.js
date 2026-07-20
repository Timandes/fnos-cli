const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, describe, it } = require('mocha');
const settingsModule = require('../../src/utils/settings');

const homes = [];
afterEach(() => {
  for (const home of homes.splice(0)) fs.rmSync(home, { recursive: true, force: true });
});

function settingsStore() {
  assert.equal(typeof settingsModule.Settings, 'function', 'Settings class must be exported');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-cli-unit-'));
  homes.push(home);
  return new settingsModule.Settings(home);
}

describe('credential settings', () => {
  it('stores versioned credentials with mode 0600 and preserves unrelated data on logout', () => {
    const store = settingsStore();
    store.save({ theme: 'dark' });
    store.saveCredentials({ endpoint: 'host:5666', username: 'admin', password: 'pw' });
    assert.equal(fs.statSync(store.settingsPath).mode & 0o777, 0o600);
    assert.equal(store.getCredentials().credentialVersion, 2);
    assert.equal(store.getCredentials().secretFormat, 'decrypted-v1');
    store.clearCredentials();
    assert.deepEqual(store.load(), { theme: 'dark' });
  });
});
