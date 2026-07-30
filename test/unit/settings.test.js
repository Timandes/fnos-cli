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
  it('exports the known authentication fields', () => {
    assert.deepEqual(settingsModule.AUTH_FIELDS, [
      'endpoint',
      'username',
      'password',
      'token',
      'longToken',
      'secret',
      'credentialVersion',
      'secretFormat'
    ]);
  });

  it('migrates legacy credentials to default and preserves unrelated settings', () => {
    const store = settingsStore();
    store.save({
      endpoint: 'legacy:5666',
      username: 'admin',
      password: 'pw',
      credentialVersion: 2,
      token: 'token',
      longToken: 'long',
      secret: 'secret',
      secretFormat: 'decrypted-v1',
      theme: 'dark'
    });

    assert.deepEqual(store.listServers(), [
      { name: 'default', endpoint: 'legacy:5666', username: 'admin' }
    ]);
    assert.deepEqual(store.load(), {
      servers: {
        default: {
          endpoint: 'legacy:5666',
          username: 'admin',
          password: 'pw',
          credentialVersion: 2,
          token: 'token',
          longToken: 'long',
          secret: 'secret',
          secretFormat: 'decrypted-v1'
        }
      },
      theme: 'dark'
    });
  });

  it('keeps named servers while migrating legacy credentials to default', () => {
    const store = settingsStore();
    store.save({
      endpoint: 'legacy:5666',
      username: 'legacy-user',
      password: 'legacy-pw',
      servers: {
        office: {
          endpoint: 'office:5666',
          username: 'office-user',
          password: 'office-pw'
        }
      }
    });

    store.listServers();

    const data = store.load();
    assert.equal(data.servers.default.endpoint, 'legacy:5666');
    assert.equal(data.servers.office.endpoint, 'office:5666');
  });

  it('rejects conflicting legacy and default credentials without modifying the file', () => {
    const store = settingsStore();
    const original = {
      endpoint: 'legacy:5666',
      username: 'legacy-user',
      password: 'legacy-pw',
      servers: {
        default: {
          endpoint: 'new:5666',
          username: 'new-user',
          password: 'new-pw'
        }
      }
    };
    store.save(original);

    assert.throws(
      () => store.listServers(),
      (error) => error.name === 'ConfigurationError' && error.exitCode === 1
    );
    assert.deepEqual(store.load(), original);
  });

  it('deduplicates identical legacy and default credentials', () => {
    const store = settingsStore();
    const credentials = {
      endpoint: 'home:5666',
      username: 'admin',
      password: 'pw'
    };
    store.save({
      ...credentials,
      servers: { default: { ...credentials } }
    });

    assert.equal(store.getCredentials().endpoint, 'home:5666');
    assert.deepEqual(store.load(), {
      servers: { default: credentials }
    });
  });

  it('stores versioned credentials with mode 0600 and preserves unrelated data on logout', () => {
    const store = settingsStore();
    store.save({ theme: 'dark' });
    store.saveCredentials('default', {
      endpoint: 'host:5666',
      username: 'admin',
      password: 'pw'
    });
    assert.equal(fs.statSync(store.settingsPath).mode & 0o777, 0o600);
    assert.equal(store.getCredentials().credentialVersion, 2);
    assert.equal(store.getCredentials().secretFormat, 'decrypted-v1');
    store.clearCredentials();
    assert.deepEqual(store.load(), { servers: {}, theme: 'dark' });
  });

  it('requires an explicit server name when saving credentials', () => {
    const store = settingsStore();

    assert.throws(
      () => store.saveCredentials({
        endpoint: 'host:5666',
        username: 'admin',
        password: 'pw'
      }),
      (error) => error.name === 'ConfigurationError'
    );
  });

  it('stores independent credentials under server names', () => {
    const store = settingsStore();
    store.saveCredentials('default', {
      endpoint: 'home:5666',
      username: 'home-user',
      password: 'home-pw'
    });
    store.saveCredentials('office', {
      endpoint: 'office:5666',
      username: 'office-user',
      password: 'office-pw'
    });

    assert.equal(store.getCredentials('default').endpoint, 'home:5666');
    assert.equal(store.getCredentials('office').endpoint, 'office:5666');
  });

  it('deletes only the requested server credentials', () => {
    const store = settingsStore();
    store.saveCredentials('default', {
      endpoint: 'home:5666',
      username: 'home-user',
      password: 'home-pw'
    });
    store.saveCredentials('office', {
      endpoint: 'office:5666',
      username: 'office-user',
      password: 'office-pw'
    });

    assert.equal(store.clearCredentials('office'), true);
    assert.equal(store.getCredentials('office'), null);
    assert.equal(store.getCredentials('default').endpoint, 'home:5666');
  });

  it('rejects partial legacy credentials', () => {
    const store = settingsStore();
    store.save({ endpoint: 'partial:5666' });

    assert.throws(
      () => store.listServers(),
      (error) => error.name === 'ConfigurationError' && error.exitCode === 1
    );
  });

  it('rejects a non-object servers value', () => {
    const store = settingsStore();
    store.save({ servers: [] });

    assert.throws(
      () => store.listServers(),
      (error) => error.name === 'ConfigurationError' && error.exitCode === 1
    );
  });

  it('rejects malformed saved server credentials', () => {
    const store = settingsStore();
    store.save({
      servers: {
        office: {
          endpoint: 'office:5666',
          username: 'office-user'
        }
      }
    });

    assert.throws(
      () => store.listServers(),
      (error) => error.name === 'ConfigurationError' && error.exitCode === 1
    );
  });

  it('rejects invalid server names in settings', () => {
    const store = settingsStore();
    store.save({
      servers: {
        'bad name': {
          endpoint: 'office:5666',
          username: 'office-user',
          password: 'office-pw'
        }
      }
    });

    assert.throws(
      () => store.listServers(),
      (error) => error.name === 'ConfigurationError' && error.exitCode === 1
    );
  });

  it('rejects invalid server names when saving credentials', () => {
    const store = settingsStore();

    assert.throws(
      () => store.saveCredentials('bad name', {
        endpoint: 'office:5666',
        username: 'office-user',
        password: 'office-pw'
      }),
      (error) => error.name === 'ConfigurationError' && error.exitCode === 1
    );
  });

  it('rejects incomplete credentials when saving a server', () => {
    const store = settingsStore();

    assert.throws(
      () => store.saveCredentials('office', {
        endpoint: 'office:5666',
        username: 'office-user'
      }),
      (error) => error.name === 'ConfigurationError' && error.exitCode === 1
    );
  });

  it('throws a redacted configuration error for invalid JSON', () => {
    const store = settingsStore();
    fs.mkdirSync(path.dirname(store.settingsPath), { recursive: true });
    fs.writeFileSync(store.settingsPath, '{"password": PASSWORD_SETTINGS_SENTINEL}', 'utf8');
    let captured;

    assert.throws(
      () => store.load(),
      (error) => {
        captured = error;
        return error.name === 'ConfigurationError' &&
          error.exitCode === 1 &&
          error.message === 'Failed to load settings: invalid JSON.';
      }
    );
    assert.doesNotMatch(captured.message, /PASSWORD_SETTINGS_SENTINEL/);
  });

  it('tightens existing settings directory and file permissions', () => {
    const store = settingsStore();
    fs.mkdirSync(store.settingsDir, { recursive: true, mode: 0o755 });
    fs.chmodSync(store.settingsDir, 0o755);

    store.saveCredentials('default', {
      endpoint: 'host:5666',
      username: 'admin',
      password: 'pw'
    });

    assert.equal(fs.statSync(store.settingsDir).mode & 0o777, 0o700);
    assert.equal(fs.statSync(store.settingsPath).mode & 0o777, 0o600);
  });

  it('preserves the previous settings file when replacement fails', () => {
    const store = settingsStore();
    store.save({ theme: 'before' });
    const originalRenameSync = fs.renameSync;
    const originalError = console.error;
    const errors = [];
    fs.renameSync = (source, target) => {
      if (target === store.settingsPath) throw new Error('rename failed');
      return originalRenameSync(source, target);
    };
    console.error = (value) => errors.push(value);
    try {
      assert.throws(() => store.save({ theme: 'after' }), /rename failed/);
    } finally {
      fs.renameSync = originalRenameSync;
      console.error = originalError;
    }

    assert.deepEqual(store.load(), { theme: 'before' });
    assert.deepEqual(errors, ['Failed to save settings.']);
  });

  it('performs no fallible permission update after replacing settings', () => {
    const store = settingsStore();
    store.save({ theme: 'before' });
    const originalRenameSync = fs.renameSync;
    const originalChmodSync = fs.chmodSync;
    let replaced = false;
    fs.renameSync = (source, target) => {
      const result = originalRenameSync(source, target);
      if (target === store.settingsPath) replaced = true;
      return result;
    };
    fs.chmodSync = (target, mode) => {
      if (replaced && target === store.settingsPath) {
        throw new Error('post-replacement chmod failed');
      }
      return originalChmodSync(target, mode);
    };
    try {
      assert.doesNotThrow(() => store.save({ theme: 'after' }));
    } finally {
      fs.renameSync = originalRenameSync;
      fs.chmodSync = originalChmodSync;
    }

    assert.deepEqual(store.load(), { theme: 'after' });
  });
});
