const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const { describe, it } = require('mocha');

function loadSelector() {
  try {
    return require('../../src/utils/server-selector');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' &&
        error.message.includes('../../src/utils/server-selector')) return {};
    throw error;
  }
}

const selector = loadSelector();
const servers = [
  { name: 'zeta', endpoint: 'zeta:5666', username: 'z-user' },
  { name: 'default', endpoint: 'home:5666', username: 'admin' },
  { name: 'alpha', endpoint: 'alpha:5666', username: 'a-user' }
];

function output(isTTY = true) {
  return {
    isTTY,
    values: [],
    write(value) { this.values.push(value); }
  };
}

describe('server selector', () => {
  it('sorts default first and remaining server names lexically', () => {
    assert.equal(typeof selector.sortServers, 'function', 'sortServers must be implemented');
    assert.deepEqual(
      selector.sortServers(servers).map(({ name }) => name),
      ['default', 'alpha', 'zeta']
    );
  });

  it('returns the only server without prompting', async () => {
    assert.equal(typeof selector.selectServer, 'function', 'selectServer must be implemented');
    let prompted = false;

    const selected = await selector.selectServer([servers[0]], {
      input: { isTTY: false },
      output: output(false),
      prompt: async () => {
        prompted = true;
        return '1';
      }
    });

    assert.equal(selected, 'zeta');
    assert.equal(prompted, false);
  });

  it('rejects when no saved server exists', async () => {
    await assert.rejects(
      selector.selectServer([]),
      (error) => error.name === 'ServerSelectionError' &&
        error.exitCode === 3 &&
        /fnos login/.test(error.message)
    );
  });

  it('rejects non-interactive ambiguity with available server names', async () => {
    await assert.rejects(
      selector.selectServer(servers.slice(0, 2), {
        input: { isTTY: false },
        output: output(false)
      }),
      (error) => error.name === 'ServerSelectionError' &&
        error.exitCode === 3 &&
        /--server/.test(error.message) &&
        /default/.test(error.message) &&
        /zeta/.test(error.message)
    );
  });

  it('renders non-sensitive choices and retries invalid input', async () => {
    const target = output();
    const answers = ['9', '2'];

    const selected = await selector.selectServer(servers.slice(0, 2), {
      input: { isTTY: true },
      output: target,
      prompt: async () => answers.shift()
    });

    assert.equal(selected, 'zeta');
    const rendered = target.values.join('');
    assert.match(rendered, /default.*home:5666.*admin/s);
    assert.match(rendered, /zeta.*zeta:5666.*z-user/s);
    assert.match(rendered, /number from 1 to 2/);
    assert.doesNotMatch(rendered, /password|token|secret/i);
  });

  it('maps a closed prompt to a server selection error', async () => {
    await assert.rejects(
      selector.selectServer(servers.slice(0, 2), {
        input: { isTTY: true },
        output: output(),
        prompt: async () => { throw new Error('input closed'); }
      }),
      (error) => error.name === 'ServerSelectionError' &&
        error.exitCode === 3 &&
        /cancelled/.test(error.message)
    );
  });

  it('treats end-of-input as cancellation without prompting again', async () => {
    let calls = 0;
    await assert.rejects(
      selector.selectServer(servers.slice(0, 2), {
        input: { isTTY: true },
        output: output(),
        prompt: async () => {
          calls += 1;
          if (calls === 1) return null;
          throw new Error('prompted after end-of-input');
        }
      }),
      (error) => error.name === 'ServerSelectionError' &&
        error.exitCode === 3
    );
    assert.equal(calls, 1);
  });

  it('reads a selection through the built-in terminal prompt', async () => {
    const input = new PassThrough();
    const target = new PassThrough();
    input.isTTY = true;
    target.isTTY = true;
    target.setEncoding('utf8');
    let rendered = '';
    target.on('data', (value) => { rendered += value; });

    const selection = selector.selectServer(servers.slice(0, 2), {
      input,
      output: target
    });
    input.end('2\n');

    assert.equal(await selection, 'zeta');
    assert.match(rendered, /Server \[1-2\]/);
  });
});
