const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { execFileSync } = require('node:child_process');
const { describe, it, before, after } = require('mocha');
const { Settings } = require('../../src/utils/settings');
const { createOAuthFetch, loginOAuth } = require('../../src/utils/oauth');
const { oauthRecord } = require('../helpers/oauth-record');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-oauth-tls-'));
const previousHome = process.env.HOME;
process.env.HOME = directory;
const { createSession } = require('../../src/utils/session');
process.env.HOME = previousHome;

describe('OAuth TLS policy against local servers', function () {
  this.timeout(10000);
  let secure;
  let plain;
  let httpsEndpoint;
  let httpEndpoint;
  const requests = [];

  before(async () => {
    const config = path.join(directory, 'openssl.cnf');
    const key = path.join(directory, 'key.pem');
    const cert = path.join(directory, 'cert.pem');
    fs.writeFileSync(config, '[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=fnOS\n[ext]\nsubjectAltName=DNS:fnOS\n');
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '1', '-config', config, '-keyout', key, '-out', cert], { stdio: 'ignore' });
    const handler = (request, response) => {
      let body = '';
      request.on('data', chunk => { body += chunk; });
      request.on('end', () => {
        requests.push({ route: request.url, body: body ? JSON.parse(body) : {}, tls: Boolean(request.socket.encrypted) });
        response.setHeader('content-type', 'application/json');
        if (request.url === '/oauthapi/third-part/token') response.end(JSON.stringify({ data: { access_token: 'initial', refresh_token: 'initial-refresh', expires_in: 3600 } }));
        else if (request.url === '/oauthapi/refresh') response.end(JSON.stringify({ data: { access_token: 'renewed', refresh_token: 'renewed-refresh', expires_in: 3600 } }));
        else response.end(JSON.stringify([{ result: 'succ', userInfo: { user: 'test-user' } }]));
      });
    };
    secure = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, handler);
    plain = http.createServer(handler);
    for (const server of [secure, plain]) {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    }
    httpsEndpoint = `https://127.0.0.1:${secure.address().port}`;
    httpEndpoint = `http://127.0.0.1:${plain.address().port}`;
  });

  after(async () => {
    for (const server of [secure, plain]) {
      if (server?.listening) {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
      }
    }
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('skips certificate and hostname verification by default without weakening strict or global fetch', async () => {
    const originalTLS = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    const loose = createOAuthFetch();
    const strict = createOAuthFetch(undefined, { verifySsl: true });
    try {
      const response = await loose(httpsEndpoint);
      assert.equal(response.status, 200);
      await response.json();
      await assert.rejects(strict(httpsEndpoint), /DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN/);
      await assert.rejects(globalThis.fetch(httpsEndpoint));
      assert.equal(process.env.NODE_TLS_REJECT_UNAUTHORIZED, originalTLS);
    } finally { await loose.close?.(); await strict.close?.(); }
  });

  it('uses the saved policy for code exchange, later refresh and business requests over HTTPS or HTTP', async () => {
    for (const [index, endpoint] of [httpsEndpoint, httpEndpoint].entries()) {
      const store = new Settings(path.join(directory, `login-${index}`));
      await loginOAuth({ endpoint, server: 'home' }, {
        settings: store, input: { isTTY: true }, output: { write() {} }, prompt: async () => 'test-code'
      });
      const saved = store.getCredentials('home');
      assert.equal(saved.oauth.verifySsl, false);
      saved.oauth.session.expiresAt = 1;
      store.saveCredentials('home', saved);
      const session = await createSession({ credentials: { ...saved, source: 'settings_file', serverName: 'home' } }, { settings: store });
      try { assert.equal((await session.client.requestPayloadWithResponse('user.info', {})).result, 'succ'); }
      finally { await session.dispose(); }
      assert.equal(store.getCredentials('home').oauth.session.refreshToken, 'renewed-refresh');
      assert.equal(store.getCredentials('home').oauth.verifySsl, false);
    }
    assert.ok(requests.some(request => request.route === '/oauthapi/third-part/token' && request.tls));
    assert.ok(requests.some(request => request.route === '/oauthapi/refresh' && request.tls));
    assert.ok(requests.some(request => request.route === '/ogh/ac/w' && !request.tls));
  });

  it('preserves explicit strict verification when restoring a saved server', async () => {
    const store = new Settings(path.join(directory, 'strict'));
    const record = { ...oauthRecord({ verifySsl: true }), endpoint: httpsEndpoint };
    store.saveCredentials('home', record);
    const session = await createSession({ credentials: { ...record, source: 'settings_file', serverName: 'home' } }, { settings: store });
    try { await assert.rejects(session.client.requestPayloadWithResponse('user.info', {}), /DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN/); }
    finally { await session.dispose(); }
    assert.equal(store.getCredentials('home').oauth.verifySsl, true);
  });

  it('treats an older OAuth record without verifySsl as unverified TLS', async () => {
    const store = new Settings(path.join(directory, 'legacy'));
    const record = { ...oauthRecord(), endpoint: httpsEndpoint };
    delete record.oauth.verifySsl;
    record.oauth.allowInsecureHttp = false;
    store.save({ servers: { home: record } });
    const session = await createSession({ credentials: { ...record, source: 'settings_file', serverName: 'home' } }, { settings: store });
    try { assert.equal((await session.client.requestPayloadWithResponse('user.info', {})).result, 'succ'); }
    finally { await session.dispose(); }
  });

  it('rejects strict verification for a saved HTTP server before sending a request', async () => {
    const store = new Settings(path.join(directory, 'http-conflict'));
    const record = { ...oauthRecord(), endpoint: httpEndpoint };
    store.saveCredentials('home', record);
    const before = requests.length;
    await assert.rejects(createSession({ verifySsl: true, credentials: { ...record, source: 'settings_file', serverName: 'home' } }, { settings: store }),
      error => error.exitCode === 4);
    assert.equal(requests.length, before);
    const release = await store.acquireServerLock('home'); release();
  });
});
