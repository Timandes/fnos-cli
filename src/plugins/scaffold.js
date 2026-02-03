/**
 * Plugin scaffold generator
 * Generates boilerplate code for new plugins
 */

const fs = require('fs');
const path = require('path');

class PluginScaffold {
  /**
   * Generate a new plugin
   * @param {string} pluginPath - Path where the plugin should be created
   * @param {Object} options - Plugin options
   * @param {string} options.name - Plugin name
   * @param {string} options.version - Plugin version
   * @param {string} options.description - Plugin description
   * @param {string} options.author - Plugin author
   */
  generate(pluginPath, options) {
    // Create plugin directory
    fs.mkdirSync(pluginPath, { recursive: true });

    // Generate package.json
    const packageJson = this.getPackageJsonTemplate(options);
    fs.writeFileSync(
      path.join(pluginPath, 'package.json'),
      packageJson,
      'utf8'
    );

    // Generate index.js
    const indexJs = this.getIndexJsTemplate(options);
    fs.writeFileSync(
      path.join(pluginPath, 'index.js'),
      indexJs,
      'utf8'
    );
  }

  /**
   * Get package.json template
   * @param {Object} options - Plugin options
   * @returns {string} package.json content
   */
  getPackageJsonTemplate(options) {
    const { name, version, description, author } = options;

    const packageJson = {
      name: name,
      version: version,
      description: description,
      main: 'index.js',
      author: author,
      license: 'MIT',
      fnos: {
        plugin: {
          name: name,
          version: version,
          entry: 'index.js'
        }
      }
    };

    return JSON.stringify(packageJson, null, 2);
  }

  /**
   * Get index.js template
   * @param {Object} options - Plugin options
   * @returns {string} index.js content
   */
  getIndexJsTemplate(options) {
    const { name, description } = options;

    return `/**
 * ${name} - ${description}
 */

const sdk = require('fnos-cli/sdk');

// Plugin configuration schema
const schema = {
  type: 'object',
  properties: {
    // Add your plugin configuration properties here
    // example: {
    //   type: 'string',
    //   description: 'An example configuration option'
    // }
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

  logger.info(\`Initializing \${name} plugin\`);

  // Validate configuration
  const validation = sdk.validateConfig(config, schema);
  if (!validation.valid) {
    throw new Error(\`Invalid configuration: \${validation.errors.join(', ')}\`);
  }

  // Return plugin commands
  return {
    // Add your commands here
    // example: {
    //   description: 'Example command',
    //   action: async (options) => {
    //     logger.info('Executing example command');
    //     return { message: 'Hello from example command!' };
    //   },
    //   params: [
    //     { name: 'input', required: true, description: 'Input parameter' }
    //   ]
    // }
  };
}

module.exports = { init, schema };
`;
  }
}

module.exports = PluginScaffold;
