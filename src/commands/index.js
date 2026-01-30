/**
 * Command registration helper
 */

const { COMMAND_MAPPING } = require('../constants');
const { createClient, getSDKInstance } = require('../utils/client');
const { formatOutput } = require('../utils/formatter');
const { logger } = require('../utils/logger');

/**
 * Register all dynamic commands based on COMMAND_MAPPING
 * @param {Command} program - Commander program instance
 */
function registerCommands(program) {
  for (const [commandName, config] of Object.entries(COMMAND_MAPPING)) {
    for (const [subCommandName, commandConfig] of Object.entries(config.commands)) {
      // Create combined command name (e.g., "resmon.cpu")
      const fullCommandName = `${commandName}.${subCommandName}`;

      // Create command
      const cmd = program.command(fullCommandName)
        .description(commandConfig.description);

      // Add parameters
      if (commandConfig.params) {
        commandConfig.params.forEach(param => {
          const optionName = `--${param}`;
          const description = `${param} parameter`;
          if (param === 'disk' || param === 'path' || param === 'ifName' || param === 'files') {
            cmd.requiredOption(optionName + ' <value>', `${description} (required)`);
          } else {
            cmd.option(optionName + ' <value>', description);
          }
        });
      }

      // Add action handler
      cmd.action(async (options) => {
        try {
          // Get global options from root command
          const globalOptions = program.opts();

          // Validate required parameters
          if (commandConfig.params) {
            const requiredParams = ['disk', 'path', 'ifName', 'files'];
            for (const param of requiredParams) {
              if (commandConfig.params.includes(param) && !options[param]) {
                console.error(`Error: --${param} is required for this command.`);
                process.exit(4);
              }
            }
          }

          // Create client (will use saved credentials from settings)
          const client = await createClient({
            timeout: 60
          });

          // Get SDK instance
          const sdkInstance = getSDKInstance(client, config.className);

          // Prepare method arguments
          const args = [];
          const timeoutFirstClasses = ['ResourceMonitor', 'User', 'SystemInfo', 'SAC'];

          if (commandConfig.params) {
            commandConfig.params.forEach(param => {
              if (options[param] !== undefined) {
                let value = options[param];
                // Handle comma-separated lists
                if (param === 'files' || param === 'items') {
                  if (typeof value === 'string') {
                    value = value.split(',').map(s => s.trim());
                  } else if (!Array.isArray(value)) {
                    value = [value];
                  }
                }
                // Handle boolean parameters
                if (param === 'noHotSpare' || param === 'moveToTrashbin') {
                  value = value === 'false' ? false : value;
                }
                // Handle numeric parameters
                if (param === 'type') {
                  value = parseInt(value, 10);
                }
                args.push(value);
              }
            });
          }

          // Add timeout based on class pattern
          if (timeoutFirstClasses.includes(config.className)) {
            // Timeout first pattern: (timeout, params...)
            args.unshift(10000);
          } else {
            // Timeout last pattern: (params..., timeout)
            args.push(10000);
          }

          // Execute method
          logger.info(`Executing ${config.className}.${commandConfig.method}...`);
          const result = await sdkInstance[commandConfig.method](...args);

          // Format output
          console.log(formatOutput(result, globalOptions.raw));

          // Close connection
          client.close();
          process.exit(0);
        } catch (error) {
          logger.error(`Command failed: ${error.message}`);
          const globalOptions = program.opts();
          if (globalOptions.debug || globalOptions.silly) {
            console.error(error);
          }
          process.exit(1);
        }
      });
    }
  }
}

module.exports = { registerCommands };