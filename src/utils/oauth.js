const readline = require('node:readline');
const { webcrypto } = require('node:crypto');
const sdk = require('fnos');
const settings = require('./settings');
const { AuthenticationError } = require('./auth-errors');
const { CommandParameterError } = require('../commands/options');

// oauth4webapi requires Web Crypto, which is not global in all Node 18 invocations.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

/** Validate the origin before any authorization or storage operation. */
function validateOAuthEndpoint(endpoint, allowInsecureHttp = false) {
  try {
    const url = new URL(endpoint);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
        !(url.protocol === 'https:' || (url.protocol === 'http:' && allowInsecureHttp))) throw new Error();
    return url.origin;
  } catch {
    throw new CommandParameterError('OAuth requires an HTTPS origin such as https://nas:5667; HTTP testing requires --allow-insecure-http.');
  }
}

/** Preserve SDK retry behavior, but classify rejected token operations and bound their duration. */
function createOAuthFetch(fetcher = globalThis.fetch) {
  return async (url, init = {}) => {
    const response = await fetcher(url, { ...init, signal: init.signal || AbortSignal.timeout(60000) });
    if (new URL(url).pathname.startsWith('/oauthapi/') && [400, 401, 403].includes(response.status)) {
      throw new AuthenticationError(`OAuth authorization or refresh was rejected (HTTP ${response.status}). Run "fnos login --auth oauth" again.`);
    }
    return response;
  };
}

/** Read a one-time code, cancelling on EOF, SIGINT or the PKCE deadline. */
function terminalAuthorizationCode(pending, { input = process.stdin, output = process.stderr } = {}) {
  return new Promise((resolve, reject) => {
    const terminal = readline.createInterface({ input, output, terminal: true });
    let done = false;
    const finish = (error, code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      process.removeListener('SIGINT', cancel);
      terminal.close();
      if (error) reject(error); else resolve(code);
    };
    const cancel = () => finish(new AuthenticationError('OAuth authorization was cancelled.'));
    const timer = setTimeout(() => finish(new AuthenticationError('OAuth authorization expired; restart login.')), Math.max(0, pending.expiresAt - Date.now()));
    terminal.once('SIGINT', cancel);
    terminal.once('close', cancel);
    process.once('SIGINT', cancel);
    terminal.question('Authorization code: ', code => {
      if (!code.trim()) finish(new AuthenticationError('An authorization code is required.'));
      else finish(null, code.trim());
    });
  });
}

/** Authorize with the browser, validate the account and replace credentials only on success. */
async function loginOAuth(options, dependencies = {}) {
  const endpoint = validateOAuthEndpoint(options.endpoint, options.allowInsecureHttp === true);
  const input = dependencies.input || process.stdin;
  const output = dependencies.output || process.stderr;
  if (!input.isTTY) throw new AuthenticationError('OAuth login requires an interactive terminal. Authorize interactively first, then reuse the saved server.');
  const store = dependencies.settings || settings;
  const sdkModule = dependencies.sdk || sdk;
  const fetch = createOAuthFetch(dependencies.fetch);
  const serverName = options.server || 'default';
  return store.withServerLock(serverName, async () => {
    const adapter = new sdkModule.FnosOAuthAdapter({
      endpoint, deviceName: 'fnos-cli', allowInsecureHttp: options.allowInsecureHttp === true, fetch
    });
    const pending = await adapter.createAuthorizationRequest();
    output.write(`Open this URL in a browser and authorize within 5 minutes:\n${pending.url}\n`);
    let code;
    try { code = await (dependencies.prompt || terminalAuthorizationCode)(pending, { input, output }); }
    catch { throw new AuthenticationError('OAuth authorization was cancelled or expired; restart login.'); }
    let session;
    try { session = await adapter.exchangeCode(code, pending); }
    catch (error) {
      if (/authorization code.*expired|authorization code is required/.test(error.message)) throw new AuthenticationError('OAuth authorization code is missing or expired; restart login.');
      throw error;
    }
    const client = new sdkModule.FnosOAuthClient(adapter, session, { fetch });
    const response = await new sdkModule.User(client).getInfo();
    if (response?.result !== 'succ' || (response.errno !== undefined && response.errno !== 0)) {
      throw new AuthenticationError('OAuth account validation failed (user.info); previous credentials were preserved.');
    }
    session = client.session;
    const username = response.userInfo?.user || response.data?.userInfo?.user;
    const record = {
      authType: 'oauth', endpoint,
      ...(typeof username === 'string' && username ? { username } : {}),
      oauth: {
        clientId: adapter.clientId, deviceId: adapter.deviceId, deviceName: adapter.deviceName,
        scopes: [...adapter.scopes], allowInsecureHttp: adapter.allowInsecureHttp, session
      }
    };
    store.saveCredentials(serverName, record);
    return { server: serverName, authType: 'oauth', endpoint, ...(record.username ? { username } : {}) };
  });
}

module.exports = { loginOAuth, terminalAuthorizationCode, createOAuthFetch, validateOAuthEndpoint };
