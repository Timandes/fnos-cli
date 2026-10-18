const sdk = require('fnos');
const settings = require('./settings');
const clientUtils = require('./client');
const { AuthenticationError } = require('./auth-errors');
const { createOAuthFetch } = require('./oauth');

/** Create the selected transport and own its lock/connection until dispose. */
async function createSession(options, dependencies = {}) {
  const store = dependencies.settings || settings;
  const sdkModule = dependencies.sdk || sdk;
  let credentials = options.credentials;
  let release;
  try {
    if (credentials.source === 'settings_file' && !dependencies.createClient) {
      release = await store.acquireServerLock(credentials.serverName);
      const latest = store.getCredentials(credentials.serverName);
      if (!latest) throw new AuthenticationError('Saved credentials were removed. Run "fnos login" again.');
      credentials = { ...latest, source: 'settings_file', serverName: credentials.serverName };
    }
    let client;
    if (credentials.authType === 'oauth') {
      const oauth = credentials.oauth;
      const fetch = createOAuthFetch(dependencies.fetch);
      const adapter = new sdkModule.FnosOAuthAdapter({ endpoint: credentials.endpoint,
        clientId: oauth.clientId, deviceId: oauth.deviceId, deviceName: oauth.deviceName,
        scopes: oauth.scopes, allowInsecureHttp: oauth.allowInsecureHttp === true, fetch });
      client = new sdkModule.FnosOAuthClient(adapter, oauth.session, {
        fetch,
        saveSession: async next => {
          store.updateOAuthSession(credentials.serverName, credentials, next);
          credentials = { ...credentials, oauth: { ...credentials.oauth, session: next } };
        }
      });
      const request = client.requestPayloadWithResponse.bind(client);
      client.requestPayloadWithResponse = async (...args) => {
        try { return await request(...args); }
        catch (error) {
          if (/fnOS API request failed \(HTTP 401\)/.test(error.message)) {
            throw new AuthenticationError(`OAuth access was rejected for server "${credentials.serverName}" after refresh. Run "fnos login --auth oauth --server ${credentials.serverName}" again.`);
          }
          if (/fnOS API request failed \(HTTP 403\)/.test(error.message)) {
            throw new Error('OAuth gateway denied this request (HTTP 403); check token scopes, account permissions and gateway endpoint support.');
          }
          throw error;
        }
      };
    } else {
      client = await (dependencies.createClient || clientUtils.createClient)({ ...options, credentials }, dependencies);
    }
    let disposed = false;
    return {
      client,
      dispose() {
        if (disposed) return;
        disposed = true;
        try { if (typeof client.close === 'function') client.close(); }
        finally { if (release) release(); }
      }
    };
  } catch (error) {
    if (release) release();
    throw error;
  }
}

module.exports = { createSession };
