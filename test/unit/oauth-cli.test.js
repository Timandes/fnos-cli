const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { describe, it, afterEach } = require('mocha');
const { Settings } = require('../../src/utils/settings');
const { oauthRecord } = require('../helpers/oauth-record');
const homes = [];
afterEach(() => homes.splice(0).forEach(home => fs.rmSync(home, { recursive: true, force: true })));
function setup(responses = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-oauth-cli-')); homes.push(home);
  const settings = new Settings(home);
  const fixture = path.join(home, 'fixture.json');
  fs.writeFileSync(fixture, JSON.stringify({ responses }));
  return { home, settings, fixture };
}
function run(args, context, { input, tty = false } = {}) {
  if (tty) {
    const fixture = JSON.parse(fs.readFileSync(context.fixture)); fixture.tty = true;
    fs.writeFileSync(context.fixture, JSON.stringify(fixture));
  }
  const child = spawn(process.execPath, ['--require', path.resolve(__dirname, '../helpers/oauth-fetch-preload'),
    path.resolve(__dirname, '../../bin/fnos'), ...args], {
    env: { ...process.env, HOME: context.home, FNOS_TEST_OAUTH_FIXTURE: context.fixture },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  });
  let stdout = ''; let stderr = ''; let answered = false;
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => {
    stderr += data;
    if (input && !answered && /authorization code(?: \([^)]*\))?:/i.test(stderr)) { answered = true; child.stdin.end(input + '\n'); }
  });
  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('CLI fixture timed out')); }, 5000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', status => { clearTimeout(timer); resolve({ status, stdout: stdout.trim(), stderr }); });
  });
  return { child, result };
}
function requests(context) {
  try { return fs.readFileSync(context.fixture + '.requests', 'utf8').trim().split('\n').map(line => JSON.parse(line)); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

describe('OAuth CLI subprocess integration', () => {
  it('reports certificate trust failure during code exchange and preserves saved credentials', async () => {
    const context = setup({ '/oauthapi/third-part/token': { error: 'DEPTH_ZERO_SELF_SIGNED_CERT' } });
    context.settings.saveCredentials('home', { endpoint: 'old', username: 'admin', password: 'pw' });
    const result = await run(['login', '--auth', 'oauth', '-s', 'home', '-e', 'https://nas.example', '--raw'], context, { tty: true, input: 'test-code' }).result;
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /DEPTH_ZERO_SELF_SIGNED_CERT/);
    assert.match(result.stderr, /NODE_EXTRA_CA_CERTS/);
    assert.equal(context.settings.getCredentials('home').password, 'pw');
  });

  it('logs in interactively and runs a later business command using the saved server', async () => {
    const context = setup({
      '/oauthapi/third-part/token': { body: { code: 0, data: { access_token: 'access-secret', refresh_token: 'refresh-secret', expires_in: 3600 } } },
      '/ogh/ac/w': { body: [{ result: 'succ', userInfo: { user: 'admin' } }] }
    });
    const login = await run(['login', '--auth', 'oauth', '-s', 'home', '-e', 'https://nas.example', '--raw'], context, { tty: true, input: 'test-code' }).result;
    assert.equal(login.status, 0, login.stderr);
    assert.equal(JSON.parse(login.stdout).authType, 'oauth');
    assert.doesNotMatch(login.stdout + login.stderr, /access-secret|refresh-secret|code_verifier/);
    const query = await run(['user.info', '--server', 'home', '--raw'], context).result;
    assert.equal(query.status, 0, query.stderr);
    assert.equal(JSON.parse(query.stdout).userInfo.user, 'admin');
    assert.equal(context.settings.getCredentials('home').password, undefined);
  });

  it('reports local status without tokens or a network request', async () => {
    const context = setup(); context.settings.saveCredentials('oauth', oauthRecord());
    const result = await run(['auth.status', '-s', 'oauth', '--raw'], context).result;
    assert.equal(result.status, 0, result.stderr);
    const status = JSON.parse(result.stdout);
    assert.equal(status.authType, 'oauth');
    assert.equal(status.expiresAt, 2000000000);
    assert.doesNotMatch(result.stdout + result.stderr, /access-old|refresh-old|password|secret/);
    assert.deepEqual(requests(context), []);
  });

  it('serializes refresh across two CLI processes and reloads the saved rotated token', async () => {
    const context = setup({
      '/oauthapi/refresh': { delay: 80, body: { data: { access_token: 'new', refresh_token: 'rotated', expires_in: 3600 } } },
      '/ogh/ac/w': { body: [{ result: 'succ' }] }
    });
    context.settings.saveCredentials('oauth', oauthRecord({ session: { accessToken: 'old', refreshToken: 'old-refresh', expiresAt: 1 } }));
    const first = run(['user.info', '-s', 'oauth', '--raw'], context);
    const second = run(['user.info', '-s', 'oauth', '--raw'], context);
    const results = await Promise.all([first.result, second.result]);
    results.forEach(result => assert.equal(result.status, 0, result.stderr));
    assert.equal(requests(context).filter(request => request.route === '/oauthapi/refresh').length, 1);
    assert.equal(context.settings.getCredentials('oauth').oauth.session.refreshToken, 'rotated');
  });

  it('waits for an in-flight OAuth command before logout and does not resurrect credentials', async () => {
    const context = setup({ '/ogh/ac/w': { delay: 100, body: [{ result: 'succ' }] } });
    context.settings.saveCredentials('oauth', oauthRecord());
    context.settings.saveCredentials('old', { endpoint: 'nas', username: 'a', password: 'pw' });
    const command = run(['user.info', '-s', 'oauth', '--raw'], context);
    await once(command.child, 'message');
    const logout = run(['logout', '-s', 'oauth'], context);
    assert.equal((await command.result).status, 0);
    assert.equal((await logout.result).status, 0);
    assert.equal(context.settings.getCredentials('oauth'), null);
    assert.equal(context.settings.getCredentials('old').password, 'pw');
  });

  it('preserves raw business failures and distinguishes HTTP authorization failures', async () => {
    for (const [reply, expected] of [
      [{ body: [{ result: 'fail', errno: 9, errmsg: 'denied' }] }, 1],
      [{ status: 403, body: {} }, 1],
      [{ status: 401, body: {} }, 3]
    ]) {
      const context = setup({ '/ogh/ac/w': reply,
        '/oauthapi/refresh': { body: { data: { access_token: 'new', expires_in: 3600 } } } });
      context.settings.saveCredentials('oauth', oauthRecord());
      const result = await run(['user.info', '-s', 'oauth', '--raw'], context).result;
      assert.equal(result.status, expected, result.stderr);
      if (reply.status === undefined) assert.equal(JSON.parse(result.stdout).errno, 9);
      if (reply.status === 403) assert.match(result.stderr, /scope|permission|gateway/i);
    }
  });

  it('rejects noninteractive login immediately and preserves an existing server', async () => {
    const context = setup(); context.settings.saveCredentials('old', { endpoint: 'nas', username: 'a', password: 'pw' });
    const result = await run(['login', '--auth', 'oauth', '-s', 'old', '-e', 'https://nas.example'], context).result;
    assert.equal(result.status, 3, result.stderr);
    assert.equal(context.settings.getCredentials('old').password, 'pw');
    assert.deepEqual(requests(context), []);
  });
});
