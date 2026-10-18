const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough, Writable } = require('node:stream');
const { describe, it } = require('mocha');
const { terminalAuthorizationCode } = require('../../src/utils/oauth');
let browser = {};
try { browser = require('../../src/utils/browser'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }

function terminal(openBrowser) {
  const input = new PassThrough(); input.isTTY = true;
  let output = '';
  const sink = new Writable({ write(data, _encoding, callback) { output += data.toString(); callback(); } });
  const pending = { url: 'https://nas.example/signin?code_challenge=test', expiresAt: Date.now() + 1000 };
  const result = terminalAuthorizationCode(pending, { input, output: sink, openBrowser });
  return { input, pending, result, output: () => output };
}

describe('OAuth browser launch prompt', () => {
  it('opens the authorization URL on Enter, then accepts the authorization code', async () => {
    let opened;
    const prompt = terminal(async url => { opened = url; });
    // Observe rejection immediately as the original implementation rejects Enter.
    prompt.result.catch(() => {});
    prompt.input.write('\n');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(opened, prompt.pending.url);
    prompt.input.end('one-time-code\n');
    assert.equal(await prompt.result, 'one-time-code');
  });

  it('accepts a pasted code immediately without opening the browser', async () => {
    let opened = false;
    const prompt = terminal(async () => { opened = true; });
    prompt.input.end(' pasted-code \n');
    assert.equal(await prompt.result, 'pasted-code');
    assert.equal(opened, false);
  });

  it('keeps manual authorization usable if the browser command fails', async () => {
    const prompt = terminal(async () => { throw new Error('no desktop browser'); });
    prompt.result.catch(() => {});
    prompt.input.write('\n');
    await new Promise(resolve => setImmediate(resolve));
    assert.match(prompt.output(), /open.*manually/i);
    prompt.input.end('manual-code\n');
    assert.equal(await prompt.result, 'manual-code');
  });

  it('does not lose a pasted code or open twice while a browser launch is pending', async () => {
    let complete;
    let launches = 0;
    const prompt = terminal(() => { launches++; return new Promise(resolve => { complete = resolve; }); });
    prompt.result.catch(() => {});
    prompt.input.write('\n');
    await new Promise(resolve => setImmediate(resolve));
    prompt.input.write('\n');
    prompt.input.end('fast-code\n');
    try {
      assert.equal(await prompt.result, 'fast-code');
      assert.equal(launches, 1);
    } finally { if (complete) complete(); }
  });

  it('still cancels at the authorization deadline while browser opening is pending', async () => {
    const input = new PassThrough(); input.isTTY = true;
    const output = new Writable({ write(_data, _encoding, callback) { callback(); } });
    const result = terminalAuthorizationCode({ url: 'https://nas.example/signin', expiresAt: Date.now() + 20 }, {
      input, output, openBrowser: () => new Promise(() => {})
    });
    input.write('\n');
    await assert.rejects(result, error => error.exitCode === 3 && /expired/.test(error.message));
    assert.equal(input.isPaused(), true);
    input.destroy();
  });
});

describe('default browser process launch', () => {
  it('uses platform openers and passes the complete URL as an argument without a shell', async () => {
    assert.equal(typeof browser.openBrowser, 'function');
    const url = 'https://nas.example/signin?scope=a%20b&code_challenge=x';
    for (const [platform, command, args] of [
      ['darwin', 'open', [url]],
      ['linux', 'xdg-open', [url]],
      ['win32', 'rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    ]) {
      const calls = [];
      await browser.openBrowser(url, { platform, spawn: (...values) => {
        calls.push(values);
        const child = new EventEmitter(); child.unref = () => {};
        setImmediate(() => child.emit('exit', 0));
        return child;
      } });
      assert.equal(calls[0][0], command);
      assert.deepEqual(calls[0][1], args);
      assert.equal(calls[0][2].shell, false);
      assert.equal(calls[0][2].stdio, 'ignore');
    }
  });

  it('reports missing openers and nonzero exit codes to the manual fallback', async () => {
    assert.equal(typeof browser.openBrowser, 'function');
    for (const event of ['error', 'exit']) {
      await assert.rejects(browser.openBrowser('https://nas.example/signin', { spawn: () => {
        const child = new EventEmitter(); child.unref = () => {};
        setImmediate(() => child.emit(event, event === 'error' ? new Error('ENOENT') : 1));
        return child;
      } }));
    }
  });
});
