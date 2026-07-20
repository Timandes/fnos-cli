const assert = require('node:assert/strict');
const { describe, it } = require('mocha');
const { resolveCredentials } = require('../../src/utils/auth-helper');

describe('credential resolution', () => {
  it('uses an injected settings store for saved credentials', () => {
    const store = {
      getCredentials: () => ({ endpoint: 'saved:5666', username: 'saved', password: 'saved-pw' })
    };
    let credentials;
    assert.doesNotThrow(() => { credentials = resolveCredentials({}, store); });
    assert.equal(credentials.source, 'settings_file');
  });

  it('maps partial and missing credentials to authentication exit code 3', () => {
    assert.throws(
      () => resolveCredentials({ endpoint: 'partial:5666' }, { getCredentials: () => null }),
      (error) => error.message === 'PARTIAL_CREDENTIALS' && error.exitCode === 3
    );
    assert.throws(
      () => resolveCredentials({}, { getCredentials: () => null }),
      (error) => error.exitCode === 3
    );
  });
});
