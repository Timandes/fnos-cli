const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { after, before, describe, it } = require('mocha');
const { COMMAND_CATALOG, COMMAND_COUNT } = require('../../src/commands/catalog');
const { runCli } = require('../helpers/run-cli');

const homes = [];
const home = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-cli-smoke-'));
  homes.push(directory);
  return directory;
};

const requiredValues = {
  direction: '0', disk: 'sda', path: '/mock/path', files: 'vol1/mock-file',
  ifName: 'eth0', processes: '[{"pid":1001,"process":"demo"}]',
  uid: '1000', group: 'users', name: 'theme'
};

function commandArgs(domainName, commandName, definition, dotted) {
  const command = dotted ? [`${domainName}.${commandName}`] : [domainName, commandName];
  const args = ['--raw', ...command, '-e', '127.0.0.1:5666', '-u', 'admin', '-p', 'admin'];
  for (const option of definition.options.filter((item) => item.required)) {
    args.push(option.flag.split(' ')[0], requiredValues[option.name]);
  }
  return args;
}

function waitForMockServer() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 5666 });
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); resolve(); });
    socket.once('timeout', () => { socket.destroy(); reject(new Error('fnos-mock-server is not listening on 127.0.0.1:5666')); });
    socket.once('error', () => reject(new Error('fnos-mock-server is not listening on 127.0.0.1:5666')));
  });
}

describe('fnos CLI smoke tests', function () {
  this.timeout(180000);
  before(waitForMockServer);
  after(() => homes.forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })));

  it('logs in, reuses saved tokens, and preserves unrelated settings on logout', () => {
    const testHome = home();
    const login = runCli(['login', '-e', '127.0.0.1:5666', '-u', 'admin', '-p', 'admin'], testHome);
    assert.equal(login.status, 0, login.stderr || login.error?.message);
    const settingsPath = path.join(testHome, '.fnos', 'settings.json');
    assert.equal(fs.statSync(settingsPath).mode & 0o777, 0o600);
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.equal(data.servers.default.credentialVersion, 2);
    data.theme = 'dark';
    data.servers.default.password = 'wrong-password-to-prove-token-reuse';
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), { mode: 0o600 });
    const query = runCli(['--raw', 'sysinfo', 'getHostName'], testHome);
    assert.equal(query.status, 0, query.stderr || query.error?.message);
    assert.equal(JSON.parse(query.stdout).result, 'succ');
    const logout = runCli(['logout'], testHome);
    assert.equal(logout.status, 0, logout.stderr || logout.error?.message);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(settingsPath, 'utf8')),
      { servers: {}, theme: 'dark' }
    );
  });

  it('keeps named server credentials independent', () => {
    const testHome = home();
    const defaultLogin = runCli([
      'login',
      '-e', '127.0.0.1:5666',
      '-u', 'admin',
      '-p', 'admin'
    ], testHome);
    assert.equal(defaultLogin.status, 0, defaultLogin.stderr || defaultLogin.error?.message);

    const officeLogin = runCli([
      'login',
      '--server', 'office',
      '-e', '127.0.0.1:5666',
      '-u', 'admin',
      '-p', 'admin'
    ], testHome);
    assert.equal(officeLogin.status, 0, officeLogin.stderr || officeLogin.error?.message);

    const query = runCli([
      '--raw',
      'sysinfo', 'getHostName',
      '--server', 'office'
    ], testHome);
    assert.equal(query.status, 0, query.stderr || query.error?.message);
    assert.equal(JSON.parse(query.stdout).result, 'succ');

    const logout = runCli(['logout', '--server', 'office'], testHome);
    assert.equal(logout.status, 0, logout.stderr || logout.error?.message);
    assert.match(logout.stdout, /office/);

    const settingsPath = path.join(testHome, '.fnos', 'settings.json');
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(data.servers.default);
    assert.equal(data.servers.office, undefined);
  });

  it('completes two-factor login', () => {
    const result = runCli([
      'login', '-e', '127.0.0.1:5666', '-u', 'twofauser', '-p', 'admin',
      '--twofa-code', '123456', '--trust-device'
    ], home());
    assert.equal(result.status, 0, result.stderr || result.error?.message);
  });

  for (const dotted of [false, true]) {
    it(`routes all 111 business commands with ${dotted ? 'dotted' : 'grouped'} syntax`, () => {
      assert.equal(COMMAND_COUNT, 111);
      const testHome = home();
      for (const [domainName, domain] of Object.entries(COMMAND_CATALOG)) {
        for (const [commandName, definition] of Object.entries(domain.commands)) {
          const result = runCli(commandArgs(domainName, commandName, definition, dotted), testHome);
          assert.equal(result.status, 0, `${domainName}.${commandName}: ${result.stderr || result.error?.message}`);
          const response = JSON.parse(result.stdout);
          assert.doesNotMatch(String(response.errmsg || ''), /Unknown request type/, `${domainName}.${commandName}`);
        }
      }
    });
  }

  it('rejects invalid business arguments before execution', () => {
    const result = runCli([
      '--raw', 'network', 'list', '--type', '2',
      '-e', '127.0.0.1:5666', '-u', 'admin', '-p', 'admin'
    ], home());
    assert.equal(result.status, 4);
    assert.match(result.stderr, /type/);
  });
});
