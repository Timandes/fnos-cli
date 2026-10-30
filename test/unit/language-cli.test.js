const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, afterEach } = require('mocha');
const { createProgram } = require('../../src');
const { runCli } = require('../helpers/run-cli');
const { Settings } = require('../../src/utils/settings');
const { COMMAND_CATALOG } = require('../../src/commands/catalog');
const homes = [];
function home() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-language-cli-')); homes.push(dir); return dir; }
afterEach(() => { process.exitCode = undefined; homes.splice(0).forEach(dir => fs.rmSync(dir, { recursive: true, force: true })); });
function cli(args, dir = home(), env = {}) { return runCli(args, dir, { FNOS_LANG: '', ...env }); }

describe('localized CLI language selection', () => {
  it('defaults all help levels to simplified Chinese independent of system locale', () => {
    const dir = home();
    for (const args of [[], ['--help'], ['user'], ['user', '--help'], ['help', 'user'], ['user', 'help', 'info'], ['user.info', '--help']]) {
      const result = cli(args, dir, { LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /用法：/);
      assert.doesNotMatch(result.stdout, /Usage:|Options:|display help for command/);
    }
    assert.equal(fs.existsSync(path.join(dir, '.fnos/settings.json')), false);
  });
  it('applies argument, environment, saved preference, and default precedence', () => {
    const dir = home();
    new Settings(dir).setLanguage('en');
    assert.match(cli(['--help'], dir).stdout, /Usage:/);
    assert.match(cli(['--help'], dir, { FNOS_LANG: 'zh-CN' }).stdout, /用法：/);
    assert.match(cli(['--lang=en', 'user', '--help'], dir, { FNOS_LANG: 'invalid' }).stdout, /Usage:/);
    new Settings(dir).clearLanguage();
    assert.match(cli(['--help'], dir).stdout, /用法：/);
  });
  it('supports option positions and last occurrence wins', () => {
    for (const args of [
      ['--lang', 'en', 'user', 'info', '--help'],
      ['user', '--lang=en', 'info', '--help'],
      ['user', 'info', '--lang', 'en', '--help'],
      ['--lang', 'fr', 'user', 'info', '--help', '--lang=en']
    ]) {
      const result = cli(args);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Usage: fnos user info/);
    }
  });
  it('rejects unsupported or missing explicit languages with exit code 4', () => {
    for (const [args, env] of [[['--lang=fr', '--help'], {}], [['--lang'], {}], [['--lang', '--help'], {}], [['--help'], { FNOS_LANG: 'fr' }]]) {
      const result = cli(args, home(), env);
      assert.equal(result.status, 4, result.stderr);
      assert.match(result.stderr, /zh-CN.*en/);
    }
  });
  it('does not interpret another option value or tokens after -- as a language switch', async () => {
    let resolveLanguage;
    try { ({ resolveLanguage } = require('../../src/i18n/commander')); } catch {}
    assert.equal(typeof resolveLanguage, 'function');
    const program = createProgram();
    const dependencies = { env: {}, settings: new Settings(home()) };
    for (const args of [
      ['login', '-p', '--lang', 'en'], ['login', '-p--lang', 'en'],
      ['user', 'getPreference', '--name', '--lang', 'en'], ['--', '--lang', 'en']
    ]) assert.deepEqual(resolveLanguage(args, program, dependencies), { language: 'zh-CN', source: 'default' });
  });
  it('keeps help, version and completion generation usable with corrupt settings', () => {
    const dir = home();
    const store = new Settings(dir);
    fs.mkdirSync(store.settingsDir);
    fs.writeFileSync(store.settingsPath, '{oops');
    for (const args of [['--help'], ['--version'], ['completion', 'zsh']]) assert.equal(cli(args, dir).status, 0);
    assert.equal(fs.readFileSync(store.settingsPath, 'utf8'), '{oops');
  });
  it('localizes Commander errors without changing their command identifiers', () => {
    for (const [args, pattern] of [
      [['user', 'bad-command'], /未知命令.*bad-command/],
      [['user', 'info', '--bad-option'], /未知选项.*--bad-option/],
      [['user', 'info', '--server'], /--server.*参数/],
      [['config', 'get', 'language', 'extra'], /参数过多/]
    ]) {
      const result = cli(args);
      assert.equal(result.status, 1);
      assert.match(result.stderr, pattern);
      assert.match(cli(['--lang=en', ...args]).stderr, /error:/);
    }
  });
  it('does not leak language between program instances or repeated help calls', async () => {
    const outputs = [];
    const program = createProgram({ settings: new Settings(home()), env: {} }).exitOverride();
    program.configureOutput({ writeOut: value => outputs.push(value) });
    for (const locale of ['en', 'zh-CN']) {
      const start = outputs.length;
      await assert.rejects(program.parseAsync(['--lang', locale, '--help'], { from: 'user' }), error => error.code === 'commander.helpDisplayed');
      const output = outputs.splice(start).join('');
      outputs.push(output);
    }
    assert.match(outputs[0], /Usage:/);
    assert.match(outputs[1], /用法：/);
  });
  it('has translations for every catalog domain, command and business option', () => {
    const en = require('../../src/i18n/en');
    const zh = require('../../src/i18n/zh-CN');
    for (const domain of Object.values(COMMAND_CATALOG)) {
      const texts = [domain.description];
      for (const command of Object.values(domain.commands)) texts.push(command.description, ...command.options.map(option => option.description));
      for (const text of texts) {
        assert.ok(Object.hasOwn(en, text), `missing English: ${text}`);
        assert.ok(Object.hasOwn(zh, text), `missing Chinese: ${text}`);
        assert.notEqual(zh[text], text, `untranslated: ${text}`);
      }
    }
    assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
    for (const key of Object.keys(en)) assert.deepEqual((en[key].match(/\{\w+\}/g) || []).sort(), (zh[key].match(/\{\w+\}/g) || []).sort(), key);
  });
});
