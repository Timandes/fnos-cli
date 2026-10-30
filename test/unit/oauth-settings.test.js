const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, afterEach } = require('mocha');
const { it } = require('../helpers/english');
const { Settings } = require('../../src/utils/settings');
const { oauthRecord } = require('../helpers/oauth-record');

const homes = [];
function store() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-oauth-settings-'));
  homes.push(home);
  return new Settings(home);
}
afterEach(() => homes.splice(0).forEach(home => fs.rmSync(home, { recursive: true, force: true })));

describe('OAuth credential settings', () => {
  it('defaults old OAuth records to unverified TLS without rewriting them', () => {
    const settings = store();
    const old = oauthRecord();
    delete old.oauth.verifySsl;
    old.oauth.allowInsecureHttp = false;
    settings.save({ servers: { old } });
    const before = fs.readFileSync(settings.settingsPath, 'utf8');
    assert.equal(settings.getCredentials('old').oauth.verifySsl, false);
    assert.equal(fs.readFileSync(settings.settingsPath, 'utf8'), before);
  });

  it('persists strict verification and preserves it when tokens rotate', () => {
    const settings = store();
    settings.saveCredentials('strict', oauthRecord({ verifySsl: true }));
    const identity = settings.getCredentials('strict');
    assert.equal(identity.oauth.verifySsl, true);
    settings.updateOAuthSession('strict', identity, { accessToken: 'next', refreshToken: 'next-refresh', expiresAt: 2100000000 });
    assert.equal(settings.getCredentials('strict').oauth.verifySsl, true);
    assert.equal('allowInsecureHttp' in settings.getCredentials('strict').oauth, false);
  });

  it('allows HTTP without an extra flag and rejects HTTP with strict TLS verification', () => {
    const settings = store();
    const record = { ...oauthRecord(), endpoint: 'http://nas:5666' };
    settings.saveCredentials('http', record);
    assert.equal(settings.getCredentials('http').oauth.verifySsl, false);
    assert.throws(() => settings.saveCredentials('bad', { ...record, oauth: { ...record.oauth, verifySsl: true } }), /Invalid/);
    assert.throws(() => settings.saveCredentials('bad', oauthRecord({ verifySsl: 'true' })), /Invalid/);
  });

  it('round-trips mixed records and omits password material from OAuth', () => {
    const settings = store();
    settings.saveCredentials('old', { endpoint: 'nas:5666', username: 'admin', password: 'pw' });
    settings.saveCredentials('oauth', { ...oauthRecord(), password: 'discard', codeVerifier: 'discard' });
    const saved = settings.getCredentials('oauth');
    assert.deepEqual(saved, oauthRecord());
    assert.equal(settings.getCredentials('old').authType, 'password');
    assert.deepEqual(settings.listServerNamesReadOnly(), ['oauth', 'old']);
    assert.equal(settings.listServers().length, 2);
    assert.equal(fs.statSync(settings.settingsPath).mode & 0o777, 0o600);
  });

  it('does not rewrite unversioned password records while reading mixed settings', () => {
    const settings = store();
    settings.save({ servers: { old: { endpoint: 'nas', username: 'a', password: 'pw' }, oauth: oauthRecord() } });
    const before = fs.readFileSync(settings.settingsPath, 'utf8');
    assert.equal(settings.getCredentials('old').password, 'pw');
    assert.equal(settings.getCredentials('oauth').authType, 'oauth');
    assert.equal(fs.readFileSync(settings.settingsPath, 'utf8'), before);
  });

  it('rejects unknown auth types and incomplete OAuth identities without overwriting settings', () => {
    const settings = store();
    settings.save({ servers: {} });
    for (const record of [
      { authType: 'unknown', endpoint: 'nas', username: 'a', password: 'pw' },
      oauthRecord({ deviceId: '' }), oauthRecord({ session: { accessToken: 'x' } }),
      { ...oauthRecord(), endpoint: 'http://nas', oauth: { ...oauthRecord().oauth, verifySsl: true } }, oauthRecord({ scopes: [] })
    ]) {
      assert.throws(() => settings.saveCredentials('bad', record), /Invalid|Unsupported/);
    }
    assert.deepEqual(settings.load(), { servers: {} });
  });

  it('updates only the matching OAuth session and refuses removed or replaced identities', () => {
    const settings = store();
    settings.saveCredentials('oauth', oauthRecord());
    const identity = settings.getCredentials('oauth');
    settings.saveCredentials('other', { endpoint: 'nas', username: 'a', password: 'pw' });
    const next = { accessToken: 'new-access', refreshToken: 'new-refresh', expiresAt: 2100000000 };
    assert.equal(typeof settings.updateOAuthSession, 'function');
    settings.updateOAuthSession('oauth', identity, next);
    assert.deepEqual(settings.getCredentials('oauth').oauth.session, next);
    assert.equal(settings.getCredentials('other').password, 'pw');
    settings.clearCredentials('oauth');
    assert.throws(() => settings.updateOAuthSession('oauth', identity, next), /changed|removed/);
    settings.saveCredentials('oauth', oauthRecord({ deviceId: 'new-device' }));
    assert.throws(() => settings.updateOAuthSession('oauth', identity, next), /changed|removed/);
  });

  it('releases a server lock when its action fails', async () => {
    const settings = store();
    assert.equal(typeof settings.withServerLock, 'function');
    await assert.rejects(settings.withServerLock('oauth', async () => { throw new Error('failure'); }), /failure/);
    assert.equal(await settings.withServerLock('oauth', async () => 'released'), 'released');
  });
});
