/**
 * Plugin Registry
 * Manages registered plugins and their commands
 *
 * @class PluginRegistry
 */

/**
 * Plugin Registry class
 * Handles plugin registration, conflict detection, and query operations
 */
class PluginRegistry {
  constructor() {
    /** @type {Map<string, Object>} - Map of plugin name to plugin instance */
    this.plugins = new Map();
  }

  /**
   * Register a plugin
   * @param {string} pluginName - Plugin name (must be unique)
   * @param {Object} plugin - Plugin instance containing name, version, commands, etc.
   * @returns {boolean} True if registered successfully, false if plugin name already exists
   *
   * @example
   * const plugin = {
   *   name: 'my-plugin',
   *   version: '1.0.0',
   *   commands: { 'cmd1': { description: 'Command 1' } }
   * };
   * const registered = registry.register('my-plugin', plugin);
   */
  register(pluginName, plugin) {
    if (this.plugins.has(pluginName)) {
      return false;
    }

    this.plugins.set(pluginName, plugin);
    return true;
  }

  /**
   * Check if a command name conflicts with existing commands
   * @param {string} commandName - Command name to check for conflicts
   * @returns {Object|null} Conflict info { command, plugin } or null if no conflict
   *
   * @example
   * const conflict = registry.checkConflict('my-command');
   * if (conflict) {
   *   console.error(`Command '${conflict.command}' already exists in plugin '${conflict.plugin}'`);
   * }
   */
  checkConflict(commandName) {
    for (const [pluginName, plugin] of this.plugins.entries()) {
      if (plugin.commands && plugin.commands[commandName]) {
        return {
          command: commandName,
          plugin: pluginName
        };
      }
    }
    return null;
  }

  /**
   * Get all registered plugins
   * @returns {Object} Plugin mapping { pluginName: pluginInstance }
   *
   * @example
   * const allPlugins = registry.getAll();
   * console.log(Object.keys(allPlugins)); // ['plugin1', 'plugin2', ...]
   */
  getAll() {
    const result = {};
    for (const [name, plugin] of this.plugins.entries()) {
      result[name] = plugin;
    }
    return result;
  }

  /**
   * Get a specific plugin by name
   * @param {string} pluginName - Plugin name to retrieve
   * @returns {Object|null} Plugin instance or null if not found
   *
   * @example
   * const plugin = registry.get('my-plugin');
   * if (plugin) {
   *   console.log(plugin.version);
   * }
   */
  get(pluginName) {
    return this.plugins.get(pluginName) || null;
  }

  /**
   * Get all commands from all plugins
   * @returns {Array<Object>} Array of command objects { plugin, command, config }
   *
   * @example
   * const commands = registry.getAllCommands();
   * commands.forEach(({ plugin, command }) => {
   *   console.log(`${plugin}.${command}`);
   * });
   */
  getAllCommands() {
    const commands = [];
    for (const [pluginName, plugin] of this.plugins.entries()) {
      if (plugin.commands) {
        for (const [commandName, commandConfig] of Object.entries(plugin.commands)) {
          commands.push({
            plugin: pluginName,
            command: commandName,
            config: commandConfig
          });
        }
      }
    }
    return commands;
  }

  /**
   * Clear all registered plugins
   * Useful for testing or reinitializing the registry
   *
   * @example
   * registry.clear();
   */
  clear() {
    this.plugins.clear();
  }
}

module.exports = PluginRegistry;