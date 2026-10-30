const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { describe, it, afterEach } = require('mocha');
const { Settings } = require('../../src/utils/settings');
const { oauthRecord } = require('../helpers/oauth-record');
const homes = [];
function store() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-language-'));
  homes.push(home);
  return new Settings(home);
}
afterEach(() => homes.splice(0).forEach(home => fs.rmSync(home, { recursive: true, force: true })));

describe('language preferences', () => {
  it('persists only language without migrating legacy credentials', () => {
    const settings = store();
    assert.equal(typeof settings.setLanguage, 'function');
    const original = { endpoint: 'nas', username: 'admin', password: 'pw', servers: { oauth: oauthRecord() }, other: { value: 0 } };
    settings.save(original);
    settings.setLanguage('en');
    assert.equal(settings.getLanguage(), 'en');
    assert.deepEqual(settings.load(), { ...original, language: 'en' });
    assert.equal(fs.statSync(settings.settingsPath).mode & 0o777, 0o600);
    assert.equal(fs.statSync(settings.settingsDir).mode & 0o777, 0o700);
    settings.clearLanguage();
    assert.deepEqual(settings.load(), original);
    assert.equal(settings.getLanguage(), null);
  });
  it('rejects invalid values without creating a settings file', () => {
    const settings = store();
    assert.equal(typeof settings.setLanguage, 'function');
    for (const locale of ['fr', '', null, {}, 'zh']) assert.throws(() => settings.setLanguage(locale));
    settings.clearLanguage();
    assert.equal(settings.exists(), false);
  });
  it('does not overwrite corrupt JSON or non-object settings', () => {
    const settings = store();
    assert.equal(typeof settings.setLanguage, 'function');
    fs.mkdirSync(settings.settingsDir);
    for (const text of ['{oops', '[]', 'null', 'false', '0']) {
      fs.writeFileSync(settings.settingsPath, text);
      assert.throws(() => settings.getLanguage(), error => error.exitCode === 1);
      assert.throws(() => settings.setLanguage('en'), error => error.exitCode === 1);
      assert.throws(() => settings.clearLanguage(), error => error.exitCode === 1);
      assert.equal(fs.readFileSync(settings.settingsPath, 'utf8'), text);
    }
  });
  it('preserves the file when reading or replacement fails', () => {
    const settings = store();
    assert.equal(typeof settings.setLanguage, 'function');
    settings.save({ language: 'zh-CN', other: true });
    const before = fs.readFileSync(settings.settingsPath, 'utf8');
    const read = fs.readFileSync;
    fs.readFileSync = function(file, ...args) {
      if (file === settings.settingsPath) { const error = new Error('denied'); error.code = 'EACCES'; throw error; }
      return read.call(this, file, ...args);
    };
    try { assert.throws(() => settings.setLanguage('en')); } finally { fs.readFileSync = read; }
    const rename = fs.renameSync;
    const log = console.error;
    fs.renameSync = () => { throw new Error('replacement failed'); };
    console.error = () => {};
    try { assert.throws(() => settings.setLanguage('en'), /replacement failed/); }
    finally { fs.renameSync = rename; console.error = log; }
    assert.equal(fs.readFileSync(settings.settingsPath, 'utf8'), before);
  });
  it('preserves language during OAuth rotation and logout', () => {
    const settings = store();
    assert.equal(typeof settings.setLanguage, 'function');
    settings.saveCredentials('oauth', oauthRecord());
    settings.setLanguage('en');
    settings.updateOAuthSession('oauth', settings.getCredentials('oauth'), { accessToken: 'next', refreshToken: 'next-refresh', expiresAt: 2100000000 });
    settings.clearCredentials('oauth');
    assert.equal(settings.getLanguage(), 'en');
  });
  it('merges concurrent credential and preference writes under the settings lock', async () => {
    const settings = store();
    assert.equal(typeof settings.setLanguage, 'function');
    const modulePath = require.resolve('../../src/utils/settings');
    const code = `const { Settings } = require(process.argv[1]); const s = new Settings(process.argv[2]); for(let i=0;i<8;i++) { if(process.argv[3]==='language') s.setLanguage('en'); else s.saveCredentials('office', { endpoint:'nas', username:'a', password:'pw' }); }`;
    await Promise.all(['language', 'credentials'].map(kind => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['-e', code, modulePath, path.dirname(settings.settingsDir), kind], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('exit', status => status === 0 ? resolve() : reject(new Error(stderr)));
    })));
    assert.equal(settings.getLanguage(), 'en');
    assert.equal(settings.getCredentials('office').endpoint, 'nas');
  });
});
