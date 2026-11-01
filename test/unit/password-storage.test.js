const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { describe, afterEach } = require('mocha');
const { it } = require('../helpers/english');
const { Settings } = require('../../src/utils/settings');
const homes = [];
afterEach(() => { for (const home of homes.splice(0)) fs.rmSync(home, { recursive: true, force: true }); });
function setup() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-encryption-'));
  homes.push(home);
  return new Settings(home);
}
const creds = { endpoint: 'ws://nas:5666', username: 'admin', password: '  密码-SENTINEL  ' };
function raw(store, data) {
  fs.mkdirSync(store.settingsDir, { recursive: true });
  fs.writeFileSync(store.settingsPath, JSON.stringify(data));
}

describe('encrypted password settings', function () {
  this.timeout(60000);
  it('encrypts passwords at rest and decrypts across Settings instances', () => {
    const store = setup();
    store.saveCredentials('home', creds);
    const disk = fs.readFileSync(store.settingsPath, 'utf8');
    assert.ok(!disk.includes(creds.password));
    assert.equal(typeof JSON.parse(disk).servers.home.password, 'object');
    assert.equal(new Settings(path.dirname(store.settingsDir)).getCredentials('home').password, creds.password);
    assert.equal(fs.readFileSync(path.join(store.settingsDir, 'password.key')).length, 32);
    if (process.platform !== 'win32') {
      for (const file of ['password.key', 'settings.json']) assert.equal(fs.statSync(path.join(store.settingsDir, file)).mode & 0o777, 0o600);
    }
  });

  it('uses a fresh nonce on every save and rejects tampered or swapped ciphertext', () => {
    const store = setup();
    store.saveCredentials('home', creds);
    const first = store.load().servers.home.password;
    store.saveCredentials('home', creds);
    assert.notDeepEqual(store.load().servers.home.password, first);
    store.saveCredentials('office', { ...creds, endpoint: 'ws://office:5666' });
    const data = store.load();
    data.servers.office.password = data.servers.home.password;
    raw(store, data);
    const before = fs.readFileSync(store.settingsPath);
    assert.throws(() => store.getCredentials('office'), /decrypt.*password|password.*decrypt/i);
    assert.deepEqual(fs.readFileSync(store.settingsPath), before);
    data.servers.home.password.tag = Buffer.alloc(16).toString('base64');
    raw(store, data);
    assert.throws(() => store.getCredentials('home'), /decrypt.*password|password.*decrypt/i);
  });

  it('migrates raw named and top-level plaintext without losing tokens or preferences', () => {
    const store = setup();
    raw(store, { ...creds, theme: 'dark', language: 'en', servers: { office: { ...creds, token: 'old-token', credentialVersion: 2 } } });
    assert.deepEqual(store.listServerNamesReadOnly(), ['default', 'office']);
    assert.equal(fs.existsSync(path.join(store.settingsDir, 'password.key')), false);
    assert.equal(store.getCredentials().password, creds.password);
    assert.equal(store.getCredentials('office').token, 'old-token');
    const data = store.load();
    assert.equal(data.password, undefined);
    assert.equal(typeof data.servers.office.password, 'object');
    assert.equal(typeof data.servers.default.password, 'object');
    assert.equal(data.theme, 'dark');
    assert.equal(data.language, 'en');
  });

  it('encrypts legacy plaintext during preference writes without creating keys for preference-only settings', () => {
    const store = setup();
    store.setLanguage('en');
    assert.equal(fs.existsSync(path.join(store.settingsDir, 'password.key')), false);
    raw(store, { ...creds, servers: { office: creds } });
    store.setLanguage('zh-CN');
    assert.ok(!fs.readFileSync(store.settingsPath, 'utf8').includes(creds.password));
    assert.equal(store.getCredentials().password, creds.password);
    assert.equal(store.getCredentials('office').password, creds.password);
  });

  it('keeps metadata and logout usable with a missing key, and permits explicit relogin', () => {
    const store = setup();
    store.saveCredentials('home', creds);
    store.saveCredentials('office', { ...creds, username: 'other' });
    const oldOffice = store.load().servers.office;
    fs.unlinkSync(path.join(store.settingsDir, 'password.key'));
    const before = fs.readFileSync(store.settingsPath);
    assert.deepEqual(store.listServerNamesReadOnly(), ['home', 'office']);
    assert.equal(store.listServers().length, 2);
    assert.throws(() => store.getCredentials('home'), /login/i);
    assert.deepEqual(fs.readFileSync(store.settingsPath), before);
    assert.equal(fs.existsSync(path.join(store.settingsDir, 'password.key')), false);
    store.saveCredentials('home', { ...creds, password: 'replacement' }, { allowKeyCreation: true });
    assert.equal(store.getCredentials('home').password, 'replacement');
    assert.deepEqual(store.load().servers.office, oldOffice);
    assert.throws(() => store.getCredentials('office'), /login/i);
    store.clearCredentials('office');
    assert.equal(store.getCredentials('office'), null);
  });

  it('does not create a replacement key during mixed plaintext/encrypted migration', () => {
    const store = setup();
    store.saveCredentials('home', creds);
    const data = store.load();
    data.servers.office = { ...creds };
    raw(store, data);
    const keyPath = path.join(store.settingsDir, 'password.key');
    fs.unlinkSync(keyPath);
    const before = fs.readFileSync(store.settingsPath);
    const log = console.error;
    console.error = () => {};
    try {
      assert.throws(() => store.getCredentials('home'), /login/i);
      assert.equal(fs.existsSync(keyPath), false);
      assert.deepEqual(fs.readFileSync(store.settingsPath), before);
      assert.throws(() => store.setLanguage('en'), /login/i);
      assert.equal(fs.existsSync(keyPath), false);
    } finally { console.error = log; }
    store.saveCredentials('home', { ...creds, password: 'replacement' }, { allowKeyCreation: true });
    assert.equal(store.getCredentials('home').password, 'replacement');
    assert.equal(store.getCredentials('office').password, creds.password);
  });

  it('allows listing and selective logout from mixed records without a key', () => {
    for (const target of ['encrypted', 'plain']) {
      const store = setup();
      store.saveCredentials('encrypted', creds);
      const data = store.load();
      data.servers.plain = { ...creds };
      raw(store, data);
      const before = fs.readFileSync(store.settingsPath);
      fs.unlinkSync(path.join(store.settingsDir, 'password.key'));
      assert.equal(store.listServers().length, 2);
      assert.deepEqual(fs.readFileSync(store.settingsPath), before);
      store.clearCredentials(target);
      assert.equal(store.load().servers[target], undefined);
      const other = target === 'plain' ? 'encrypted' : 'plain';
      assert.deepEqual(store.load().servers[other], data.servers[other]);
      assert.equal(fs.existsSync(path.join(store.settingsDir, 'password.key')), false);
    }
  });

  it('does not recreate a lost key during automatic business password fallback', async () => {
    const { createClientWithCredentials } = require('../../src/utils/client');
    const store = setup();
    store.saveCredentials('home', creds);
    store.saveCredentials('office', creds);
    const credentials = { ...store.getCredentials('home'), source: 'settings_file', serverName: 'home' };
    const before = fs.readFileSync(store.settingsPath);
    const keyPath = path.join(store.settingsDir, 'password.key');
    class Client {
      async connect() { fs.unlinkSync(keyPath); }
      async login() { return { result: 'succ', token: 'new', secret: 'encrypted-secret' }; }
      getDecryptedSecret() { return 'secret'; }
      close() {}
    }
    const log = console.error;
    console.error = () => {};
    try {
      await assert.rejects(createClientWithCredentials(credentials, {}, { settings: store, sdk: { FnosClient: Client }, logger: { info() {}, debug() {} } }), /key|password/i);
    } finally { console.error = log; }
    assert.equal(fs.existsSync(keyPath), false);
    assert.deepEqual(fs.readFileSync(store.settingsPath), before);
  });

  it('permits replacing or deleting a damaged password envelope while preserving other servers', () => {
    for (const bad of [{ tag: 'broken' }, { version: 99 }]) {
      const store = setup();
      store.saveCredentials('home', creds);
      store.saveCredentials('office', creds);
      const data = store.load();
      data.servers.home.password = { ...data.servers.home.password, ...bad };
      raw(store, data);
      assert.throws(() => store.getCredentials('home'));
      assert.equal(store.listServers().length, 2);
      store.saveCredentials('home', { ...creds, password: 'replacement' }, { allowKeyCreation: true });
      assert.equal(store.getCredentials('home').password, 'replacement');
      assert.deepEqual(store.load().servers.office, data.servers.office);
      raw(store, data);
      store.clearCredentials('home');
      assert.equal(store.load().servers.home, undefined);
      assert.deepEqual(store.load().servers.office, data.servers.office);
    }
  });

  it('shows auth.status without decrypting when the key is missing', async () => {
    const { createEnglishProgram } = require('../helpers/english');
    const store = setup();
    store.saveCredentials('home', creds);
    fs.unlinkSync(path.join(store.settingsDir, 'password.key'));
    const before = fs.readFileSync(store.settingsPath);
    const output = [];
    const program = createEnglishProgram({ settings: store, stdout: line => output.push(line), stderr: line => output.push(line) });
    try {
      await program.parseAsync(['node', 'fnos', '--raw', 'auth.status', '--server', 'home']);
      assert.equal(process.exitCode, 0, output.join('\n'));
      const status = JSON.parse(output[0]);
      assert.equal(status.authType, 'password');
      assert.equal(status.endpoint, creds.endpoint);
      assert.equal(status.password, undefined);
      assert.deepEqual(fs.readFileSync(store.settingsPath), before);
    } finally { process.exitCode = undefined; }
  });

  it('does not replace a damaged key or expose its contents in errors', () => {
    const store = setup();
    store.saveCredentials('home', creds);
    const keyPath = path.join(store.settingsDir, 'password.key');
    fs.writeFileSync(keyPath, 'KEY_SECRET_SENTINEL');
    const log = console.error;
    console.error = () => {};
    try {
      for (const operation of [() => store.getCredentials('home'), () => store.saveCredentials('home', creds)]) {
        assert.throws(operation, error => /key|password/i.test(error.message) && !error.message.includes('KEY_SECRET_SENTINEL'));
      }
    } finally { console.error = log; }
    assert.equal(fs.readFileSync(keyPath, 'utf8'), 'KEY_SECRET_SENTINEL');
  });

  it('rejects unknown encryption versions and preserves settings on failed replacement', () => {
    const store = setup();
    store.saveCredentials('home', creds);
    const before = fs.readFileSync(store.settingsPath);
    const originalRename = fs.renameSync;
    fs.renameSync = (from, to) => { if (to === store.settingsPath) throw new Error('replacement failed'); return originalRename(from, to); };
    const originalError = console.error;
    console.error = () => {};
    try { assert.throws(() => store.saveCredentials('home', { ...creds, password: 'NEW_SECRET' }), /replacement failed/); }
    finally { fs.renameSync = originalRename; console.error = originalError; }
    assert.deepEqual(fs.readFileSync(store.settingsPath), before);
    const data = store.load();
    data.servers.home.password.version = 99;
    raw(store, data);
    assert.throws(() => store.getCredentials('home'), /credentials|password/i);
  });

  it('serializes concurrent saves so both servers decrypt with the same key', async () => {
    const store = setup();
    const children = ['one', 'two'].map(name => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['-e', `new (require('./src/utils/settings').Settings)(process.argv[1]).saveCredentials(process.argv[2], {endpoint:'nas',username:'admin',password:process.argv[2]})`, path.dirname(store.settingsDir), name], { cwd: path.resolve(__dirname, '../..') });
      let stderr = '';
      child.stderr.on('data', data => { stderr += data; });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr)));
    }));
    await Promise.all(children);
    assert.equal(store.getCredentials('one').password, 'one');
    assert.equal(store.getCredentials('two').password, 'two');
  });
});

describe('private path protection', () => {
  it('tightens Unix permissions and rejects symlinks instead of changing their targets', function () {
    if (process.platform === 'win32') this.skip();
    const { protectPath } = require('../../src/utils/private-path');
    const store = setup();
    const file = path.join(path.dirname(store.settingsDir), 'target');
    const link = file + '-link';
    fs.writeFileSync(file, 'data', { mode: 0o644 });
    protectPath(file, false, { platform: 'linux' });
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    if (process.platform !== 'win32') {
      fs.symlinkSync(file, link);
      assert.throws(() => protectPath(link, false), /private|permissions/i);
    }
  });

  it('uses a protected current-user Windows ACL and fails closed on subprocess failure', () => {
    const { protectPath } = require('../../src/utils/private-path');
    const store = setup();
    const file = path.join(path.dirname(store.settingsDir), "a'b.txt");
    fs.writeFileSync(file, 'data');
    let received;
    protectPath(file, false, { platform: 'win32', execFileSync: (exe, args, options) => { received = { exe, args, options }; } });
    assert.match(received.exe, /powershell\.exe$/i);
    assert.equal(received.options.env.FNOS_PRIVATE_PATH, file);
    assert.ok(!received.args.join(' ').includes(file));
    // The script creates a fresh ACL rather than retaining explicit grants for other users.
    assert.match(received.args.join(' '), /SetAccessRuleProtection\(\$true,\s*\$false\)/);
    assert.throws(() => protectPath(file, false, { platform: 'win32', execFileSync: () => { throw new Error('ACL_SECRET'); } }), error => /permissions|private/i.test(error.message) && !error.message.includes('ACL_SECRET'));
  });
});

// This test runs in the Windows CI job; Unix mocks cannot verify effective DACLs.
describe('Windows password file ACLs', function () {
  this.timeout(60000);
  it('protects settings, key and directory with only the current user SID', function () {
    if (process.platform !== 'win32') this.skip();
    const store = setup();
    store.saveCredentials('home', creds);
    for (const target of [store.settingsDir, store.settingsPath, path.join(store.settingsDir, 'password.key')]) {
      const script = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $a = Get-Acl -LiteralPath $env:FNOS_ACL_TARGET; $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; [pscustomobject]@{ Protected = $a.AreAccessRulesProtected; Expected = $sid; Owner = $a.GetOwner([System.Security.Principal.SecurityIdentifier]).Value; Rules = @($a.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | ForEach-Object { [pscustomobject]@{ SID = $_.IdentityReference.Value; Allow = $_.AccessControlType.ToString(); Inherited = $_.IsInherited } }) } | ConvertTo-Json -Depth 5 -Compress`;
      const result = JSON.parse(execFileSync(path.win32.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, FNOS_ACL_TARGET: target }, encoding: 'utf8' }).trim().replace(/^\uFEFF/, ''));
      assert.equal(result.Protected, true);
      assert.equal(result.Owner, result.Expected);
      assert.ok(result.Rules.length > 0);
      for (const rule of result.Rules) {
        assert.equal(rule.SID, result.Expected);
        assert.equal(rule.Allow, 'Allow');
        assert.equal(rule.Inherited, false);
      }
    }
    assert.equal(store.getCredentials('home').password, creds.password);
  });
});
