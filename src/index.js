#!/usr/bin/env node

/**
 * fnos-cli - CLI client for 飞牛 fnOS system
 */

const { Command } = require('commander');
const { registerLoginCommand, registerLogoutCommand } = require('./commands/auth');
const { registerCommands } = require('./commands');
const { registerPluginCommand } = require('./commands/plugin');
const { setLogLevel, logger } = require('./utils/logger');
const PluginLoader = require('./plugins/loader');
const PluginRegistry = require('./plugins/registry');
const CommandRegistrar = require('./plugins/registrar');
const Settings = require('./utils/settings');
const path = require('path');

// Create program
const program = new Command();

// Configure program
program
  .name('fnos')
  .description('CLI client for 飞牛 fnOS system')
  .version('0.2.0');

// Global options
program
  .option('--raw', 'Output raw JSON response')
  .option('-v, --verbose', 'Verbose output (info level)')
  .option('-vv, --debug', 'Debug output (debug level)')
  .option('-vvv, --silly', 'Silly output (silly level)');

// Register auth commands
registerLoginCommand(program);
registerLogoutCommand(program);

// Register plugin create command
registerPluginCommand(program);

// Register dynamic commands
registerCommands(program);

/**
 * Load plugins at startup
 */
async function loadPlugins() {
  const loader = new PluginLoader();
  const registry = new PluginRegistry();
  const settings = Settings.load() || {};

  // Collect plugin paths
  const pluginPaths = [];

  // Add official plugins directory
  const officialPluginsDir = path.join(__dirname, '..', 'plugins');
  pluginPaths.push(officialPluginsDir);

  // Add user-configured plugin paths
  if (settings.pluginPaths && Array.isArray(settings.pluginPaths)) {
    pluginPaths.push(...settings.pluginPaths);
  }

  // Prepare dependencies for plugins
  const deps = {
    logger,
    settings,
    auth: Settings.getCredentials(),
    getSDKInstance: (client, className) => {
      // Import SDK and get instance
      const fnos = require('fnos');
      return new fnos[className](client);
    }
  };

  // Load all plugins
  try {
    const plugins = await loader.loadAll({
      pluginPaths,
      settings,
      deps
    });

    // Register loaded plugins
    for (const [pluginName, plugin] of Object.entries(plugins)) {
      registry.register(pluginName, plugin);
      logger.info(`Loaded plugin: ${pluginName} v${plugin.version}`);
    }

    if (Object.keys(plugins).length === 0) {
      logger.info('No plugins loaded');
    }

    return registry;
  } catch (error) {
    logger.error(`Error loading plugins: ${error.message}`);
    return registry;
  }
}

/**
 * Register plugin commands
 */
async function registerPluginCommands(registry) {
  const registrar = new CommandRegistrar();

  // Prepare dependencies for plugins
  const pluginDeps = {
    logger,
    settings,
    auth: Settings.getCredentials(),
    getSDKInstance: (client, className) => {
      // Import SDK and get instance
      const fnos = require('fnos');
      return new fnos[className](client);
    }
  };

  // Register all plugin commands
  registrar.registerAll(program, registry, pluginDeps);
}

// Hook into parse to set log level before command execution
program.hook('preAction', (thisCommand, actionCommand) => {
  const options = thisCommand.opts();
  let verboseLevel = 0;
  if (options.verbose) verboseLevel = 1;
  if (options.debug) verboseLevel = 2;
  if (options.silly) verboseLevel = 3;

  // Set log level for both CLI and SDK logger
  setLogLevel(verboseLevel);

  // Set environment variable to control SDK logger level
  const sdkLogLevels = ['error', 'info', 'debug', 'silly'];
  process.env.LOG_LEVEL = sdkLogLevels[verboseLevel];
});

/**
 * Main execution
 */
(async () => {
  try {
    // Load plugins
    const registry = await loadPlugins();

    // Register plugin commands
    await registerPluginCommands(registry);

    // Parse command line arguments
    program.parse(process.argv);

    // Show help if no command provided
    if (!process.argv.slice(2).length) {
      program.outputHelp();
    }
  } catch (error) {
    logger.error(`Startup error: ${error.message}`);
    process.exit(1);
  }
})();