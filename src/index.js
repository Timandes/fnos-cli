#!/usr/bin/env node

const { Command, Option } = require('commander');
const { configureLocalization } = require('./i18n/commander');
const { t } = require('./i18n');
const { SUPPORTED_LANGUAGES } = require('./i18n/languages');
const { fixedValues, withCompletion } = require('./completion/metadata');
const { registerConfigCommand } = require('./commands/config');
const { registerLoginCommand, registerLogoutCommand, registerAuthStatusCommand } = require('./commands/auth');
const { registerCompletionCommand } = require('./commands/completion');
const { registerCommands } = require('./commands');
const { setLogLevel } = require('./utils/logger');
const { errorMessage } = require('./utils/errors');
const { registerBanner } = require('./utils/banner');
const { version } = require('../package.json');

function createProgram(dependencies = {}) {
  const program = new Command();
  program.name('fnos').description('CLI client for 飞牛 fnOS system').version(version);
  program.configureHelp({ showGlobalOptions: true });
  program.addHelpText('after', () => '\n' + t('Run "fnos <command> --help" for command details.'));
  program
    .option('--raw', 'Output raw JSON response')
    .option('-v, --verbose', 'Verbose output (info level)')
    .option('-vv, --debug', 'Debug output (debug level)')
    .option('-vvv, --silly', 'Silly output (silly level)');
  program.addOption(withCompletion(new Option('--lang <locale>', 'Display language (zh-CN or en)'), fixedValues(SUPPORTED_LANGUAGES)));
  registerBanner(program, dependencies);
  registerLoginCommand(program, dependencies);
  registerLogoutCommand(program, dependencies);
  registerAuthStatusCommand(program, dependencies);
  registerCompletionCommand(program, dependencies);
  registerCommands(program, dependencies);
  registerConfigCommand(program, dependencies);
  program.hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    const verboseLevel = options.silly ? 3 : options.debug ? 2 : options.verbose ? 1 : 0;
    setLogLevel(verboseLevel);
    process.env.LOG_LEVEL = ['error', 'info', 'debug', 'silly'][verboseLevel];
  });
  return configureLocalization(program, dependencies);
}

async function main(argv = process.argv, dependencies = {}) {
  const program = createProgram(dependencies);
  if (argv.slice(2).length === 0) {
    program.outputHelp();
    return 0;
  }
  await program.parseAsync(argv);
  return process.exitCode || 0;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Error: ${errorMessage(error)}`);
    process.exitCode = error.exitCode || 1;
  });
}

module.exports = { createProgram, main };
