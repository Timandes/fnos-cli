const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { describe, it, afterEach } = require('mocha');
const { createProgram } = require('../../src');
const { withLanguage } = require('../../src/i18n');
const { buildCompletionSpec } = require('../../src/completion/spec');
const { renderZsh } = require('../../src/completion/zsh');
const { runCli } = require('../helpers/run-cli');
const directories = [];
afterEach(() => { process.exitCode = undefined; directories.splice(0).forEach(dir => fs.rmSync(dir, { recursive: true, force: true })); });
function directory() { const value = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-localized-completion-')); directories.push(value); return value; }
function specFor(locale) { return withLanguage(locale, () => buildCompletionSpec(createProgram())); }

describe('localized completion and command reference', () => {
  for (const locale of ['en', 'zh-CN']) {
    it(`generates valid source and autoload scripts with ${locale} descriptions`, function() {
      const spec = specFor(locale);
      const lang = spec.options.find(option => option.long === '--lang');
      assert.deepEqual(lang.completion.values, ['zh-CN', 'en']);
      const config = spec.commands.find(command => command.name === 'config');
      for (const name of ['get', 'set', 'unset']) {
        const command = config.commands.find(value => value.name === name);
        assert.deepEqual(command.arguments[0].completion.values, ['language']);
        assert.equal(command.arguments.length, name === 'set' ? 2 : 1);
        if (name === 'set') assert.deepEqual(command.arguments[1].completion.values, ['zh-CN', 'en']);
      }
      for (const format of ['source', 'autoload']) {
        const script = withLanguage(locale, () => renderZsh(spec, { format }));
        const syntax = spawnSync('zsh', ['-n'], { input: script, encoding: 'utf8' });
        if (syntax.error?.code === 'ENOENT') this.skip();
        assert.equal(syntax.status, 0, syntax.stderr);
        assert.match(script, locale === 'en' ? /Get user information/ : /获取用户信息/);
        if (format === 'source') {
          // Executing without compinit exercises the actual fallback, not source text.
          // Exceed argv limits on macOS too, so this catches Linux's E2BIG regression.
          const input = `${script}\n#${'x'.repeat(2 * 1024 * 1024)}\n`;
          const fallback = spawnSync('zsh', ['-df'], { input, encoding: 'utf8' });
          assert.ifError(fallback.error);
          assert.equal(fallback.status, 0, fallback.stderr);
          assert.match(fallback.stderr, locale === 'en' ? /initialize compinit/ : /先初始化 compinit/);
        }
      }
    });
  }
  it('offers language values through a real zsh completion session', function() {
    this.timeout(10000);
    const dir = directory();
    fs.writeFileSync(path.join(dir, '_fnos'), withLanguage('zh-CN', () => renderZsh(specFor('zh-CN'), { format: 'autoload' })));
    for (const value of ['zh-CN', 'en']) {
      const code = [
        'zmodload zsh/zpty',
        'zpty -b child zsh -df',
        `zpty -w child $'PS1="PROMPT> "; setopt AUTO_LIST NO_BEEP; fpath=("$FNOS_TEST_COMPLETION" $fpath); autoload -Uz compinit; compinit -i -D; bindkey "^I" complete-word; print -- READY'`,
        `zpty -r child output '*READY*PROMPT>*' || exit 1`,
        `zpty -w -n child $'fnos config set language ${value[0]}\\t'`,
        `zpty -r child output '*language ${value}*' || exit 1`,
        'print -r -- "$output"',
        'zpty -d child'
      ].join('\n');
      const result = spawnSync('zsh', ['-dfc', code], { env: { ...process.env, FNOS_TEST_COMPLETION: dir }, encoding: 'utf8', timeout: 4000 });
      if (result.error?.code === 'ENOENT') this.skip();
      assert.equal(result.status, 0, result.stderr || result.error?.message);
      assert.ok(result.stdout.includes(`language ${value}`), result.stdout);
    }
  });
  it('generates English reference content regardless of environment and current context', () => {
    const { renderCommandReference } = require('../../scripts/generate-command-reference');
    const english = withLanguage('en', renderCommandReference);
    assert.equal(withLanguage('zh-CN', renderCommandReference), english);
    assert.match(english, /--lang/);
    assert.match(english, /fnos config set language en/);
    const renderer = "process.stdout.write(require('./scripts/generate-command-reference').renderCommandReference())";
    for (const FNOS_LANG of ['en', 'zh-CN']) {
      const result = spawnSync(process.execPath, ['-e', renderer], { cwd: path.resolve(__dirname, '../..'), env: { ...process.env, FNOS_LANG }, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, english);
    }
  });
  it('keeps dynamic server lookup independent of full dictionaries and other heavy modules', () => {
    const home = directory();
    const script = String.raw`
      const Module = require('node:module'); const load = Module._load; const heavy = [];
      Module._load = function(request, parent, ...args) {
        if (['commander','fnos','winston'].includes(request) || /i18n(?:\/index|\/en|\/zh-CN)?$/.test(request)) { heavy.push(request); throw new Error('heavy module: ' + request); }
        return load.call(this, request, parent, ...args);
      };
      process.argv = [process.execPath, './bin/fnos', '__complete', 'server'];
      require('./bin/fnos'); process.stdout.write(heavy.length ? 'HEAVY' : 'LIGHT');
    `;
    const result = spawnSync(process.execPath, ['-e', script], { cwd: path.resolve(__dirname, '../..'), env: { ...process.env, HOME: home }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'LIGHT');
    assert.equal(fs.existsSync(path.join(home, '.fnos')), false);
    fs.mkdirSync(path.join(home, '.fnos'));
    fs.writeFileSync(path.join(home, '.fnos/settings.json'), '{broken');
    const corrupt = spawnSync(process.execPath, ['-e', script], { cwd: path.resolve(__dirname, '../..'), env: { ...process.env, HOME: home }, encoding: 'utf8' });
    assert.equal(corrupt.stdout, 'LIGHT', corrupt.stderr);
    const lookup = runCli(['__complete', 'server'], home, { FNOS_LANG: 'zh-CN' });
    assert.equal(lookup.status, 0);
    assert.equal(lookup.stdout, '');
  });
});
