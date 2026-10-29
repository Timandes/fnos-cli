const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, describe, it } = require('mocha');

const homes = [];
const success = {
  result: 'succ', token: 'TOKEN_SENTINEL', longToken: 'LONG_TOKEN_SENTINEL', secret: 'SECRET_SENTINEL'
};
const challenge = {
  result: 'succ', isBindTwofaSecret: true, isTrustedDevice: false, accessToken: 'ACCESS_TOKEN_SENTINEL'
};

afterEach(() => {
  for (const home of homes.splice(0)) fs.rmSync(home, { recursive: true, force: true });
});

// Only replace network and encryption: exercise real SDK login, response handling,
// CLI persistence, output formatting, error classification and logging together.
function runLogin({ response = success, twofaResponse, raw = false, server, endpoint = 'wss://nas.example:5667',
  saveFailure = false, diagnostic = false } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-password-feedback-'));
  homes.push(home);
  const args = ['node', 'fnos', ...(raw ? ['--raw'] : []), 'login',
    '-e', endpoint, '-u', 'CaseUser', '-p', 'PASSWORD_SENTINEL',
    ...(server ? ['--server', server] : []), ...(twofaResponse ? ['--twofa-code', '654321'] : [])];
  const script = `
    const assert = require('node:assert/strict');
    const { FnosClient } = require('fnos');
    const { createProgram } = require('./src');
    const { createClient } = require('./src/utils/client');
    const { setLogLevel } = require('./src/utils/logger');
    const store = require('./src/utils/settings');
    if (${saveFailure}) store.saveCredentials = () => { throw new Error('Cannot save credentials'); };
    class OfflineClient extends FnosClient {
      async connect() { this.connected = true; this.publicKey = 'offline'; this.sessionId = 'offline'; }
      encryptAuthData(payload) { return payload; }
      decryptLoginSecret() { return 'DECRYPTED_SECRET_SENTINEL'; }
      sendMessage(payload) {
        const response = payload.req === 'user.2fa.loginVerify'
          ? ${JSON.stringify(twofaResponse || null)} : ${JSON.stringify(response)};
        if (payload.req === 'user.login') assert.equal(payload.user, 'CaseUser');
        queueMicrotask(() => this.processMessage(JSON.stringify({ ...response, reqid: payload.reqid })));
      }
    }
    // Calling setup again must not accumulate SDK stderr transports.
    setLogLevel(0);
    const program = createProgram({
      createClient: options => createClient(options, { sdk: { FnosClient: OfflineClient } })
    });
    program.parseAsync(${JSON.stringify(args)}).then(() => {
      if (${diagnostic}) require('fnos/dist/logger').default.error('Unrelated SDK diagnostic');
    });
  `;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', timeout: 5000,
    env: { ...process.env, HOME: home, NO_COLOR: '1' }
  });
  assert.ifError(result.error);
  const settingsFile = path.join(home, '.fnos/settings.json');
  return { ...result, saved: fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : null };
}

function assertNoSecrets(result) {
  assert.doesNotMatch(result.stdout + result.stderr,
    /PASSWORD_SENTINEL|TOKEN_SENTINEL|LONG_TOKEN_SENTINEL|SECRET_SENTINEL|ACCESS_TOKEN_SENTINEL|DECRYPTED_SECRET_SENTINEL|654321/);
}

describe('password login feedback', () => {
  it('confirms login and saved credentials with the selected server and unchanged username', () => {
    const result = runLogin({ server: 'office' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Success/);
    assert.match(result.stdout, /Credentials saved/);
    assert.match(result.stdout, /office/);
    assert.match(result.stdout, /CaseUser/);
    assert.match(result.stdout, /wss:\/\/nas.example:5667/);
    assert.equal(result.saved.servers.office.username, 'CaseUser');
    assert.equal(result.stderr, '');
    assertNoSecrets(result);
  });

  it('outputs only a safe JSON success summary in raw mode with the default server', () => {
    const result = runLogin({ raw: true });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      result: 'succ', server: 'default', authType: 'password',
      endpoint: 'wss://nas.example:5667', username: 'CaseUser', credentialsSaved: true
    });
    assert.ok(result.saved.servers.default.token);
    assert.equal(result.stderr, '');
    assertNoSecrets(result);
  });

  for (const raw of [false, true]) {
    it(`omits URL authentication from ${raw ? 'raw' : 'formatted'} success without changing the saved endpoint`, () => {
      const endpoint = 'wss://proxyuser:PROXY_PASSWORD_SENTINEL@nas.example:5667';
      const result = runLogin({ endpoint, raw });
      assert.equal(result.status, 0, result.stderr);
      assert.doesNotMatch(result.stdout + result.stderr, /PROXY_PASSWORD_SENTINEL|proxyuser/);
      if (raw) assert.equal(JSON.parse(result.stdout).endpoint, 'wss://nas.example:5667');
      else assert.match(result.stdout, /wss:\/\/nas.example:5667/);
      assert.equal(result.saved.servers.default.endpoint, endpoint);
      assertNoSecrets(result);
    });
  }

  it('does not claim success when saving credentials fails', () => {
    const result = runLogin({ saveFailure: true });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Cannot save credentials/);
    assert.equal(result.saved, null);
  });

  for (const response of [
    { result: 'fail', errno: 987654 },
    { result: 'fail', errno: '987654', msg: '  ', errmsg: '' },
    { result: 'fail', errno: 987654, msg: '未知错误' },
    { result: 'fail', errno: 987654, errmsg: 'Unknown error' }
  ]) {
    it(`reports an errno-only rejection once with credential guidance: ${JSON.stringify(response)}`, () => {
      const result = runLogin({ response, raw: true });
      assert.equal(result.status, 3, result.stderr);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr.trim().split('\n').length, 1, result.stderr);
      assert.match(result.stderr, /errno: 987654/);
      assert.match(result.stderr, /username.*case.*password/i);
      assert.doesNotMatch(result.stderr, /未知错误|Unknown error/);
      assert.equal(result.saved, null);
      assertNoSecrets(result);
    });
  }

  it('preserves server messages and errno while redacting their sensitive values', () => {
    const result = runLogin({ response: {
      result: 'fail', errno: 987655, msg: '  ',
      errmsg: 'Account temporarily locked; password=PASSWORD_SENTINEL token=TOKEN_SENTINEL'
    } });
    assert.equal(result.status, 3, result.stderr);
    assert.match(result.stderr, /Account temporarily locked/);
    assert.match(result.stderr, /errno: 987655/);
    assert.equal(result.stderr.trim().split('\n').length, 1, result.stderr);
    assert.equal(result.stdout, '');
    assertNoSecrets(result);
  });

  it('gives useful fallback guidance when the server supplies neither a message nor errno', () => {
    const result = runLogin({ response: { result: 'fail' } });
    assert.equal(result.status, 3, result.stderr);
    assert.match(result.stderr, /username.*case.*password/i);
    assert.doesNotMatch(result.stderr, /未知错误|Unknown error|undefined|null/);
    assert.equal(result.stderr.trim().split('\n').length, 1, result.stderr);
  });

  it('reports two-factor rejection once with its errno and code-specific guidance', () => {
    const result = runLogin({ response: challenge, twofaResponse: { result: 'fail', errno: 987656 } });
    assert.equal(result.status, 3, result.stderr);
    assert.match(result.stderr, /errno: 987656/);
    assert.match(result.stderr, /two-factor.*code/i);
    assert.doesNotMatch(result.stderr, /username.*case|未知错误/);
    assert.equal(result.stderr.trim().split('\n').length, 1, result.stderr);
    assert.equal(result.saved, null);
    assertNoSecrets(result);
  });

  it('preserves two-factor server messages and errno', () => {
    const result = runLogin({ response: challenge,
      twofaResponse: { result: 'fail', errno: 987657, errmsg: 'Code expired' } });
    assert.equal(result.status, 3, result.stderr);
    assert.match(result.stderr, /Code expired/);
    assert.match(result.stderr, /errno: 987657/);
    assert.equal(result.stderr.trim().split('\n').length, 1, result.stderr);
    assertNoSecrets(result);
  });

  it('keeps unrelated SDK errors visible once after repeated logger setup', () => {
    const result = runLogin({ diagnostic: true });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /Unrelated SDK diagnostic/);
    assert.equal(result.stderr.trim().split('\n').length, 1, result.stderr);
    assertNoSecrets(result);
  });
});
