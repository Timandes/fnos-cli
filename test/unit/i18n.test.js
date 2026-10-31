const assert = require('node:assert/strict');
const { describe, it } = require('mocha');
let i18n = {};
try { i18n = require('../../src/i18n'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }

describe('language context', () => {
  it('defaults to simplified Chinese', () => {
    assert.equal(typeof i18n.getLanguage, 'function');
    assert.equal(i18n.getLanguage(), 'zh-CN');
    assert.equal(i18n.t('Success'), '成功');
  });
  it('isolates nested and concurrent async contexts', async () => {
    assert.equal(typeof i18n.withLanguage, 'function');
    const values = await Promise.all(['en', 'zh-CN'].map(locale => i18n.withLanguage(locale, async () => {
      await new Promise(resolve => setImmediate(resolve));
      const nested = i18n.withLanguage(locale === 'en' ? 'zh-CN' : 'en', () => i18n.t('Success'));
      return [i18n.t('Success'), nested];
    })));
    assert.deepEqual(values, [['Success', '成功'], ['成功', 'Success']]);
    assert.equal(i18n.getLanguage(), 'zh-CN');
    assert.throws(() => i18n.withLanguage('fr', () => {}));
  });
  it('interpolates literal values once and falls back without losing unknown text', () => {
    assert.equal(typeof i18n.t, 'function');
    assert.equal(i18n.t('Hello {name}', { name: '{other}$&' }), 'Hello {other}$&');
    assert.equal(i18n.t('not in the dictionary'), 'not in the dictionary');
  });
});
