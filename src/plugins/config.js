/**
 * Plugin Configuration Manager
 * Handles plugin configuration retrieval, validation, and readonly auth credentials
 *
 * @class PluginConfig
 */

const SchemaValidator = require('./schema-validator');

/**
 * Plugin Configuration Manager class
 * Provides methods to manage plugin configuration and create readonly auth credentials
 */
class PluginConfig {
  /**
   * Get plugin configuration from settings
   * @param {string} pluginName - Plugin name
   * @param {Object} settings - Settings object containing plugins section
   * @returns {Object} Plugin configuration, empty object if not found
   *
   * @example
   * const settings = { plugins: { 'my-plugin': { setting1: 'value' } } };
   * const config = PluginConfig.getConfig('my-plugin', settings);
   * // Returns: { setting1: 'value' }
   */
  static getConfig(pluginName, settings) {
    if (!settings || !settings.plugins) {
      return {};
    }
    return settings.plugins[pluginName] || {};
  }

  /**
   * Validate plugin configuration using JSON Schema
   * @param {Object} config - Configuration object to validate
   * @param {Object} schema - JSON Schema for validation
   * @returns {Object} Validation result { valid: boolean, errors?: Array<Object> }
   *
   * @example
   * const schema = {
   *   type: 'object',
   *   properties: { setting: { type: 'string' } },
   *   required: ['setting']
   * };
   * const result = PluginConfig.validate(config, schema);
   * if (!result.valid) {
   *   console.error('Validation failed:', result.errors);
   * }
   */
  static validate(config, schema) {
    const validator = SchemaValidator.createValidator(schema);
    return SchemaValidator.validate(config, validator);
  }

  /**
   * Create readonly authentication credentials using Proxy
   * Prevents modification and deletion of credential properties
   * @param {Object|null} credentials - Raw credentials object
   * @returns {Object|null} Readonly credentials object or null
   * @throws {Error} If modification or deletion is attempted
   *
   * @example
   * const credentials = { endpoint: 'nas.com', username: 'admin', password: 'pass' };
   * const readonly = PluginConfig.createReadonlyAuth(credentials);
   * readonly.username = 'newuser'; // Throws: Cannot modify readonly property 'username'
   */
  static createReadonlyAuth(credentials) {
    if (!credentials) {
      return null;
    }

    const readonly = new Proxy(credentials, {
      get(target, prop) {
        return target[prop];
      },
      set(target, prop, value) {
        throw new Error(`Cannot modify readonly property '${prop}'`);
      },
      deleteProperty(target, prop) {
        throw new Error(`Cannot delete readonly property '${prop}'`);
      }
    });

    return readonly;
  }
}

module.exports = PluginConfig;