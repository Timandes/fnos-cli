const { t } = require('../i18n');
const sdk = require('fnos');
const settings = require('./settings');
const clientUtils = require('./client');
const { AuthenticationError } = require('./auth-errors');
const { createOAuthFetch, classifyOAuthClientErrors, validateOAuthEndpoint } = require('./oauth');

/** Create the selected transport and own its lock/connection until dispose. */
async function createSession(options, dependencies = {}) {
  const store = dependencies.settings || settings;
  const sdkModule = dependencies.sdk || sdk;
  let credentials = options.credentials;
  let release;
  let fetch;
  try {
    if (credentials.source === 'settings_file' && !dependencies.createClient) {
      release = await store.acquireServerLock(credentials.serverName);
      const latest = store.getCredentials(credentials.serverName);
      if (!latest) throw new AuthenticationError(t('Saved credentials were removed. Run "fnos login" again.'));
      credentials = { ...latest, source: 'settings_file', serverName: credentials.serverName };
    }
    let client;
    if (credentials.authType === 'oauth') {
      const oauth = credentials.oauth;
      const verifySsl = options.verifySsl === true || oauth.verifySsl === true;
      const endpoint = validateOAuthEndpoint(credentials.endpoint, verifySsl);
      fetch = createOAuthFetch(dependencies.fetch, { verifySsl });
      const adapter = new sdkModule.FnosOAuthAdapter({ endpoint,
        clientId: oauth.clientId, deviceId: oauth.deviceId, deviceName: oauth.deviceName,
        scopes: oauth.scopes, allowInsecureHttp: endpoint.startsWith('http:'), fetch });
      client = new sdkModule.FnosOAuthClient(adapter, oauth.session, {
        fetch,
        saveSession: async next => {
          store.updateOAuthSession(credentials.serverName, credentials, next);
          credentials = { ...credentials, oauth: { ...credentials.oauth, session: next } };
        }
      });
      classifyOAuthClientErrors(client, credentials.serverName);
    } else {
      client = await (dependencies.createClient || clientUtils.createClient)({ ...options, credentials }, dependencies);
    }
    let disposed = false;
    return {
      client,
      async dispose() {
        if (disposed) return;
        disposed = true;
        try { if (typeof client.close === 'function') client.close(); }
        finally {
          if (release) release();
          if (fetch) await fetch.close();
        }
      }
    };
  } catch (error) {
    if (release) release();
    if (fetch) await fetch.close();
    throw error;
  }
}

module.exports = { createSession };
