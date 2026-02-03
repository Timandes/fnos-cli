/**
 * Plugin Loader
 * Discovers, loads, validates, and initializes plugins
 *
 * @class PluginLoader
 */

const fs = require('fs');
const path = require('path');
const PluginConfig = require('./config');
const PluginRegistry = require('./registry');

/**
 * Plugin Loader class
 * Handles plugin discovery, loading, validation, and initialization
 */
class PluginLoader {
  /**
   * Load all plugins from specified paths
   * @param {Object} options - Loading options
   * @param {string[]} options.pluginPaths - List of plugin paths to scan
   * @param {Object} options.settings - Settings object for plugin configuration
   * @param {Object} options.deps - Dependency injection object
   * @param {Object} options.deps.logger - Logger instance
   * @param {Object} options.deps.settings - Settings instance
   * @param {Object|null} options.deps.auth - Auth credentials
   * @param {Function} options.deps.getSDKInstance - SDK instance getter
   * @returns {Promise<Object>} Loaded plugins { pluginName: pluginInstance }
   *
   * @example
   * const plugins = await loader.loadAll({
   *   pluginPaths: ['/path/to/plugins', '/another/path'],
   *   settings: settings,
   *   deps: { logger, settings, auth, getSDKInstance }
   * });
   */
  async loadAll(options) {
    const { pluginPaths, settings, deps } = options;
    const plugins = {};

    for (const pluginPath of pluginPaths) {
      try {
        const pluginInstance = await this.load(pluginPath, { settings, deps });
        if (pluginInstance) {
          plugins[pluginInstance.name] = pluginInstance;
        }
      } catch (error) {
        deps.logger.error(`Failed to load plugin from ${pluginPath}: ${error.message}`);
        // Continue loading other plugins
      }
    }

    return plugins;
  }

  /**
   * Load a single plugin
   * @param {string} pluginPath - Path to plugin directory
   * @param {Object} options - Loading options
   * @param {Object} options.settings - Settings object
   * @param {Object} options.deps - Dependency injection object
   * @returns {Promise<Object|null>} Plugin instance or null if loading failed
   *
   * @example
   * const plugin = await loader.load('/path/to/plugin', {
   *   settings: settings,
   *   deps: { logger, settings, auth, getSDKInstance }
   * });
   */
  async load(pluginPath, options) {
    const { settings, deps } = options;

    // Read manifest
    const manifest = await this.readManifest(pluginPath);
    if (!manifest) {
      return null;
    }

    // Validate manifest
    if (!this.validateManifest(manifest)) {
      deps.logger.error(`Invalid manifest for plugin at ${pluginPath}`);
      return null;
    }

    // Load entry file
    const entryPath = path.join(pluginPath, manifest.entry);
    if (!fs.existsSync(entryPath)) {
      deps.logger.error(`Plugin entry file not found: ${entryPath}`);
      return null;
    }

    let pluginDefinition;
    try {
      // Delete require cache to allow reloading
      delete require.cache[require.resolve(entryPath)];
      pluginDefinition = require(entryPath);
    } catch (error) {
      deps.logger.error(`Failed to load plugin entry file: ${error.message}`);
      return null;
    }

    // Get plugin configuration
    const config = PluginConfig.getConfig(manifest.name, settings);

    // Validate configuration if schema exists
    if (pluginDefinition.schema) {
      const validation = PluginConfig.validate(config, pluginDefinition.schema);
      if (!validation.valid) {
        deps.logger.error(
          `Plugin configuration validation failed for ${manifest.name}: ${PluginConfig.formatErrors(validation.errors)}`
        );
        return null;
      }
    }

    // Merge commands from manifest and plugin definition
    const commands = await this.initPlugin(pluginDefinition, config, deps);

    // Check for command conflicts
    const conflict = this.checkCommandConflicts(manifest.name, commands);
    if (conflict) {
      deps.logger.error(
        `Plugin ${manifest.name} failed to load: command '${conflict.command}' conflicts with existing command`
      );
      return null;
    }

    // Create plugin instance
    return {
      name: manifest.name,
      version: manifest.version,
      schema: pluginDefinition.schema,
      commands,
      path: pluginPath
    };
  }

  /**
   * Read plugin manifest from package.json
   * @param {string} pluginPath - Path to plugin directory
   * @returns {Promise<Object|null>} Plugin manifest or null if not found
   *
   * @example
   * const manifest = await loader.readManifest('/path/to/plugin');
   * // Returns: { name: 'my-plugin', version: '1.0.0', entry: 'index.js' }
   */
  async readManifest(pluginPath) {
    const packageJsonPath = path.join(pluginPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.fnos?.plugin || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate plugin manifest
   * @param {Object} manifest - Plugin manifest to validate
   * @returns {boolean} True if valid, false otherwise
   *
   * @example
   * const isValid = loader.validateManifest({ name: 'plugin', version: '1.0.0', entry: 'index.js' });
   */
  validateManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') {
      return false;
    }

    const required = ['name', 'version', 'entry'];
    return required.every(field => manifest[field] !== undefined);
  }

  /**
   * Initialize plugin and get commands
   * @param {Object} plugin - Plugin definition object
   * @param {Function} plugin.init - Plugin initialization function
   * @param {Object} plugin.schema - Plugin configuration schema
   * @param {Object} config - Plugin configuration
   * @param {Object} deps - Dependency injection object
   * @returns {Promise<Object>} Commands object
   *
   * @example
   * const commands = await loader.initPlugin(pluginDefinition, config, deps);
   * // Returns: { 'command1': { description: '...', action: ... } }
   */
  async initPlugin(plugin, config, deps) {
    if (!plugin.init || typeof plugin.init !== 'function') {
      return {};
    }

    try {
      const commands = await plugin.init(config, deps);
      return commands || {};
    } catch (error) {
      deps.logger.error(`Plugin initialization failed: ${error.message}`);
      return {};
    }
  }

  /**
   * Check for command conflicts with a temporary registry
   * @param {string} pluginName - Plugin name
   * @param {Object} commands - Commands to check
   * @returns {Object|null} Conflict info or null if no conflict
   *
   * @example
   * const conflict = loader.checkCommandConflicts('my-plugin', { 'cmd1': ... });
   * if (conflict) {
   *   console.error(`Conflict with ${conflict.plugin}`);
   * }
   */
  checkCommandConflicts(pluginName, commands) {
    const tempRegistry = new PluginRegistry();
    tempRegistry.register(pluginName, { name: pluginName, commands });

    for (const commandName of Object.keys(commands)) {
      const conflict = tempRegistry.checkConflict(commandName);
      // Ignore self-conflict (this shouldn't happen with proper implementation)
      if (conflict && conflict.plugin !== pluginName) {
        return conflict;
      }
    }

    return null;
  }
}

module.exports = PluginLoader;