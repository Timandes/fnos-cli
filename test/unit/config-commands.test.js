const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, afterEach } = require('mocha');
const { runCli } = require('../helpers/run-cli');
const { Settings } = require('../../src/utils/settings');
const homes = [];
afterEach(() => homes.splice(0).forEach(home => fs.rmSync(home, { recursive: true, force: true })));
function setup() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-config-'));
  homes.push(home);
  return { home, store: new Settings(home), cli: (args, env = {}) => runCli(args, home, { FNOS_LANG: '', ...env }) };
}
function json(result) { assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); }

describe('language config commands', () => {
  it('persists and clears preferences across processes with stable raw summaries', () => {
    const { cli, store } = setup();
    const original = { endpoint: 'legacy', username: 'a', password: 'secret-sentinel', other: true };
    store.save(original);
    assert.deepEqual(json(cli(['config', 'get', 'language', '--raw'])), { language: null, effectiveLanguage: 'zh-CN', source: 'default' });
    assert.deepEqual(json(cli(['config', 'set', 'language', 'en', '--raw'])), { language: 'en' });
    assert.deepEqual(json(cli(['config', 'get', 'language', '--raw'])), { language: 'en', effectiveLanguage: 'en', source: 'settings' });
    assert.deepEqual(json(cli(['--lang=zh-CN', 'config', 'get', 'language', '--raw'])), { language: 'en', effectiveLanguage: 'zh-CN', source: 'argument' });
    assert.deepEqual(json(cli(['config', 'get', 'language', '--raw'], { FNOS_LANG: 'zh-CN' })), { language: 'en', effectiveLanguage: 'zh-CN', source: 'environment' });
    assert.deepEqual(json(cli(['config', 'unset', 'language', '--raw'])), { language: null });
    assert.deepEqual(store.load(), original);
    assert.doesNotMatch(cli(['config', 'get', 'language']).stdout, /secret-sentinel|password/);
  });
  it('uses the invocation language for confirmation and the saved language on the next call', () => {
    const { cli } = setup();
    assert.match(cli(['config', 'set', 'language', 'en']).stdout, /语言/);
    assert.match(cli(['config', 'unset', 'language']).stdout, /Language/);
    assert.match(cli(['config', 'get', 'language']).stdout, /语言/);
  });
  it('rejects unknown keys and values without writes or credential exposure', () => {
    const { cli, store } = setup();
    store.save({ password: 'sentinel', language: 'en' });
    const before = fs.readFileSync(store.settingsPath, 'utf8');
    for (const args of [['get', 'password'], ['set', 'language', 'fr'], ['unset', 'servers']]) {
      const result = cli(['config', ...args]);
      assert.equal(result.status, 4, result.stderr);
      assert.doesNotMatch(result.stdout + result.stderr, /sentinel/);
    }
    assert.equal(fs.readFileSync(store.settingsPath, 'utf8'), before);
  });
  it('refuses corrupt settings but leaves a missing file absent on unset', () => {
    const { cli, store } = setup();
    assert.deepEqual(json(cli(['config', 'unset', 'language', '--raw'])), { language: null });
    assert.equal(store.exists(), false);
    fs.mkdirSync(store.settingsDir, { recursive: true });
    fs.writeFileSync(store.settingsPath, '{broken');
    for (const args of [['get', 'language'], ['set', 'language', 'en'], ['unset', 'language']]) assert.equal(cli(['config', ...args]).status, 1);
    assert.equal(fs.readFileSync(store.settingsPath, 'utf8'), '{broken');
  });
});
