/**
 * Authentication helper for credential validation and resolution
 */

const settings = require('./settings');
const { selectServer } = require('./server-selector');
const { CommandParameterError } = require('../commands/options');

/**
 * Check if partial credentials are provided
 * @param {Object} options - Command line options
 * @returns {boolean} - True if at least one but not all three parameters are provided
 */
function hasPartialCredentials(options) {
  const { endpoint, username, password } = options;
  const values = [endpoint, username, password];
  const provided = values.filter((value) => value !== undefined);
  return provided.length > 0 &&
    (provided.length < values.length || values.some((value) => !value));
}

function credentialError(message) {
  const error = new Error(message);
  error.name = 'AuthenticationError';
  error.exitCode = 3;
  return error;
}

/**
 * Validate command line credentials completeness
 * @param {Object} options - Command line options
 * @returns {Object} - { isValid: boolean, hasCredentials: boolean }
 * @throws {Error} - If partial credentials are provided
 */
function validateCommandLineCredentials(options) {
  if (hasPartialCredentials(options)) {
    throw credentialError('PARTIAL_CREDENTIALS');
  }

  const hasCredentials = Boolean(options.endpoint && options.username && options.password);
  return { isValid: true, hasCredentials };
}

async function resolveServerName(requestedName, dependencies = {}) {
  const settingsStore = dependencies.settingsStore || settings;
  const select = dependencies.select || selectServer;
  const selectorDependencies = dependencies.selectorDependencies || {};
  const servers = settingsStore.listServers();
  if (requestedName !== undefined) {
    if (!servers.some(({ name }) => name === requestedName)) {
      const available = servers.map(({ name }) => name).join(', ') || '(none)';
      throw credentialError(
        `Saved server "${requestedName}" was not found. Available servers: ${available}.`
      );
    }
    return requestedName;
  }
  return select(servers, selectorDependencies);
}

/**
 * Resolve and return the final credentials to use
 * @param {Object} options - Command line options
 * @returns {Object} - Credentials object
 * @throws {Error} - If no valid credentials are found or partial credentials are provided
 */
async function resolveCredentials(options, dependencies = {}) {
  const hasTemporaryCredential = [
    options.endpoint,
    options.username,
    options.password
  ].some((value) => value !== undefined);
  if (options.server !== undefined && hasTemporaryCredential) {
    throw new CommandParameterError(
      '--server cannot be combined with -e/--endpoint, -u/--username, or -p/--password.'
    );
  }
  const validation = validateCommandLineCredentials(options);

  if (validation.hasCredentials) {
    // Use command line credentials (do NOT save to settings)
    return {
      endpoint: options.endpoint,
      username: options.username,
      password: options.password,
      source: 'command_line'
    };
  }

  const settingsStore = dependencies.settingsStore || settings;
  const serverName = await resolveServerName(options.server, {
    ...dependencies,
    settingsStore
  });
  const credentials = settingsStore.getCredentials(serverName);
  if (!credentials || !credentials.endpoint || !credentials.username || !credentials.password) {
    throw credentialError('No valid credentials found. Please use "fnos login" or provide -e/-u/-p options.');
  }

  return {
    ...credentials,
    source: 'settings_file',
    serverName
  };
}

module.exports = {
  hasPartialCredentials,
  validateCommandLineCredentials,
  resolveCredentials,
  resolveServerName
};
