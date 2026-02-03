/**
 * Command Registrar
 * Registers plugin commands to Commander.js
 *
 * @class CommandRegistrar
 */

/**
 * Command Registrar class
 * Handles registration of plugin commands to Commander.js program
 */
class CommandRegistrar {
  /**
   * Register all plugin commands
   * @param {Command} program - Commander.js program instance
   * @param {Object} registry - Plugin registry instance
   * @param {Object} pluginDeps - Plugin dependencies
   * @returns {void}
   *
   * @example
   * registrar.registerAll(program, registry, {
   *   logger: logger,
   *   settings: settings,
   *   auth: auth,
   *   getSDKInstance: getSDKInstance
   * });
   */
  registerAll(program, registry, pluginDeps) {
    const plugins = registry.getAll();

    for (const [pluginName, plugin] of Object.entries(plugins)) {
      // Create a subcommand for the plugin
      const pluginCmd = program.command(pluginName)
        .description(`${plugin.name} - ${plugin.version}`);

      // Register plugin's commands
      for (const [commandName, commandConfig] of Object.entries(plugin.commands)) {
        this.registerCommand(program, pluginName, commandName, commandConfig, pluginDeps, pluginCmd);
      }
    }
  }

  /**
   * Register a single plugin command
   * @param {Command} program - Commander.js program instance
   * @param {string} pluginName - Plugin name
   * @param {string} commandName - Command name
   * @param {Object} commandConfig - Command configuration
   * @param {Function} commandConfig.action - Command action function
   * @param {string} commandConfig.description - Command description
   * @param {Array<Object>} commandConfig.params - Command parameters
   * @param {Object} pluginDeps - Plugin dependencies
   * @param {Command} [pluginCmd] - Plugin subcommand (optional, for internal use)
   * @returns {void}
   *
   * @example
   * registrar.registerCommand(
   *   program,
   *   'my-plugin',
   *   'test',
   *   { description: 'Test command', action: async (opts) => {}, params: [] },
   *   pluginDeps
   * );
   */
  registerCommand(program, pluginName, commandName, commandConfig, pluginDeps, pluginCmd = null) {
    // If pluginCmd is not provided, find or create it
    let cmd = pluginCmd;
    if (!cmd) {
      // Try to find existing plugin command
      cmd = program.commands.find(c => c.name() === pluginName);
      if (!cmd) {
        // Create new plugin command
        cmd = program.command(pluginName).description(pluginName);
      }
    }

    // Create the command
    const command = cmd.command(commandName)
      .description(commandConfig.description);

    // Map parameters
    if (commandConfig.params) {
      this.mapParams(command, commandConfig.params);
    }

    // Wrap action with plugin deps
    const wrappedAction = this.wrapAction(commandConfig.action, pluginDeps);

    // Add action handler
    command.action(wrappedAction);
  }

  /**
   * Map parameters to command options
   * Supports both automatic and custom option formats
   * @param {Command} cmd - Commander.js command instance
   * @param {Array<Object>} params - Parameters array
   * @param {string} params[].name - Parameter name
   * @param {boolean} [params[].required] - Whether parameter is required
   * @param {string} [params[].description] - Parameter description
   * @param {string} [params[].option] - Custom option format (e.g., "--custom-name <value>")
   * @returns {void}
   *
   * @example
   * registrar.mapParams(cmd, [
   *   { name: 'input', required: true, description: 'Input value' },
   *   { name: 'output', option: '--output-file <path>', description: 'Output file path' }
   * ]);
   */
  mapParams(cmd, params) {
    params.forEach(param => {
      const optionName = param.option || `--${param.name} <value>`;
      const description = param.description || `Parameter: ${param.name}`;

      if (param.required) {
        cmd.requiredOption(optionName, description);
      } else {
        cmd.option(optionName, description);
      }
    });
  }

  /**
   * Wrap action function with plugin dependencies and error handling
   * @param {Function} action - Original action function
   * @param {Object} pluginDeps - Plugin dependencies
   * @param {Object} pluginDeps.logger - Logger instance
   * @param {Object} pluginDeps.settings - Settings instance
   * @param {Object|null} pluginDeps.auth - Auth credentials
   * @param {Function} pluginDeps.getSDKInstance - SDK instance getter
   * @returns {Function} Wrapped action function
   *
   * @example
   * const wrapped = registrar.wrapAction(
   *   async (opts) => { return { result: 'ok' }; },
   *   { logger, settings, auth, getSDKInstance }
   * );
   */
  wrapAction(action, pluginDeps) {
    return async (options) => {
      try {
        return await action(options);
      } catch (error) {
        pluginDeps.logger.error(`Command failed: ${error.message}`);
        throw error;
      }
    };
  }
}

module.exports = CommandRegistrar;