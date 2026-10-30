const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const { describe, it, afterEach } = require('mocha');
const stringWidth = require('string-width');
const { withLanguage } = require('../../src/i18n');
const { formatOutput } = require('../../src/utils/formatter');
const { errorMessage } = require('../../src/utils/errors');
const { selectServer } = require('../../src/utils/server-selector');
const { buildMethodArguments } = require('../../src/commands/options');
const { COMMAND_CATALOG } = require('../../src/commands/catalog');
const { createClientWithCredentials } = require('../../src/utils/client');
const { loginOAuth, terminalAuthorizationCode, validateOAuthEndpoint } = require('../../src/utils/oauth');
const { describeOAuthTransportError } = require('../../src/utils/oauth-transport');
const { runCli } = require('../helpers/run-cli');
const homes = [];
afterEach(() => homes.splice(0).forEach(home => fs.rmSync(home, { recursive: true, force: true })));
function home() { const value = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-localized-runtime-')); homes.push(value); return value; }

describe('localized runtime feedback', () => {
  for (const [locale, words] of [
    ['zh-CN', { success: /成功/, saved: /凭据已保存/, yes: /✓ 是/, no: /✗ 否/, empty: /未返回数据/, required: /--uid.*必需/, select: /选择.*server/, cancelled: /取消/, network: /DNS.*失败/, fallback: /用户名.*密码/ }],
    ['en', { success: /Success/, saved: /Credentials saved/, yes: /✓ Yes/, no: /✗ No/, empty: /No data returned/, required: /--uid.*required/, select: /Select a server/, cancelled: /cancelled/, network: /DNS lookup failed/, fallback: /username.*password/ }]
  ]) {
    it(`renders CLI labels in ${locale} while preserving raw JSON and business strings`, () => withLanguage(locale, () => {
      const response = { result: 'succ', req: 'user.info', data: { credentialsSaved: true, expired: false, username: '原文 server text', customField: 'Hello {value}', constructor: 'original-value' } };
      const human = formatOutput(response);
      assert.match(human, words.success);
      assert.match(human, words.saved);
      assert.match(human, words.yes);
      assert.match(human, words.no);
      assert.match(human, /Custom field/);
      assert.match(human, /Constructor/);
      assert.match(human, /original-value/);
      assert.match(human, /Hello \{value\}/);
      assert.match(human, /原文 server text/);
      assert.match(formatOutput(null), words.empty);
      assert.equal(formatOutput(response, true), JSON.stringify(response, null, 2));
      for (const line of formatOutput(response, false, { columns: 18 }).split('\n')) assert.ok(stringWidth(line) <= 18, line);
    }));
    it(`validates options and renders server interaction in ${locale}`, async () => withLanguage(locale, async () => {
      assert.throws(() => buildMethodArguments(COMMAND_CATALOG.user.commands.getUserTwofaConfig, {}), words.required);
      let output = '';
      const selected = await selectServer([{ name: 'a', endpoint: 'nas-one' }, { name: 'b', endpoint: 'nas-two' }], {
        input: { isTTY: true }, output: { isTTY: true, write: text => { output += text; } }, prompt: async () => '2'
      });
      assert.equal(selected, 'b');
      assert.match(output, words.select);
      await assert.rejects(selectServer([], {}), locale === 'en' ? /No saved servers/ : /没有已保存的 server/);
    }));
    it(`localizes password fallback in ${locale} while retaining server rejection text and errno`, async () => withLanguage(locale, async () => {
      let response = { result: 'fail', errno: 123 };
      let closed = 0;
      class Client {
        async connect() {}
        async login() { return response; }
        close() { closed += 1; }
      }
      const credentials = { endpoint: 'nas', username: 'CaseUser', password: 'pw' };
      const dependencies = { sdk: { FnosClient: Client }, logger: { info() {}, debug() {} } };
      await assert.rejects(createClientWithCredentials(credentials, {}, dependencies), error => error.exitCode === 3 && words.fallback.test(error.message) && /errno: 123/.test(error.message));
      response = { result: 'fail', errno: 456, errmsg: '服务端 server rejection {value} password=SENTINEL' };
      await assert.rejects(createClientWithCredentials(credentials, {}, dependencies), error => {
        const text = errorMessage(error);
        assert.match(text, /服务端 server rejection \{value\}/);
        assert.match(text, /errno: 456/);
        assert.doesNotMatch(text, /SENTINEL/);
        return true;
      });
      assert.equal(closed, 2);
    }));
    it(`localizes OAuth prompts, cancellation and transport hints in ${locale}`, async () => withLanguage(locale, async () => {
      assert.throws(() => validateOAuthEndpoint('ws://nas'), locale === 'en' ? /OAuth requires/ : /OAuth 需要/);
      await assert.rejects(loginOAuth({ endpoint: 'https://nas' }, { input: { isTTY: false } }), locale === 'en' ? /interactive terminal/ : /交互终端/);
      const input = new PassThrough(); input.isTTY = true;
      let output = '';
      const stream = new PassThrough(); stream.isTTY = true;
      stream.on('data', value => { output += value; });
      const pending = terminalAuthorizationCode({ url: 'https://nas/auth', expiresAt: Date.now() + 10000 }, { input, output: stream });
      input.end();
      await assert.rejects(pending, words.cancelled);
      assert.match(output, locale === 'en' ? /Press Enter/ : /按回车/);
      const error = describeOAuthTransportError({ message: 'fetch failed', cause: { code: 'ENOTFOUND' } }, 'https://user:pw@nas/api?code=SECRET');
      assert.match(error.message, words.network);
      assert.match(error.message, /ENOTFOUND/);
      assert.doesNotMatch(error.message, /user:pw|SECRET/);
    }));
  }
  it('keeps the selected language when terminal events originate outside the invocation', async () => {
    const input = new PassThrough(); input.isTTY = true;
    let output = '';
    const stream = new PassThrough(); stream.isTTY = true;
    stream.on('data', value => { output += value; });
    const pending = withLanguage('en', () => terminalAuthorizationCode({ url: 'https://nas/auth', expiresAt: Date.now() + 10000 }, {
      input, output: stream, openBrowser: async () => { throw new Error('no browser'); }
    }));
    input.write('\n');
    await new Promise(resolve => setImmediate(resolve));
    input.end('test-code\n');
    assert.equal(await pending, 'test-code');
    assert.match(output, /Could not open a browser/);
    assert.doesNotMatch(output, /无法打开浏览器/);
  });
  it('localizes the executable error prefix after asynchronous scope unwinds', () => {
    for (const [locale, prefix] of [['en', /^Error:/], ['zh-CN', /^错误：/]]) {
      const result = runCli(['--lang', locale, 'login', '--auth', 'bad', '-e', 'nas'], home(), { FNOS_LANG: '' });
      assert.equal(result.status, 4);
      assert.match(result.stderr, prefix);
      const unsupported = runCli(['--lang', locale, 'completion', 'bash'], home(), { FNOS_LANG: '' });
      assert.equal(unsupported.status, 4);
      assert.match(unsupported.stderr, locale === 'en' ? /unsupported shell/ : /不支持的 shell/);
    }
  });
});
