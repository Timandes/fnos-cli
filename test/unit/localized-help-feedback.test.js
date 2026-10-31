const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, afterEach } = require('mocha');
const { Command } = require('commander');
const { createProgram } = require('../../src');
const { configureLocalization } = require('../../src/i18n/commander');
const { getLanguage } = require('../../src/i18n');
const { Settings } = require('../../src/utils/settings');
const { runCli } = require('../helpers/run-cli');

const homes = [];
function store() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-help-feedback-'));
  homes.push(home);
  return new Settings(home);
}
afterEach(() => {
  process.exitCode = undefined;
  homes.splice(0).forEach(home => fs.rmSync(home, { recursive: true, force: true }));
});

function run(args, settings, env = {}) {
  return runCli(args, path.dirname(settings.settingsDir), { FNOS_LANG: '', ...env });
}

describe('localized help review feedback', () => {
  it('translates excess-argument connectors while retaining the command and counts', () => {
    const settings = store();
    const chinese = run(['config', 'get', 'language', 'extra'], settings);
    assert.equal(chinese.status, 1);
    assert.equal(chinese.stdout, '');
    assert.match(chinese.stderr, /命令 'get'.*参数过多/);
    assert.match(chinese.stderr, /应为 1 个.*实际为 2 个/);
    assert.doesNotMatch(chinese.stderr, /\bfor\b|Expected|arguments/);
    const english = run(['--lang', 'en', 'config', 'get', 'language', 'extra'], settings);
    assert.equal(english.status, 1);
    assert.match(english.stderr, /too many arguments for 'get'/);
    assert.match(english.stderr, /Expected 1.*got 2/);
  });

  it('reports a missing command on stderr for bare and language-only invocations', () => {
    const settings = store();
    for (const [locale, heading] of [['zh-CN', /^用法：/], ['en', /^Usage:/]]) {
      for (const args of [[], ['--lang', locale]]) {
        const result = run(args, settings, { FNOS_LANG: locale });
        assert.equal(result.status, 1, result.stderr);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, heading);
      }
      const explicit = run(['--lang', locale, '--help'], settings);
      assert.equal(explicit.status, 0, explicit.stderr);
      assert.equal(explicit.stderr, '');
      assert.match(explicit.stdout, heading);
    }
  });

  it('resolves language sources for direct help at every command depth', () => {
    const settings = store();
    const env = {};
    const program = createProgram({ settings, env, stdoutIsTTY: false });
    let stdout = '';
    let stderr = '';
    program.configureOutput({ writeOut: value => { stdout += value; }, writeErr: value => { stderr += value; } });
    const levels = [[], ['user'], ['user', 'info'], ['user.info'], ['completion', 'install'], ['config', 'get']];
    for (const [saved, override, locale] of [[null, '', 'zh-CN'], ['en', '', 'en'], ['en', 'zh-CN', 'zh-CN'], ['zh-CN', 'en', 'en']]) {
      if (saved === null) settings.clearLanguage(); else settings.setLanguage(saved);
      env.FNOS_LANG = override;
      const before = settings.exists() ? fs.readFileSync(settings.settingsPath, 'utf8') : null;
      for (const level of levels) {
        stdout = ''; stderr = '';
        const command = level.reduce((parent, name) => parent.commands.find(child => child.name() === name), program);
        command.outputHelp();
        assert.match(stdout, locale === 'en' ? /^Usage:/ : /^用法：/, `help at ${level.join(' ') || 'root'}`);
        assert.equal(stderr, '');
        assert.equal(getLanguage(), 'zh-CN', 'direct help must restore the calling context');
      }
      assert.equal(settings.exists() ? fs.readFileSync(settings.settingsPath, 'utf8') : null, before);
    }
  });

  it('keeps direct error-help on stderr in the selected language', () => {
    const program = createProgram({ settings: store(), env: { FNOS_LANG: 'en' }, stdoutIsTTY: false });
    let stdout = ''; let stderr = '';
    program.configureOutput({ writeOut: value => { stdout += value; }, writeErr: value => { stderr += value; } });
    program.commands.find(command => command.name() === 'user').outputHelp({ error: true });
    assert.equal(stdout, '');
    assert.match(stderr, /^Usage: fnos user/);
  });

  it('keeps parsed argument language above environment when a group action displays help', async () => {
    const program = createProgram({ settings: store(), env: { FNOS_LANG: 'zh-CN' }, stdoutIsTTY: false });
    let output = '';
    program.configureOutput({ writeOut: value => { output += value; } });
    await program.parseAsync(['--lang', 'en', 'user'], { from: 'user' });
    assert.match(output, /^Usage: fnos user/);
    assert.doesNotMatch(output, /用法：|选项：/);
  });

  it('keeps root excess-argument errors free of a phantom command name', async () => {
    const program = new Command('fnos').allowExcessArguments(false).action(() => assert.fail('invalid arguments must not execute'));
    configureLocalization(program, { env: {}, settings: store() }).exitOverride();
    let output = '';
    program.configureOutput({ writeErr: value => { output += value; } });
    await assert.rejects(program.parseAsync(['extra'], { from: 'user' }), error => error.code === 'commander.excessArguments');
    assert.match(output, /参数过多.*应为 0 个.*实际为 1 个/);
    assert.doesNotMatch(output, /undefined|for|命令 ''/);
  });
});
