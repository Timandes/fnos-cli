const assert = require('node:assert/strict');
const { Option } = require('commander');
const { describe, it } = require('mocha');

const {
  SERVER_COMPLETION,
  fixedValues,
  getCompletion,
  withCompletion
} = require('../../src/completion/metadata');

describe('completion metadata', () => {
  it('attaches frozen value metadata without changing the target identity', () => {
    const option = new Option('--mode <mode>');
    const completion = fixedValues([0, 'one']);

    assert.equal(withCompletion(option, completion), option);
    assert.deepEqual(getCompletion(option), {
      kind: 'values',
      values: ['0', 'one']
    });
    assert.equal(Object.isFrozen(getCompletion(option)), true);
    assert.equal(Object.isFrozen(getCompletion(option).values), true);
  });

  it('returns null for unannotated targets and exposes immutable server metadata', () => {
    assert.equal(getCompletion(new Option('--plain')), null);
    assert.deepEqual(SERVER_COMPLETION, { kind: 'server' });
    assert.equal(Object.isFrozen(SERVER_COMPLETION), true);
  });
});
