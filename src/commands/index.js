const { t } = require('../i18n');
const { COMMAND_CATALOG } = require('./catalog');
const { registerAuthenticationOptions, registerBusinessOptions } = require('./options');
const { runCommand } = require('./runner');

function configureBusinessCommand(command, domain, definition, program, dependencies) {
  command.description(definition.description);
  registerBusinessOptions(command, definition.options);
  command.action(async (_options, currentCommand) => {
    process.exitCode = await runCommand({
      domain,
      definition,
      options: currentCommand.optsWithGlobals(),
      globalOptions: program.opts()
    }, dependencies);
  });
}

/** Register grouped business commands and hidden dotted compatibility commands. */
function registerCommands(program, dependencies = {}) {
  for (const [domainName, domain] of Object.entries(COMMAND_CATALOG)) {
    const group = program.command(domainName)
      .description(domain.description)
      .usage('[options] <command>')
      .addHelpCommand();
    registerAuthenticationOptions(group);
    group.addHelpText('after', () => '\n' + t('Run "fnos {domain} <command> --help" for command details.', { domain: domainName }));
    group.action(() => {
      if (group.args.length) {
        group.error(`error: unknown command '${group.args[0]}'`, { code: 'commander.unknownCommand' });
      }
      group.outputHelp();
    });

    for (const [commandName, definition] of Object.entries(domain.commands)) {
      configureBusinessCommand(group.command(commandName), domain, definition, program, dependencies);

      const legacy = program.command(`${domainName}.${commandName}`, { hidden: true });
      registerAuthenticationOptions(legacy);
      configureBusinessCommand(legacy, domain, definition, program, dependencies);
    }
  }
}

module.exports = { registerCommands };
