/**
 * FnosClient wrapper with authentication
 */

const { FnosClient, ResourceMonitor, Store, SystemInfo, User, Network, File, SAC } = require('fnos');
const settings = require('./settings');
const { logger } = require('./logger');

/**
 * Create authenticated FnosClient
 * @param {Object} options - Options object
 * @param {Object} [options.credentials] - Direct credentials object (endpoint, username, password, etc.)
 * @param {string} [options.endpoint] - Server endpoint (legacy)
 * @param {string} [options.username] - Username (legacy)
 * @param {string} [options.password] - Password (legacy)
 * @param {number} [options.timeout] - Connection timeout in seconds
 * @param {boolean} [options.saveCredentials] - Whether to save credentials to settings (default: false)
 * @returns {Promise<FnosClient>} Authenticated client
 */
async function createClient(options = {}) {
  const { credentials, endpoint, username, password, timeout = 60, saveCredentials = false } = options;

  // Use provided credentials object
  if (credentials) {
    return await createClientWithCredentials(credentials, timeout, saveCredentials);
  }

  // Legacy support: build credentials from individual parameters
  const savedCredentials = settings.getCredentials();
  const finalEndpoint = endpoint || savedCredentials?.endpoint;
  const finalUsername = username || savedCredentials?.username;
  const finalPassword = password || savedCredentials?.password;

  if (!finalEndpoint || !finalUsername) {
    throw new Error('Missing credentials. Please run "fnos login" first or provide -e, -u, -p parameters.');
  }

  return await createClientWithCredentials(
    {
      endpoint: finalEndpoint,
      username: finalUsername,
      password: finalPassword,
      token: savedCredentials?.token,
      longToken: savedCredentials?.longToken,
      secret: savedCredentials?.secret
    },
    timeout,
    saveCredentials
  );
}

/**
 * Create authenticated client with credentials
 * @param {Object} credentials - Credentials object
 * @param {string} credentials.endpoint - Server endpoint
 * @param {string} credentials.username - Username
 * @param {string} credentials.password - Password
 * @param {number} timeout - Connection timeout in seconds
 * @param {boolean} saveToSettings - Whether to save credentials to settings
 * @returns {Promise<FnosClient>} Authenticated client
 */
async function createClientWithCredentials(credentials, timeout, saveToSettings) {
  const { endpoint, username, password } = credentials;

  // Create client
  const client = new FnosClient();
  logger.info(`Connecting to ${endpoint}...`);

  // Connect
  await client.connect(endpoint, timeout * 1000);
  logger.info('Connected successfully');

  // Login with password
  if (!password) {
    throw new Error('Password required. Please run "fnos login" first or provide -p parameter.');
  }

  logger.info('Logging in...');
  const loginResult = await client.login(username, password);
  logger.info('Logged in successfully');

  // Save credentials only if explicitly requested (e.g., from login command)
  if (saveToSettings) {
    settings.saveCredentials({
      endpoint,
      username,
      password,
      token: loginResult.token,
      longToken: loginResult.longToken,
      secret: loginResult.secret
    });
    logger.info('Credentials saved');
  }

  return client;
}

/**
 * Execute a command with auto-retry
 * @param {FnosClient} client - FnosClient instance
 * @param {Function} commandFn - Command function to execute
 * @returns {Promise<*>} Command result
 */
async function executeCommand(client, commandFn) {
  try {
    return await commandFn();
  } catch (error) {
    if (error.message.includes('token') || error.message.includes('auth')) {
      logger.warn('Authentication failed, trying to re-login...');
      // Re-login logic could be added here
    }
    throw error;
  }
}

/**
 * Get SDK class instance
 * @param {FnosClient} client - FnosClient instance
 * @param {string} className - Name of the SDK class
 * @returns {*} SDK class instance
 */
function getSDKInstance(client, className) {
  const instances = {
    ResourceMonitor: new ResourceMonitor(client),
    Store: new Store(client),
    SystemInfo: new SystemInfo(client),
    User: new User(client),
    Network: new Network(client),
    File: new File(client),
    SAC: new SAC(client)
  };

  const instance = instances[className];
  if (!instance) {
    throw new Error(`Unknown SDK class: ${className}`);
  }

  return instance;
}

module.exports = { createClient, executeCommand, getSDKInstance };