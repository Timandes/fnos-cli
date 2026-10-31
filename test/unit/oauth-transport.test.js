const assert = require('node:assert/strict');
const { describe } = require('mocha');
const { it } = require('../helpers/english');
const { createOAuthFetch } = require('../../src/utils/oauth');

function fetchFailure(code) {
  return new TypeError('fetch failed', { cause: Object.assign(new Error('RAW_CAUSE_SECRET'), { code }) });
}

describe('OAuth transport diagnostics', () => {
  it('explains an untrusted certificate without leaking the code, credentials or raw cause', async () => {
    const failure = fetchFailure('DEPTH_ZERO_SELF_SIGNED_CERT');
    const request = createOAuthFetch(async () => { throw failure; });
    await assert.rejects(request('https://user:URL_PASSWORD_SECRET@nas.example:5667/oauthapi/third-part/token?code=AUTH_CODE_SECRET', {
      body: JSON.stringify({ code: 'BODY_CODE_SECRET', code_verifier: 'VERIFIER_SECRET' })
    }), error => {
      assert.match(error.message, /TLS.*DEPTH_ZERO_SELF_SIGNED_CERT/i);
      assert.match(error.message, /self.signed/i);
      assert.match(error.message, /NODE_EXTRA_CA_CERTS/);
      assert.match(error.message, /https:\/\/nas.example:5667\/oauthapi\/third-part\/token/);
      assert.doesNotMatch(error.message, /URL_PASSWORD_SECRET|AUTH_CODE_SECRET|BODY_CODE_SECRET|VERIFIER_SECRET|RAW_CAUSE_SECRET/);
      assert.equal(error.exitCode, 1);
      assert.equal(error.cause, failure);
      return true;
    });
  });

  it('distinguishes hostname mismatch from protocol, DNS, connection and timeout failures', async () => {
    for (const [code, expected] of [
      ['ERR_TLS_CERT_ALTNAME_INVALID', /hostname|domain/i],
      ['ERR_SSL_WRONG_VERSION_NUMBER', /protocol|HTTPS.*port/i],
      ['ENOTFOUND', /DNS|resolve/i],
      ['ECONNREFUSED', /connection.*refused/i],
      ['UND_ERR_CONNECT_TIMEOUT', /timed out/i]
    ]) {
      const request = createOAuthFetch(async () => { throw fetchFailure(code); });
      await assert.rejects(request('https://nas.example/oauthapi/refresh'), error => {
        assert.match(error.message, new RegExp(code));
        assert.match(error.message, expected);
        assert.equal(error.exitCode, 1);
        return true;
      });
    }
  });

  it('finds a network failure inside AggregateError and handles request deadline expiry', async () => {
    const aggregate = new TypeError('fetch failed', {
      cause: new AggregateError([Object.assign(new Error('refused'), { code: 'ECONNREFUSED' })])
    });
    await assert.rejects(createOAuthFetch(async () => { throw aggregate; })('https://nas.example/ogh/ac/w'), /ECONNREFUSED/);
    const deadline = Object.assign(new Error('request timed out'), { name: 'TimeoutError' });
    await assert.rejects(createOAuthFetch(async () => { throw deadline; })('https://nas.example/oauthapi/refresh'), error =>
      error.exitCode === 1 && /timed out/i.test(error.message));
  });
});
