const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, describe } = require('mocha');
const { it } = require('../helpers/english');
const { NotConnectedError } = require('fnos');

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
    this.pendingRequests = new Map();
    this.processedMessages = [];
    this.loginResult = {
      result: 'succ', token: 'token', longToken: 'long', secret: 'encrypted', reqid: 'login-1'
    };
    this.tokenResult = {
      result: 'succ', errno: 0, token: 'refreshed', data: {}, reqid: 'token-1', req: 'user.authToken'
    };
  }

  async connect(...args) { this.calls.push(['connect', ...args]); }
  async login(...args) {
    this.calls.push(['login', ...args]);
    if (this.loginError) throw this.loginError;
    return this.loginResult;
  }
  async submitTwofaCode(...args) {
    this.calls.push(['submitTwofaCode', ...args]);
    return { result: 'succ', token: 'token', longToken: 'long', secret: 'encrypted', reqid: 'twofa-1' };
  }
  async loginViaToken(...args) { this.calls.push(['loginViaToken', ...args]); return this.tokenResult; }
  processMessage(message) { this.processedMessages.push(message); }
  getDecryptedSecret() { return 'decrypted'; }
  close() { this.closed = true; }
}

function dependencies(client, saved = []) {
  return {
    sdk: { FnosClient: class { constructor() { return client; } } },
    settings: {
      saveCredentials: (serverName, value) => saved.push([serverName, value])
    },
    logger: { info() {}, debug() {} },
    saved
  };
}

function requireClientApi() {
  assert.equal(typeof clientUtils.createClientWithCredentials, 'function', '0.4 authentication flow must be implemented');
  assert.equal(typeof clientUtils.AuthenticationError, 'function', 'AuthenticationError must be exported');
}

describe('fnos client authentication', () => {
  it('restores the server certificate policy without requiring the flag again', async () => {
    const client = new FakeClient();
    const deps = dependencies(client);
    await clientUtils.createClientWithCredentials({
      endpoint: 'wss://host:5667', username: 'admin', password: 'pw',
      verifySsl: true, source: 'settings_file', serverName: 'strict'
    }, {}, deps);
    assert.deepEqual(client.calls[0], ['connect', 'wss://host:5667', 60000, false, false]);
    assert.equal(deps.saved[0][1].verifySsl, true);
  });

  it('temporarily verifies SSL while migrating old password credentials with a decrypted secret', async () => {
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
    assert.deepEqual(deps.saved[0], ['default', {
      endpoint: 'wss://host:5667', username: 'admin', password: 'pw',
      verifySsl: false,
      credentialVersion: 2, token: 'token', longToken: 'long',
      secret: 'decrypted', secretFormat: 'decrypted-v1'
    }]);
  });

  it('persists strict verification when explicitly saving a password login', async () => {
    const client = new FakeClient();
    const deps = dependencies(client);
    await clientUtils.createClientWithCredentials({
      endpoint: 'wss://host:5667', username: 'admin', password: 'pw', source: 'command_line'
    }, { verifySsl: true, saveCredentials: true, serverName: 'strict' }, deps);
    assert.deepEqual(client.calls[0], ['connect', 'wss://host:5667', 60000, false, false]);
    assert.equal(deps.saved[0][0], 'strict');
    assert.equal(deps.saved[0][1].verifySsl, true);
  });

  for (const savedPolicy of [undefined, false]) {
    for (const validToken of [true, false]) {
      it(`keeps saved verification ${savedPolicy} unchanged after a temporary override with a ${validToken ? 'valid' : 'rejected'} token`, async () => {
        const client = new FakeClient();
        if (!validToken) {
          client.tokenResult = { result: 'fail', errno: 1, errmsg: 'invalid token', data: {}, reqid: 'token-2' };
        }
        const deps = dependencies(client);
        await clientUtils.createClientWithCredentials({
          endpoint: 'wss://host:5667', username: 'admin', password: 'pw',
          ...(savedPolicy === undefined ? {} : { verifySsl: savedPolicy }),
          source: 'settings_file', serverName: 'home', credentialVersion: 2,
          token: 'token', longToken: 'long', secret: 'decrypted', secretFormat: 'decrypted-v1'
        }, { verifySsl: true }, deps);
        assert.deepEqual(client.calls[0], ['connect', 'wss://host:5667', 60000, false, false]);
        if (validToken) assert.equal(deps.saved.length, 0);
        else {
          assert.equal(deps.saved[0][0], 'home');
          assert.equal(deps.saved[0][1].verifySsl, false);
        }
      });
    }
  }

  it('uses valid versioned tokens before password login', async () => {
    requireClientApi();
    const client = new FakeClient();
    const deps = dependencies(client);
    await clientUtils.createClientWithCredentials({
      endpoint: 'host:5666', username: 'admin', password: 'pw',
      source: 'settings_file', serverName: 'default',
      credentialVersion: 2, token: 'token', longToken: 'long', secret: 'decrypted', secretFormat: 'decrypted-v1'
    }, {}, deps);
    assert.equal(client.calls[1][0], 'loginViaToken');
    assert.ok(!client.calls.some(([name]) => name === 'login'));
    assert.equal(deps.saved.length, 0);
  });

  it('falls back from rejected token login to password login', async () => {
    requireClientApi();
    const client = new FakeClient();
    client.tokenResult = { result: 'fail', errno: 1, errmsg: 'invalid token', data: {}, reqid: 'token-2' };
    const deps = dependencies(client);
    await clientUtils.createClientWithCredentials({
      endpoint: 'office:5666', username: 'admin', password: 'pw',
      source: 'settings_file', serverName: 'office',
      credentialVersion: 2, token: 'token', longToken: 'long', secret: 'decrypted', secretFormat: 'decrypted-v1'
    }, {}, deps);
    assert.ok(client.calls.some(([name]) => name === 'login'));
    assert.equal(deps.saved[0][0], 'office');
    assert.equal(deps.saved[0][1].endpoint, 'office:5666');
  });

  it('maps rejected password authentication to exit code 3', async () => {
    requireClientApi();
    const client = new FakeClient();
    client.loginResponse = { result: 'fail', errmsg: 'Invalid credentials' };
    client.loginError = new Error('Invalid credentials');
    const deps = dependencies(client);
    await assert.rejects(
      clientUtils.createClientWithCredentials(
        {
          endpoint: 'host:5666',
          username: 'admin',
          password: 'wrong',
          source: 'settings_file',
          serverName: 'default'
        },
        {},
        deps
      ),
      (error) => error instanceof clientUtils.AuthenticationError &&
        error.exitCode === 3 && error.message === 'Invalid credentials'
    );
    assert.equal(client.closed, true);
    assert.equal(deps.saved.length, 0);
  });

  it('preserves password login connection and protocol errors', async () => {
    requireClientApi();
    const failures = [
      new NotConnectedError('Connection closed during login'),
      new Error('Login timed out')
    ];
    for (const failure of failures) {
      const client = new FakeClient();
      client.loginError = failure;
      await assert.rejects(
        clientUtils.createClientWithCredentials(
          { endpoint: 'host:5666', username: 'admin', password: 'pw', source: 'command_line' },
          {},
          dependencies(client)
        ),
        (error) => error === failure && error.exitCode === undefined
      );
      assert.equal(client.closed, true);
    }
  });

  it('correlates post-connect host name responses with pending SDK requests', async () => {
    requireClientApi();
    const client = new FakeClient();
    await clientUtils.createClientWithCredentials(
      { endpoint: 'host:5666', username: 'admin', password: 'pw', source: 'command_line' },
      {},
      dependencies(client)
    );
    const response = {
      result: 'succ', reqid: 'host-name-1', req: 'appcgi.sysinfo.getHostName', rev: '1',
      data: { hostName: 'mock-host', trimVersion: '1.0.0' }
    };
    let resolved;
    client.pendingRequests.set(response.reqid, {
      timeoutTimer: null,
      future: { resolve: (value) => { resolved = value; } }
    });

    client.processMessage(JSON.stringify(response));

    assert.deepEqual(resolved, response);
    assert.equal(client.pendingRequests.has(response.reqid), false);
    assert.deepEqual(client.processedMessages, []);
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

  it('saves an explicit login to its requested server name', async () => {
    requireClientApi();
    const client = new FakeClient();
    const deps = dependencies(client);

    await clientUtils.createClient({
      endpoint: 'home:5666',
      username: 'admin',
      password: 'pw',
      saveCredentials: true,
      serverName: 'home'
    }, deps);

    assert.equal(deps.saved[0][0], 'home');
    assert.equal(deps.saved[0][1].endpoint, 'home:5666');
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
