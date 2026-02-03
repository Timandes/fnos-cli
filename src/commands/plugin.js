/**
 * Plugin management commands
 */

const { Command } = require('commander');
const path = require('path');
const PluginScaffold = require('../plugins/scaffold');
const logger = require('../utils/logger');

/**
 * Register plugin create command
 * @param {Command} program - Commander program instance
 */
function registerPluginCommand(program) {
  const scaffold = new PluginScaffold();

  program.command('create-plugin <name>')
    .description('Create a new plugin with boilerplate code')
    .option('-p, --path <path>', 'Path where the plugin should be created', '.')
    .option('-v, --version <version>', 'Plugin version', '1.0.0')
    .option('-d, --description <description>', 'Plugin description', '')
    .option('-a, --author <author>', 'Plugin author', '')
    .action(async (name, options) => {
      try {
        const pluginPath = path.resolve(options.path, name);

        logger.info(`Creating plugin: ${name}`);
        logger.info(`Location: ${pluginPath}`);

        scaffold.generate(pluginPath, {
          name: name,
          version: options.version,
          description: options.description || `${name} plugin`,
          author: options.author || ''
        });

        logger.info('Plugin created successfully!');
        logger.info(`Next steps:`);
        logger.info(`  1. cd ${pluginPath}`);
        logger.info(`  2. Edit index.js to implement your plugin`);
        logger.info(`  3. Add your plugin to settings.json or copy it to the plugins directory`);

        process.exit(0);
      } catch (error) {
        logger.error(`Failed to create plugin: ${error.message}`);
        process.exit(1);
      }
    });
}

module.exports = {
  registerPluginCommand
};