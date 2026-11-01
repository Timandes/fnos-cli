const assert = require('node:assert/strict');
const { PassThrough, Readable, Writable } = require('node:stream');
const { describe, afterEach } = require('mocha');
const { it, createEnglishProgram } = require('../helpers/english');
const { withLanguage } = require('../../src/i18n');
const { resolveCredentials } = require('../../src/utils/auth-helper');
function resolver(...args) { return require('../../src/utils/password-input').resolvePassword(...args); }
function terminal() {
  const input = new PassThrough();
  input.isTTY = true;
  input.isRaw = false;
  input.setRawMode = value => { input.isRaw = value; };
  let output = '';
  return { input, output: new Writable({ write(chunk, encoding, done) { output += chunk.toString(); done(); } }), text: () => output };
}
afterEach(() => { process.exitCode = undefined; });

describe('password input', () => {
  it('preserves stdin spaces and accepts no newline, LF or CRLF', async () => {
    for (const value of ['  secret  ', '  secret  \n', '  secret  \r\n']) {
      assert.equal(await resolver({ passwordStdin: true }, { input: Readable.from([value]) }), '  secret  ');
    }
  });
  it('rejects empty, multiline and conflicting inputs without echoing secrets', async () => {
    for (const value of ['', '\n', 'SECRET\nSECOND', 'SECRET\rSECOND', 'SECRET\n\n']) {
      await assert.rejects(resolver({ passwordStdin: true }, { input: Readable.from([value]) }), error => error.exitCode === 4 && !error.message.includes('SECRET'));
    }
    await assert.rejects(resolver({ password: 'SECRET', passwordStdin: true }), error => error.exitCode === 4 && /cannot|exclusive/i.test(error.message) && !error.message.includes('SECRET'));
    await assert.rejects(resolver({ password: '' }), error => error.exitCode === 4);
  });
  it('requires an explicit stdin option in a pipe and rejects stdin mode on a TTY', async () => {
    await assert.rejects(resolver({}, { input: Readable.from(['SECRET']) }), error => error.exitCode === 4 && /--password-stdin/.test(error.message));
    await assert.rejects(resolver({ passwordStdin: true }, terminal()), error => error.exitCode === 4);
  });
  it('does not expose underlying stdin errors', async () => {
    const input = new PassThrough();
    const pending = resolver({ passwordStdin: true }, { input });
    input.destroy(new Error('READ_SECRET'));
    await assert.rejects(pending, error => error.exitCode === 4 && !error.message.includes('READ_SECRET'));
  });
  it('hides prompt entry, edits Unicode, ignores arrows and restores the terminal', async () => {
    const tty = terminal();
    const pending = resolver({}, tty);
    assert.equal(tty.input.isRaw, true);
    tty.input.write(Buffer.from('  密码x\x7f\x1b[D!  \r'));
    assert.equal(await pending, '  密码!  ');
    assert.equal(tty.input.isRaw, false);
    assert.equal(tty.input.isPaused(), true);
    assert.equal(tty.input.listenerCount('data'), 0);
    assert.equal(tty.text(), 'Password: \n');
  });
  it('retains the invocation language when terminal events arrive in a different context', async () => {
    const tty = terminal();
    const pending = withLanguage('en', () => resolver({}, tty));
    withLanguage('zh-CN', () => tty.input.end());
    await assert.rejects(pending, /Password input ended/);
  });
  it('restores a pre-existing raw terminal and cleans up on cancellation or EOF', async () => {
    for (const ending of ['\x03', '\x04', 'end', 'error']) {
      const tty = terminal();
      tty.input.isRaw = true;
      const before = process.listenerCount('SIGINT');
      const pending = resolver({}, tty);
      tty.input.write('SECRET');
      if (ending === 'end') tty.input.end();
      else if (ending === 'error') tty.input.destroy(new Error('READ_SECRET'));
      else tty.input.write(ending);
      await assert.rejects(pending, error => !error.message.includes('SECRET'));
      assert.equal(tty.input.isRaw, true);
      assert.equal(tty.input.listenerCount('data'), 0);
      assert.equal(process.listenerCount('SIGINT'), before);
      assert.equal(tty.text(), 'Password: \n');
    }
  });
});

describe('password command integration', () => {
  it('passes stdin password to login and never prints it', async () => {
    let password;
    const lines = [];
    const program = createEnglishProgram({
      input: Readable.from(['LOGIN_SECRET\n']),
      settings: { acquireServerLock: async () => () => {} },
      createClient: async options => { password = options.password; return { close() {} }; },
      stdout: line => lines.push(line), stderr: line => lines.push(line)
    });
    await program.parseAsync(['node', 'fnos', 'login', '-e', 'nas', '-u', 'admin', '--password-stdin']);
    assert.equal(process.exitCode, 0, lines.join('\n'));
    assert.equal(password, 'LOGIN_SECRET');
    assert.ok(!lines.join('\n').includes('LOGIN_SECRET'));
  });
  it('prompts for login only after validating endpoint and username', async () => {
    const tty = terminal();
    let password;
    const program = createEnglishProgram({ ...tty,
      settings: { acquireServerLock: async () => () => {} },
      createClient: async options => { password = options.password; return { close() {} }; }, stdout() {}, stderr() {}
    });
    const parsing = program.parseAsync(['node', 'fnos', 'login', '-e', 'nas', '-u', 'admin']);
    tty.input.write('PROMPT_SECRET\r');
    await parsing;
    assert.equal(password, 'PROMPT_SECRET');
    assert.equal(process.exitCode, 0);
    assert.ok(!tty.text().includes('PROMPT_SECRET'));
  });
  it('rejects OAuth password-stdin before reading or connecting', async () => {
    let connected = false;
    const tty = terminal();
    const lines = [];
    const program = createEnglishProgram({ ...tty,
      loginOAuth: async () => { connected = true; }, stderr: line => lines.push(line), stdout() {}
    });
    await program.parseAsync(['node', 'fnos', 'login', '--auth', 'oauth', '-e', 'https://nas', '--password-stdin']);
    assert.equal(process.exitCode, 4);
    assert.equal(connected, false);
    assert.equal(tty.text(), '');
  });
  it('supports temporary stdin/interactive credentials and preserves saved-server selection', async () => {
    const temporary = { endpoint: 'nas', username: 'admin' };
    const stdin = await resolveCredentials({ ...temporary, passwordStdin: true }, { input: Readable.from(['TEMP_SECRET\n']) });
    assert.equal(stdin.password, 'TEMP_SECRET');
    assert.equal(stdin.source, 'command_line');
    const tty = terminal();
    const pending = resolveCredentials(temporary, tty);
    tty.input.write('INTERACTIVE_SECRET\r');
    assert.equal((await pending).password, 'INTERACTIVE_SECRET');
    await assert.rejects(resolveCredentials({ server: 'home', passwordStdin: true }, tty), error => error.exitCode === 4);
    assert.equal(tty.input.isRaw, false);
    const saved = await resolveCredentials({ server: 'home' }, { ...tty, settingsStore: {
      listServers: () => [{ name: 'home' }], getCredentials: () => ({ ...temporary, password: 'SAVED' })
    } });
    assert.equal(saved.password, 'SAVED');
  });
  it('supports stdin passwords through grouped and dotted business command execution', async () => {
    for (const command of [['sysinfo', 'getHostName'], ['sysinfo.getHostName']]) {
      let password;
      const errors = [];
      const program = createEnglishProgram({ input: Readable.from(['BUSINESS_SECRET\n']),
        createSession: async options => { password = options.credentials.password; return { client: {}, dispose() {} }; },
        getSDKInstance: () => ({ getHostName: async () => ({ result: 'succ' }) }), stdout() {}, stderr: line => errors.push(line)
      });
      await program.parseAsync(['node', 'fnos', ...command, '-e', 'nas', '-u', 'admin', '--password-stdin']);
      assert.equal(process.exitCode, 0, errors.join('\n'));
      assert.equal(password, 'BUSINESS_SECRET');
    }
  });
});
