const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, describe, it } = require('mocha');

const originalHome = process.env.HOME;
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-cli-client-unit-'));
process.env.HOME = testHome;
const clientUtils = require('../../src/utils/client');

after(() => {
  process.env.HOME = originalHome;
  fs.rmSync(testHome, { recursive: true, force: true });
});

class FakeClient {
  constructor() {
    this.calls = [];
    this.closed = false;
    this.loginResult = {
      result: 'succ', token: 'token', longToken: 'long', secret: 'encrypted', reqid: 'login-1'
    };
    this.tokenResult = {
      result: 'succ', errno: 0, token: 'refreshed', data: {}, reqid: 'token-1', req: 'user.authToken'
    };
  }

  async connect(...args) { this.calls.push(['connect', ...args]); }
  async login(...args) { this.calls.push(['login', ...args]); return this.loginResult; }
  async submitTwofaCode(...args) {
    this.calls.push(['submitTwofaCode', ...args]);
    return { result: 'succ', token: 'token', longToken: 'long', secret: 'encrypted', reqid: 'twofa-1' };
  }
  async loginViaToken(...args) { this.calls.push(['loginViaToken', ...args]); return this.tokenResult; }
  getDecryptedSecret() { return 'decrypted'; }
  close() { this.closed = true; }
}

function dependencies(client, saved = []) {
  return {
    sdk: { FnosClient: class { constructor() { return client; } } },
    settings: { saveCredentials: (value) => saved.push(value) },
    logger: { info() {}, debug() {} },
    saved
  };
}

function requireClientApi() {
  assert.equal(typeof clientUtils.createClientWithCredentials, 'function', '0.4 authentication flow must be implemented');
  assert.equal(typeof clientUtils.AuthenticationError, 'function', 'AuthenticationError must be exported');
}

describe('fnos client authentication', () => {
  it('connects with SSL verification and migrates password credentials with a decrypted secret', async () => {
    requireClientApi();
    const client = new FakeClient();
    const deps = dependencies(client);
    await clientUtils.createClientWithCredentials(
      { endpoint: 'wss://host:5667', username: 'admin', password: 'pw', source: 'settings_file' },
      { timeout: 60, verifySsl: true },
      deps
    );
    assert.deepEqual(client.calls[0], ['connect', 'wss://host:5667', 60000, false, false]);
    assert.equal(client.calls[1][0], 'login');
    assert.deepEqual(deps.saved[0], {
      endpoint: 'wss://host:5667', username: 'admin', password: 'pw',
      credentialVersion: 2, token: 'token', longToken: 'long',
      secret: 'decrypted', secretFormat: 'decrypted-v1'
    });
  });

  it('uses valid versioned tokens before password login', async () => {
    requireClientApi();
    const client = new FakeClient();
    await clientUtils.createClientWithCredentials({
      endpoint: 'host:5666', username: 'admin', password: 'pw', source: 'settings_file',
      credentialVersion: 2, token: 'token', longToken: 'long', secret: 'decrypted', secretFormat: 'decrypted-v1'
    }, {}, dependencies(client));
    assert.equal(client.calls[1][0], 'loginViaToken');
    assert.ok(!client.calls.some(([name]) => name === 'login'));
  });

  it('falls back from rejected token login to password login', async () => {
    requireClientApi();
    const client = new FakeClient();
    client.tokenResult = { result: 'fail', errno: 1, errmsg: 'invalid token', data: {}, reqid: 'token-2' };
    await clientUtils.createClientWithCredentials({
      endpoint: 'host:5666', username: 'admin', password: 'pw', source: 'settings_file',
      credentialVersion: 2, token: 'token', longToken: 'long', secret: 'decrypted', secretFormat: 'decrypted-v1'
    }, {}, dependencies(client));
    assert.ok(client.calls.some(([name]) => name === 'login'));
  });

  it('submits two-factor codes without saving command-line credentials', async () => {
    requireClientApi();
    const client = new FakeClient();
    client.loginResult = { result: 'succ', twofaRequired: true, reqid: 'challenge-1' };
    const deps = dependencies(client);
    await clientUtils.createClientWithCredentials(
      { endpoint: 'host:5666', username: 'twofauser', password: 'pw', source: 'command_line' },
      { twofaCode: '123456', trustDevice: true },
      deps
    );
    assert.deepEqual(client.calls.find(([name]) => name === 'submitTwofaCode'), ['submitTwofaCode', '123456', true, 10000]);
    assert.equal(deps.saved.length, 0);
  });

  it('rejects missing and malformed two-factor codes with exit code 3', async () => {
    requireClientApi();
    for (const twofaCode of [undefined, 'abcdef']) {
      const client = new FakeClient();
      client.loginResult = { result: 'succ', twofaRequired: true, reqid: 'challenge-2' };
      await assert.rejects(
        clientUtils.createClientWithCredentials(
          { endpoint: 'host:5666', username: 'twofauser', password: 'pw' },
          { twofaCode },
          dependencies(client)
        ),
        (error) => error instanceof clientUtils.AuthenticationError && error.exitCode === 3
      );
      assert.equal(client.closed, true);
    }
  });

  it('rejects accounts that must bind two-factor authentication', async () => {
    requireClientApi();
    const client = new FakeClient();
    client.loginResult = { result: 'succ', twofaSetupRequired: true, reqid: 'setup-1' };
    await assert.rejects(
      clientUtils.createClientWithCredentials(
        { endpoint: 'host:5666', username: 'twofauser', password: 'pw' },
        { twofaCode: '123456' },
        dependencies(client)
      ),
      /bind two-factor authentication/
    );
    assert.equal(client.closed, true);
  });

  it('creates clients from the public options API and rejects missing identities', async () => {
    requireClientApi();
    const client = new FakeClient();
    await clientUtils.createClient({
      endpoint: 'host:5666', username: 'admin', password: 'pw', saveCredentials: true
    }, dependencies(client));
    assert.ok(client.calls.some(([name]) => name === 'login'));
    await assert.rejects(
      clientUtils.createClient({}, dependencies(new FakeClient())),
      (error) => error instanceof clientUtils.AuthenticationError && error.exitCode === 3
    );
  });

  it('registers exactly the 21 approved SDK classes', () => {
    assert.ok(Array.isArray(clientUtils.SDK_CLASS_NAMES), 'SDK class registry must be exported');
    assert.equal(clientUtils.SDK_CLASS_NAMES.length, 21);
    const FakeDomain = class { constructor(client) { this.client = client; } };
    const sdk = Object.fromEntries(clientUtils.SDK_CLASS_NAMES.map((name) => [name, FakeDomain]));
    assert.ok(clientUtils.getSDKInstance({ id: 1 }, 'DockerManager', sdk) instanceof FakeDomain);
    assert.throws(() => clientUtils.getSDKInstance({}, 'Unknown', sdk), /Unknown SDK class/);
  });
});
