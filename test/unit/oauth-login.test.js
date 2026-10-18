const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PassThrough, Writable } = require('node:stream');
const { describe, it, afterEach } = require('mocha');
const { Settings } = require('../../src/utils/settings');
let oauth = {};
try { oauth = require('../../src/utils/oauth'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
const homes = [];
afterEach(() => homes.splice(0).forEach(home => fs.rmSync(home, { recursive: true, force: true })));
function context(fetch) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-oauth-login-'));
  homes.push(home);
  const messages = [];
  return {
    settings: new Settings(home), input: { isTTY: true },
    output: { write: value => messages.push(value) }, messages,
    prompt: async pending => { assert.match(pending.url, /code_challenge_method=S256/); return 'authorization-code'; },
    fetch
  };
}
function json(value, status = 200) { return new Response(JSON.stringify(value), { status }); }

describe('OAuth authorization flow', () => {
  it('uses the released SDK to exchange PKCE code and saves only after user.info succeeds', async () => {
    assert.equal(typeof oauth.loginOAuth, 'function');
    const requests = [];
    const deps = context(async (url, options) => {
      requests.push([new URL(url).pathname, JSON.parse(options.body)]);
      if (String(url).endsWith('/token')) {
        assert.equal(requests[0][1].code, 'authorization-code');
        assert.match(requests[0][1].code_verifier, /^[A-Za-z0-9_-]{43,}$/);
        assert.equal(deps.settings.getCredentials('home'), null);
        return json({ code: 0, data: { access_token: 'access-secret', refresh_token: 'refresh-secret', expires_in: 3600 } });
      }
      assert.equal(new Headers(options.headers).get('authorization'), 'Bearer access-secret');
      return json([{ result: 'succ', userInfo: { user: 'admin' } }]);
    });
    const summary = await oauth.loginOAuth({ endpoint: 'https://nas.example:5667', server: 'home' }, deps);
    const record = deps.settings.getCredentials('home');
    assert.equal(record.authType, 'oauth');
    assert.equal(record.username, 'admin');
    assert.equal(record.oauth.deviceId, requests[0][1].device_id);
    assert.equal(record.oauth.session.refreshToken, 'refresh-secret');
    assert.deepEqual(requests.map(([route]) => route), ['/oauthapi/third-part/token', '/ogh/ac/w']);
    assert.equal(summary.server, 'home');
    assert.doesNotMatch(JSON.stringify(summary) + deps.messages.join(''), /access-secret|refresh-secret|authorization-code|code_verifier/);
    assert.equal(fs.statSync(deps.settings.settingsPath).mode & 0o777, 0o600);
  });

  it('preserves an existing server when validation, exchange or prompting fails', async () => {
    assert.equal(typeof oauth.loginOAuth, 'function');
    for (const failure of ['exchange', 'api', 'cancel', 'expired']) {
      const deps = context(async url => {
        if (String(url).endsWith('/token')) return failure === 'exchange'
          ? json({ code: 9 }, 400)
          : json({ code: 0, data: { access_token: 'x', refresh_token: 'y', expires_in: 3600 } });
        return json([{ result: 'fail', errno: 403 }]);
      });
      deps.settings.saveCredentials('home', { endpoint: 'old', username: 'admin', password: 'pw' });
      const before = fs.readFileSync(deps.settings.settingsPath, 'utf8');
      if (failure === 'cancel') deps.prompt = async () => { throw new Error('cancelled'); };
      if (failure === 'expired') deps.prompt = async pending => { pending.expiresAt = 0; return 'old-code'; };
      await assert.rejects(oauth.loginOAuth({ endpoint: 'https://nas.example', server: 'home' }, deps), error => error.exitCode === 3);
      assert.equal(fs.readFileSync(deps.settings.settingsPath, 'utf8'), before);
    }
  });

  it('rejects noninteractive authorization and invalid origins before networking', async () => {
    assert.equal(typeof oauth.loginOAuth, 'function');
    const deps = context(async () => { throw new Error('must not network'); });
    deps.input.isTTY = false;
    await assert.rejects(oauth.loginOAuth({ endpoint: 'https://nas.example' }, deps), error => error.exitCode === 3);
    deps.input.isTTY = true;
    for (const endpoint of ['nas:5667', 'wss://nas.example', 'https://nas.example/path', 'https://a:b@nas.example']) {
      await assert.rejects(oauth.loginOAuth({ endpoint }, deps), error => error.exitCode === 4);
    }
    await assert.rejects(oauth.loginOAuth({ endpoint: 'http://nas.example', verifySsl: true }, deps), error => error.exitCode === 4);
  });

  it('applies a timeout to token requests and preserves network errors as exit code 1', async () => {
    assert.equal(typeof oauth.loginOAuth, 'function');
    const deps = context(async (_url, init) => { assert.ok(init.signal instanceof AbortSignal); throw new TypeError('fetch failed'); });
    await assert.rejects(oauth.loginOAuth({ endpoint: 'https://nas.example' }, deps), error => error.exitCode !== 3);
  });

  it('classifies first-login HTTP 401 and 403 consistently while preserving old credentials', async () => {
    for (const status of [401, 403]) {
      const deps = context(async url => String(url).includes('/oauthapi/')
        ? json({ data: { access_token: 'access', refresh_token: 'refresh', expires_in: 3600 } })
        : json({}, status));
      deps.settings.saveCredentials('home', { endpoint: 'old', username: 'admin', password: 'pw' });
      const before = fs.readFileSync(deps.settings.settingsPath, 'utf8');
      await assert.rejects(oauth.loginOAuth({ endpoint: 'https://nas.example', server: 'home' }, deps), error => {
        if (status === 401) return error.exitCode === 3 && /login --auth oauth/.test(error.message);
        return error.exitCode !== 3 && /scope|permission|gateway/i.test(error.message);
      });
      assert.equal(fs.readFileSync(deps.settings.settingsPath, 'utf8'), before);
    }
  });

  it('closes the terminal prompt on EOF, cancellation and authorization deadline', async () => {
    assert.equal(typeof oauth.terminalAuthorizationCode, 'function');
    for (const scenario of ['eof', 'cancel', 'timeout']) {
      const input = new PassThrough(); input.isTTY = true;
      const output = new Writable({ write(_data, _encoding, callback) { callback(); } });
      const pending = { expiresAt: Date.now() + (scenario === 'timeout' ? 20 : 1000) };
      const signalListeners = process.listenerCount('SIGINT');
      const answer = oauth.terminalAuthorizationCode(pending, { input, output });
      if (scenario === 'eof') input.end();
      if (scenario === 'cancel') input.write('\u0003');
      await assert.rejects(answer, error => error.exitCode === 3);
      assert.equal(input.isPaused(), true);
      assert.equal(process.listenerCount('SIGINT'), signalListeners);
      input.destroy();
    }
  });
});
