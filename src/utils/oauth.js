const readline = require('node:readline');
const { webcrypto } = require('node:crypto');
const sdk = require('fnos');
const settings = require('./settings');
const { AuthenticationError } = require('./auth-errors');
const { CommandParameterError } = require('../commands/options');
const { openBrowser } = require('./browser');
const { describeOAuthTransportError } = require('./oauth-transport');
const { Agent } = require('undici');

// oauth4webapi requires Web Crypto, which is not global in all Node 18 invocations.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

/** Validate the origin before any authorization or storage operation. */
function validateOAuthEndpoint(endpoint, verifySsl = false) {
  try {
    const url = new URL(endpoint);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
        !['http:', 'https:'].includes(url.protocol)) throw new Error();
    if (url.protocol === 'http:' && verifySsl) {
      throw new CommandParameterError('--verify-ssl requires an HTTPS endpoint.');
    }
    return url.origin;
  } catch (error) {
    if (error instanceof CommandParameterError) throw error;
    throw new CommandParameterError('OAuth requires an HTTP or HTTPS origin such as https://nas:5667.');
  }
}

/** Preserve SDK retry behavior, but classify rejected token operations and bound their duration. */
function createOAuthFetch(fetcher = globalThis.fetch, { verifySsl = false } = {}) {
  const dispatcher = new Agent({ connect: { rejectUnauthorized: verifySsl === true } });
  const request = async (url, init = {}) => {
    let response;
    try { response = await fetcher(url, {
      ...init, signal: init.signal || AbortSignal.timeout(60000),
      ...(new URL(url).protocol === 'https:' ? { dispatcher } : {})
    }); }
    catch (error) { throw describeOAuthTransportError(error, url); }
    if (new URL(url).pathname.startsWith('/oauthapi/') && [400, 401, 403].includes(response.status)) {
      throw new AuthenticationError(`OAuth authorization or refresh was rejected (HTTP ${response.status}). Run "fnos login --auth oauth" again.`);
    }
    return response;
  };
  request.close = () => dispatcher.destroy();
  return request;
}

/** Give login validation and later commands the same HTTP failure semantics. */
function classifyOAuthClientErrors(client, serverName) {
  const request = client.requestPayloadWithResponse.bind(client);
  client.requestPayloadWithResponse = async (...args) => {
    try { return await request(...args); }
    catch (error) {
      if (/fnOS API request failed \(HTTP 401\)/.test(error.message)) {
        throw new AuthenticationError(`OAuth access was rejected for server "${serverName}" after refresh. Run "fnos login --auth oauth --server ${serverName}" again.`);
      }
      if (/fnOS API request failed \(HTTP 403\)/.test(error.message)) {
        throw new Error('OAuth gateway denied this request (HTTP 403); check token scopes, account permissions and gateway endpoint support.');
      }
      throw error;
    }
  };
  return client;
}

/** Read a one-time code, cancelling on EOF, SIGINT or the PKCE deadline. */
function terminalAuthorizationCode(pending, { input = process.stdin, output = process.stderr, openBrowser: launch = openBrowser } = {}) {
  return new Promise((resolve, reject) => {
    const terminal = readline.createInterface({ input, output, terminal: true });
    let done = false;
    let opening = false;
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
    terminal.on('line', code => {
      if (done) return;
      if (code.trim()) {
        finish(null, code.trim());
        return;
      }
      if (opening) return;
      opening = true;
      Promise.resolve().then(() => {
        if (!done) return launch(pending.url);
      }).catch(() => {
        if (!done) output.write('Could not open a browser. Open the URL above manually, then paste the authorization code.\n');
      }).finally(() => {
        opening = false;
        if (!done) {
          terminal.setPrompt('Authorization code (Enter to reopen browser): ');
          terminal.prompt(true);
        }
      });
    });
    terminal.setPrompt('Press Enter to open the browser, or paste the authorization code: ');
    terminal.prompt();
  });
}

/** Authorize with the browser, validate the account and replace credentials only on success. */
async function loginOAuth(options, dependencies = {}) {
  const verifySsl = options.verifySsl === true;
  const endpoint = validateOAuthEndpoint(options.endpoint, verifySsl);
  const input = dependencies.input || process.stdin;
  const output = dependencies.output || process.stderr;
  if (!input.isTTY) throw new AuthenticationError('OAuth login requires an interactive terminal. Authorize interactively first, then reuse the saved server.');
  const store = dependencies.settings || settings;
  const sdkModule = dependencies.sdk || sdk;
  const fetch = createOAuthFetch(dependencies.fetch, { verifySsl });
  const serverName = options.server || 'default';
  try { return await store.withServerLock(serverName, async () => {
    const adapter = new sdkModule.FnosOAuthAdapter({
      endpoint, deviceName: 'fnos-cli', allowInsecureHttp: endpoint.startsWith('http:'), fetch
    });
    const pending = await adapter.createAuthorizationRequest();
    output.write(`Open this URL in a browser and authorize within 5 minutes:\n${pending.url}\n`);
    let code;
    try { code = await (dependencies.prompt || terminalAuthorizationCode)(pending, { input, output, openBrowser: dependencies.openBrowser }); }
    catch { throw new AuthenticationError('OAuth authorization was cancelled or expired; restart login.'); }
    let session;
    try { session = await adapter.exchangeCode(code, pending); }
    catch (error) {
      if (/authorization code.*expired|authorization code is required/.test(error.message)) throw new AuthenticationError('OAuth authorization code is missing or expired; restart login.');
      throw error;
    }
    const client = classifyOAuthClientErrors(new sdkModule.FnosOAuthClient(adapter, session, { fetch }), serverName);
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
        scopes: [...adapter.scopes], verifySsl, session
      }
    };
    store.saveCredentials(serverName, record);
    return { server: serverName, authType: 'oauth', endpoint, ...(record.username ? { username } : {}) };
  }); } finally { await fetch.close(); }
}

module.exports = { loginOAuth, terminalAuthorizationCode, createOAuthFetch, validateOAuthEndpoint, classifyOAuthClientErrors };
