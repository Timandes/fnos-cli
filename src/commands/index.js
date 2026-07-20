const { COMMAND_CATALOG } = require('./catalog');
const { registerAuthenticationOptions, registerBusinessOptions } = require('./options');
const { runCommand } = require('./runner');

function registerCommands(program, dependencies = {}) {
  for (const [domainName, domain] of Object.entries(COMMAND_CATALOG)) {
    for (const [commandName, definition] of Object.entries(domain.commands)) {
      const command = program.command(`${domainName}.${commandName}`).description(definition.description);
      registerAuthenticationOptions(command);
      registerBusinessOptions(command, definition.options);
      command.action(async (options) => {
        process.exitCode = await runCommand({
          domain,
          definition,
          options,
          globalOptions: program.opts()
        }, dependencies);
      });
    }
  }
}

module.exports = { registerCommands };
