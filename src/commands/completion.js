const { Argument } = require('commander');
const { version } = require('../../package.json');
const { fixedValues, withCompletion } = require('../completion/metadata');
const { buildCompletionSpec } = require('../completion/spec');
const { renderZsh } = require('../completion/zsh');
const { installZshCompletion } = require('../completion/installer');
const { errorMessage } = require('../utils/errors');

class UnsupportedShellError extends Error {
  constructor(shell) {
    super(`unsupported shell "${shell}"; supported shells: zsh`);
    this.name = 'UnsupportedShellError';
    this.exitCode = 4;
  }
}

function shellArgument(flags) {
  return withCompletion(
    new Argument(flags, 'Shell name'),
    fixedValues(['zsh'])
  );
}

function requireZsh(shell) {
  if (shell !== 'zsh') throw new UnsupportedShellError(shell);
}

function registerCompletionCommand(program, dependencies = {}) {
  const completionOutput = dependencies.completionOutput || process.stdout;
  const stdout = dependencies.stdout || console.log;
  const stderr = dependencies.stderr || console.error;
  const render = dependencies.renderCompletion || ((currentProgram, format) =>
    renderZsh(buildCompletionSpec(currentProgram), { format, version }));
  const installCompletion = dependencies.installCompletion || installZshCompletion;

  const report = (error) => {
    stderr(`Error: ${errorMessage(error)}`);
    process.exitCode = error.exitCode || 1;
  };

  const command = program.command('completion')
    .description('Generate shell completion')
    .addArgument(shellArgument('[shell]'));
  command.action((shell) => {
    if (shell === undefined) {
      command.outputHelp();
      return;
    }
    try {
      requireZsh(shell);
      completionOutput.write(render(program, 'source'));
      process.exitCode = 0;
    } catch (error) {
      report(error);
    }
  });

  const install = command.command('install')
    .description('Install shell completion for the current user')
    .addArgument(shellArgument('<shell>'));
  install.action((shell) => {
    try {
      requireZsh(shell);
      const target = installCompletion(render(program, 'autoload'));
      stdout(
        `Installed zsh completion at ${target}.\n` +
        'Add this before compinit in ~/.zshrc:\n' +
        'fpath=(~/.fnos/completions $fpath)\n' +
        'autoload -Uz compinit\n' +
        'compinit'
      );
      process.exitCode = 0;
    } catch (error) {
      report(error);
    }
  });
  return command;
}

module.exports = { UnsupportedShellError, registerCompletionCommand };
