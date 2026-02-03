/**
 * hello-plugin - A simple hello world plugin for demonstration
 */

const sdk = require('fnos-cli/sdk');

// Plugin configuration schema
const schema = {
  type: 'object',
  properties: {
    defaultGreeting: {
      type: 'string',
      description: 'Default greeting message',
      default: 'Hello'
    }
  },
  additionalProperties: false
};

/**
 * Plugin initialization function
 * @param {Object} config - Plugin configuration
 * @param {Object} deps - Plugin dependencies
 * @param {Object} deps.logger - Logger instance
 * @param {Object} deps.settings - Settings object
 * @param {Object|null} deps.auth - Authentication credentials (readonly)
 * @param {Function} deps.getSDKInstance - Function to get SDK client instance
 * @returns {Object} Plugin commands
 */
function init(config, deps) {
  const { logger } = deps;

  logger.info('Initializing hello-plugin');

  // Validate configuration
  const validation = sdk.validateConfig(config, schema);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  // Get default greeting from config
  const defaultGreeting = config.defaultGreeting || 'Hello';

  // Return plugin commands
  return {
    greet: {
      description: 'Say hello to someone',
      action: async (options) => {
        const name = options.name || 'World';
        const greeting = options.greeting || defaultGreeting;

        logger.info(`Saying ${greeting} to ${name}`);

        return {
          greeting: `${greeting}, ${name}!`,
          plugin: 'hello-plugin',
          timestamp: new Date().toISOString()
        };
      },
      params: [
        {
          name: 'name',
          required: false,
          description: 'Name to greet'
        },
        {
          name: 'greeting',
          required: false,
          description: 'Custom greeting message'
        }
      ]
    }
  };
}

module.exports = { init, schema };