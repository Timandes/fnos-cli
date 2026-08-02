#!/usr/bin/env node

const { Command } = require('commander');
const { registerLoginCommand, registerLogoutCommand } = require('./commands/auth');
const { registerCompletionCommand } = require('./commands/completion');
const { registerCommands } = require('./commands');
const { setLogLevel } = require('./utils/logger');
const { errorMessage } = require('./utils/errors');
const { version } = require('../package.json');

function createProgram(dependencies = {}) {
  const program = new Command();
  program.name('fnos').description('CLI client for 飞牛 fnOS system').version(version);
  program
    .option('--raw', 'Output raw JSON response')
    .option('-v, --verbose', 'Verbose output (info level)')
    .option('-vv, --debug', 'Debug output (debug level)')
    .option('-vvv, --silly', 'Silly output (silly level)');
  registerLoginCommand(program, dependencies);
  registerLogoutCommand(program, dependencies);
  registerCompletionCommand(program, dependencies);
  registerCommands(program, dependencies);
  program.hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    const verboseLevel = options.silly ? 3 : options.debug ? 2 : options.verbose ? 1 : 0;
    setLogLevel(verboseLevel);
    process.env.LOG_LEVEL = ['error', 'info', 'debug', 'silly'][verboseLevel];
  });
  return program;
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
