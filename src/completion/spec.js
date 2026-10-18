const { getCompletion } = require('./metadata');

function optionKey(option) {
  return option.long || option.short || option.flags;
}

function mergeOptions(...groups) {
  const merged = new Map();
  for (const option of groups.flat()) merged.set(optionKey(option), option);
  return [...merged.values()];
}

function optionSpec(option) {
  return {
    flags: option.flags,
    short: option.short || null,
    long: option.long || null,
    description: option.description || '',
    requiredValue: Boolean(option.required),
    optionalValue: Boolean(option.optional),
    variadic: Boolean(option.variadic),
    mandatory: Boolean(option.mandatory),
    completion: getCompletion(option)
  };
}

function argumentSpec(argument) {
  return {
    name: argument.name(),
    description: argument.description || '',
    required: Boolean(argument.required),
    variadic: Boolean(argument.variadic),
    completion: getCompletion(argument)
  };
}

function visibleOptions(command) {
  return command.createHelp().visibleOptions(command);
}

function visibleCommands(command) {
  return command.createHelp().visibleCommands(command);
}

function commandSpec(command, inheritedOptions, path = []) {
  const options = mergeOptions(inheritedOptions, visibleOptions(command));
  return {
    name: command.name(),
    description: command.description(),
    path,
    options: options.map(optionSpec),
    arguments: command.registeredArguments.map(argumentSpec),
    commands: visibleCommands(command).map((child) =>
      commandSpec(child, options, [...path, child.name()]))
  };
}

function buildCompletionSpec(program) {
  return commandSpec(program, []);
}

module.exports = { buildCompletionSpec };
