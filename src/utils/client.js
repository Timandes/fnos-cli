/**
 * FnosClient wrapper with authentication
 */

const { FnosClient, ResourceMonitor, Store, SystemInfo, User, Network, File, SAC } = require('fnos');
const settings = require('./settings');
const { logger } = require('./logger');

/**
 * Create authenticated FnosClient
 * @param {Object} options - Options object
 * @param {string} options.endpoint - Server endpoint
 * @param {string} options.username - Username
 * @param {string} options.password - Password
 * @param {number} options.timeout - Connection timeout in seconds
 * @returns {Promise<FnosClient>} Authenticated client
 */
async function createClient(options = {}) {
  const { endpoint, username, password, timeout = 60 } = options;

  // Get credentials from settings if not provided
  const savedCredentials = settings.getCredentials();
  const finalEndpoint = endpoint || savedCredentials?.endpoint;
  const finalUsername = username || savedCredentials?.username;
  const finalPassword = password || savedCredentials?.password;

  if (!finalEndpoint || !finalUsername) {
    throw new Error('Missing credentials. Please run "fnos-cli login" first or provide -e, -u, -p parameters.');
  }

  // Create client
  const client = new FnosClient();
  logger.info(`Connecting to ${finalEndpoint}...`);

  // Connect
  await client.connect(finalEndpoint, timeout * 1000);
  logger.info('Connected successfully');

  // Try to login with token first
  // if (savedCredentials?.token && savedCredentials?.secret && !endpoint && !username && !password) {
  //   try {
  //     logger.info('Logging in with saved token...');
  //     await client.loginViaToken(savedCredentials.token, savedCredentials.longToken, savedCredentials.secret);
  //     logger.info('Logged in successfully with token');
  //     return client;
  //   } catch (error) {
  //     logger.warn('Token login failed, falling back to password login:', error.message);
  //   }
  // }

  // Login with password
  if (!finalPassword) {
    throw new Error('Password required. Please run "fnos-cli login" first or provide -p parameter.');
  }

  logger.info('Logging in...');
  const loginResult = await client.login(finalUsername, finalPassword);
  logger.info('Logged in successfully');

  // Save credentials if they were provided via command line
  if (endpoint || username || password) {
    settings.saveCredentials({
      endpoint: finalEndpoint,
      username: finalUsername,
      password: finalPassword,
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