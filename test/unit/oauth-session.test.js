const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, afterEach, after } = require('mocha');
const { Settings } = require('../../src/utils/settings');
const { resolveCredentials } = require('../../src/utils/auth-helper');
const { oauthRecord } = require('../helpers/oauth-record');
const loggerHome = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-session-logger-'));
const originalHome = process.env.HOME;
process.env.HOME = loggerHome;
const { runCommand } = require('../../src/commands/runner');
process.env.HOME = originalHome;
after(() => fs.rmSync(loggerHome, { recursive: true, force: true }));
const { COMMAND_CATALOG } = require('../../src/commands/catalog');
let sessionUtils = {};
try { sessionUtils = require('../../src/utils/session'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
const homes = [];
afterEach(() => homes.splice(0).forEach(home => fs.rmSync(home, { recursive: true, force: true })));
function setup(record = oauthRecord()) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-oauth-session-')); homes.push(home);
  const settings = new Settings(home);
  settings.saveCredentials('oauth', record);
  return { settings, credentials: { ...settings.getCredentials('oauth'), source: 'settings_file', serverName: 'oauth' } };
}
function json(value, status = 200) { return new Response(JSON.stringify(value), { status }); }

describe('persisted OAuth execution sessions', () => {
  it('resolves saved OAuth credentials without a password', async () => {
    const deps = setup();
    const credentials = await resolveCredentials({ server: 'oauth' }, { settingsStore: deps.settings });
    assert.equal(credentials.authType, 'oauth');
    assert.equal(credentials.password, undefined);
  });

  it('refreshes near expiry and persists rotated tokens before the business request', async () => {
    assert.equal(typeof sessionUtils.createSession, 'function');
    const deps = setup(oauthRecord({ session: { accessToken: 'old', refreshToken: 'refresh-old', expiresAt: 1 } }));
    const routes = [];
    const session = await sessionUtils.createSession(deps, { settings: deps.settings, fetch: async (url, init) => {
      const route = new URL(url).pathname; routes.push(route);
      if (route === '/oauthapi/refresh') {
        assert.equal(JSON.parse(init.body).device_id, 'test-device');
        return json({ code: 0, data: { access_token: 'new', refresh_token: 'rotated', expires_in: 3600 } });
      }
      assert.equal(deps.settings.getCredentials('oauth').oauth.session.refreshToken, 'rotated');
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer new');
      return json([{ result: 'succ' }]);
    } });
    try { assert.deepEqual(await session.client.requestPayloadWithResponse('user.info', {}), { result: 'succ' }); }
    finally { session.dispose(); session.dispose(); }
    assert.deepEqual(routes, ['/oauthapi/refresh', '/ogh/ac/w']);
  });

  it('refreshes after 401 and retries the same request only once', async () => {
    assert.equal(typeof sessionUtils.createSession, 'function');
    const deps = setup(); let business = 0; let refresh = 0; const bodies = [];
    const session = await sessionUtils.createSession(deps, { settings: deps.settings, fetch: async (url, init) => {
      if (String(url).endsWith('/refresh')) { refresh++; return json({ data: { access_token: 'new', expires_in: 3600 } }); }
      business++; bodies.push(JSON.parse(init.body)); return json({}, 401);
    } });
    try { await assert.rejects(session.client.requestPayloadWithResponse('user.info', {}), error => error.exitCode === 3); }
    finally { session.dispose(); }
    assert.equal(business, 2); assert.equal(refresh, 1); assert.deepEqual(bodies[0], bodies[1]);
  });

  it('returns authentication failure for rejected refresh and never falls back to password', async () => {
    assert.equal(typeof sessionUtils.createSession, 'function');
    const deps = setup(oauthRecord({ session: { accessToken: 'old', refreshToken: 'refresh-old', expiresAt: 1 } }));
    const session = await sessionUtils.createSession(deps, { settings: deps.settings,
      createClient: () => { throw new Error('must not use WS'); }, fetch: async () => json({ code: 1 }, 400) });
    try { await assert.rejects(session.client.requestPayloadWithResponse('user.info', {}), error => error.exitCode === 3); }
    finally { session.dispose(); }
  });

  it('stops before the API when refreshed credentials cannot be saved', async () => {
    assert.equal(typeof sessionUtils.createSession, 'function');
    const deps = setup(oauthRecord({ session: { accessToken: 'old', refreshToken: 'refresh-old', expiresAt: 1 } }));
    deps.settings.updateOAuthSession = () => { throw new Error('disk full'); };
    let business = 0;
    const session = await sessionUtils.createSession(deps, { settings: deps.settings, fetch: async url => {
      if (String(url).endsWith('/refresh')) return json({ data: { access_token: 'new', expires_in: 3600 } });
      business++; return json({ result: 'succ' });
    } });
    try { await assert.rejects(session.client.requestPayloadWithResponse('user.info', {}), /could not be saved/); }
    finally { session.dispose(); }
    assert.equal(business, 0);
    assert.equal(deps.settings.getCredentials('oauth').oauth.session.accessToken, 'old');
  });

  it('waits for the previous command and reloads its newer session', async () => {
    assert.equal(typeof sessionUtils.createSession, 'function');
    const deps = setup();
    const first = await sessionUtils.createSession(deps, { settings: deps.settings });
    const secondPromise = sessionUtils.createSession(deps, { settings: deps.settings });
    deps.settings.updateOAuthSession('oauth', deps.credentials, { accessToken: 'new', refreshToken: 'new-refresh', expiresAt: 2100000000 });
    first.dispose();
    const second = await secondPromise;
    try { assert.equal(second.client.session.accessToken, 'new'); } finally { second.dispose(); }
  });

  it('runs a business command with OAuth and disposes without calling close', async () => {
    assert.equal(typeof sessionUtils.createSession, 'function');
    const deps = setup(); const output = []; const errors = [];
    const code = await runCommand({ domain: COMMAND_CATALOG.user, definition: COMMAND_CATALOG.user.commands.info,
      options: { server: 'oauth' }, globalOptions: { raw: true } }, {
      settings: deps.settings, resolveCredentials: async () => deps.credentials,
      fetch: async () => json([{ result: 'succ', userInfo: { user: 'admin' } }]),
      stdout: value => output.push(value), stderr: value => errors.push(value)
    });
    assert.equal(code, 0, errors.join('\n'));
    assert.equal(JSON.parse(output[0]).userInfo.user, 'admin');
    const release = await deps.settings.acquireServerLock('oauth'); release();
  });
});
