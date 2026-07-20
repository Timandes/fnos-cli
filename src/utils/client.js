/**
 * FnosClient wrapper with fnos 0.4 authentication.
 */

const sdk = require('fnos');
const settings = require('./settings');
const { logger } = require('./logger');

const SDK_CLASS_NAMES = [
  'ResourceMonitor', 'Store', 'SystemInfo', 'User', 'Network', 'File', 'SAC',
  'DockerManager', 'EventLogger', 'Share', 'Notify', 'IscsiManager',
  'BackupManager', 'DownloadCenter', 'IPBlocker', 'LicenseManager',
  'LiveUpdate', 'MountManager', 'NetworkServer', 'Security', 'SystemRestore'
];

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.exitCode = 3;
  }
}

function canUseToken(credentials) {
  return credentials.credentialVersion === 2 &&
    credentials.secretFormat === 'decrypted-v1' &&
    [credentials.token, credentials.longToken, credentials.secret]
      .every((value) => typeof value === 'string' && value.length > 0);
}

function tokenLoginSucceeded(result) {
  return Boolean(result && (result.result === 'succ' || result.errno === 0));
}

async function passwordLogin(client, credentials, options) {
  if (!credentials.password) throw new AuthenticationError('Password is required.');
  let result = await client.login(credentials.username, credentials.password, 10000);
  if (!result) throw new AuthenticationError('Login failed.');
  if (result.twofaSetupRequired) {
    throw new AuthenticationError('This account must bind two-factor authentication in the fnOS web interface first.');
  }
  if (result.twofaRequired) {
    if (!/^\d{6}$/.test(options.twofaCode || '')) {
      throw new AuthenticationError('A six-digit --twofa-code is required for this account.');
    }
    result = await client.submitTwofaCode(options.twofaCode, options.trustDevice === true, 10000);
  }
  if (!result || result.result !== 'succ' || !result.token || !result.secret) {
    throw new AuthenticationError(result?.msg || result?.errmsg || 'Login failed.');
  }
  return result;
}

async function createClientWithCredentials(credentials, options = {}, dependencies = {}) {
  const sdkModule = dependencies.sdk || sdk;
  const settingsStore = dependencies.settings || settings;
  const activeLogger = dependencies.logger || logger;
  const Client = sdkModule.FnosClient;
  const client = new Client();
  const timeout = options.timeout ?? 60;

  try {
    activeLogger.info(`Connecting to ${credentials.endpoint}...`);
    await client.connect(credentials.endpoint, timeout * 1000, false, options.verifySsl === true ? false : true);
    let result;
    let usedToken = false;

    if (canUseToken(credentials)) {
      result = await client.loginViaToken(credentials.token, credentials.longToken, credentials.secret, 10000);
      usedToken = tokenLoginSucceeded(result);
      if (!usedToken) activeLogger.debug('Saved token was rejected; falling back to password login.');
    }

    if (!usedToken) {
      result = await passwordLogin(client, credentials, options);
      if (options.saveCredentials || credentials.source === 'settings_file') {
        const decryptedSecret = client.getDecryptedSecret();
        if (typeof decryptedSecret !== 'string' || decryptedSecret.length === 0) {
          throw new AuthenticationError('Login secret decryption failed.');
        }
        settingsStore.saveCredentials({
          endpoint: credentials.endpoint,
          username: credentials.username,
          password: credentials.password,
          credentialVersion: 2,
          token: result.token || null,
          longToken: result.longToken || null,
          secret: decryptedSecret,
          secretFormat: 'decrypted-v1'
        });
      }
    }

    return client;
  } catch (error) {
    client.close();
    throw error;
  }
}

async function createClient(options = {}, dependencies = {}) {
  const credentials = options.credentials || {
    endpoint: options.endpoint,
    username: options.username,
    password: options.password,
    source: 'command_line'
  };
  if (!credentials.endpoint || !credentials.username) {
    throw new AuthenticationError('Missing credentials. Run "fnos login" or provide -e/-u/-p.');
  }
  return createClientWithCredentials(credentials, options, dependencies);
}

function getSDKInstance(client, className, sdkModule = sdk) {
  if (!SDK_CLASS_NAMES.includes(className) || typeof sdkModule[className] !== 'function') {
    throw new Error(`Unknown SDK class: ${className}`);
  }
  return new sdkModule[className](client);
}

module.exports = {
  AuthenticationError,
  SDK_CLASS_NAMES,
  createClient,
  createClientWithCredentials,
  getSDKInstance
};
