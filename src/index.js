#!/usr/bin/env node

/**
 * fnos-cli - CLI client for 飞牛 fnOS system
 */

const { Command } = require('commander');
const { registerLoginCommand, registerLogoutCommand } = require('./commands/auth');
const { registerCommands } = require('./commands');
const { setLogLevel } = require('./utils/logger');

// Create program
const program = new Command();

// Configure program
program
  .name('fnos-cli')
  .description('CLI client for 飞牛 fnOS system')
  .version('1.0.0');

// Global options
program
  .option('--raw', 'Output raw JSON response')
  .option('-v, --verbose', 'Verbose output (info level)')
  .option('-vv, --debug', 'Debug output (debug level)')
  .option('-vvv, --silly', 'Silly output (silly level)');

// Register auth commands
registerLoginCommand(program);
registerLogoutCommand(program);

// Register dynamic commands
registerCommands(program);

// Hook into parse to set log level before command execution
program.hook('preAction', (thisCommand, actionCommand) => {
  const options = thisCommand.opts();
  let verboseLevel = 0;
  if (options.verbose) verboseLevel = 1;
  if (options.debug) verboseLevel = 2;
  if (options.silly) verboseLevel = 3;
  setLogLevel(verboseLevel);
});

// Parse
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}