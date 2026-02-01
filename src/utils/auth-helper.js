/**
 * Authentication helper for credential validation and resolution
 */

const settings = require('./settings');

/**
 * Check if partial credentials are provided
 * @param {Object} options - Command line options
 * @returns {boolean} - True if at least one but not all three parameters are provided
 */
function hasPartialCredentials(options) {
  const { endpoint, username, password } = options;
  const provided = [endpoint, username, password].filter(Boolean);
  return provided.length > 0 && provided.length < 3;
}

/**
 * Validate command line credentials completeness
 * @param {Object} options - Command line options
 * @returns {Object} - { isValid: boolean, hasCredentials: boolean }
 * @throws {Error} - If partial credentials are provided
 */
function validateCommandLineCredentials(options) {
  if (hasPartialCredentials(options)) {
    throw new Error('PARTIAL_CREDENTIALS');
  }

  const hasCredentials = options.endpoint && options.username && options.password;
  return { isValid: true, hasCredentials };
}

/**
 * Resolve and return the final credentials to use
 * @param {Object} options - Command line options
 * @returns {Object} - Credentials object
 * @throws {Error} - If no valid credentials are found or partial credentials are provided
 */
function resolveCredentials(options) {
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

  // Read from settings file
  const credentials = settings.getCredentials();
  if (!credentials || !credentials.endpoint || !credentials.username || !credentials.password) {
    throw new Error('No valid credentials found. Please use "fnos login" or provide -e/-u/-p options.');
  }

  return {
    ...credentials,
    source: 'settings_file'
  };
}

module.exports = {
  hasPartialCredentials,
  validateCommandLineCredentials,
  resolveCredentials
};