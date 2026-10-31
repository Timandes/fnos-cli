const { Help } = require('commander');
const settings = require('../utils/settings');
const { isLanguage } = require('./languages');
const { t, getLanguage, withLanguage } = require('./index');

function languageError() {
  const error = new Error(t('Language must be zh-CN or en.'));
  error.exitCode = 4;
  error.language = getLanguage();
  return error;
}

function scanLanguageArguments(args, program) {
  let command = program;
  let explicit;
  const remaining = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--') { remaining.push(...args.slice(index)); break; }
    if (token === '--lang' || token.startsWith('--lang=')) {
      explicit = token === '--lang' ? args[++index] : token.slice(7);
      if (explicit === undefined || explicit.startsWith('-')) throw languageError();
      continue;
    }
    remaining.push(token);
    const options = [];
    for (let parent = command; parent; parent = parent.parent) options.push(...parent.options);
    const equal = token.indexOf('=');
    const flag = equal === -1 ? token : token.slice(0, equal);
    const option = options.find(value => value.long === flag || value.short === flag);
    if (option) {
      if (equal === -1 && args[index + 1] !== undefined && args[index + 1] !== '--' &&
          (option.required || (option.optional && !args[index + 1].startsWith('-')))) remaining.push(args[++index]);
      continue;
    }
    if (/^-[^-].+/.test(token)) {
      // A required short option consumes its remaining suffix, or the next token.
      for (let offset = 1; offset < token.length; offset += 1) {
        const short = options.find(value => value.short === `-${token[offset]}`);
        if (short?.required || short?.optional) {
          if (offset === token.length - 1 && args[index + 1] !== undefined && args[index + 1] !== '--' &&
              (short.required || !args[index + 1].startsWith('-'))) remaining.push(args[++index]);
          break;
        }
      }
      continue;
    }
    const child = command.commands.find(value => value.name() === token || value.aliases().includes(token));
    if (child) command = child;
  }
  return { language: explicit, args: remaining };
}

/** Resolve language before Commander handles help or validation errors. */
function resolveLanguage(args, program, dependencies = {}) {
  const { language: explicit } = scanLanguageArguments(args, program);
  if (explicit !== undefined) {
    if (!isLanguage(explicit)) throw languageError();
    return { language: explicit, source: 'argument' };
  }
  const environment = (dependencies.env || process.env).FNOS_LANG;
  if (environment !== undefined && environment !== '') {
    if (!isLanguage(environment)) throw languageError();
    return { language: environment, source: 'environment' };
  }
  try {
    const saved = (dependencies.settings || settings).getLanguage?.();
    if (isLanguage(saved)) return { language: saved, source: 'settings' };
  } catch { /* Help and version remain available when credentials are unreadable. */ }
  return { language: 'zh-CN', source: 'default' };
}

const errors = {
  'commander.unknownCommand': [/^error: unknown command '([^\n]*)'/, "error: unknown command '{value}'"],
  'commander.unknownOption': [/^error: unknown option '([^\n]*)'/, "error: unknown option '{value}'"],
  'commander.missingArgument': [/^error: missing required argument '([^\n]*)'/, "error: missing required argument '{value}'"],
  'commander.optionMissingArgument': [/^error: option '([^\n]*)' argument missing/, "error: option '{value}' argument missing"],
  'commander.missingMandatoryOptionValue': [/^error: required option '([^\n]*)' not specified/, "error: required option '{value}' not specified"]
};

function translateError(message, code) {
  const definition = errors[code];
  if (definition) {
    message = message.replace(definition[0], (_match, value) => t(definition[1], { value }));
    message = message.replace(/\(Did you mean one of ([^\n]+)\?\)/g, (_match, suggestions) => t('(Did you mean one of {suggestions}?)', { suggestions }));
    message = message.replace(/\(Did you mean ([^\n]+)\?\)/g, (_match, suggestion) => t('(Did you mean {suggestion}?)', { suggestion }));
  }
  if (code === 'commander.excessArguments') {
    message = message.replace(/^error: too many arguments(?: for '([^\n]*)')?\. Expected (\d+) arguments? but got (\d+)\.$/, (_match, command, expected, received) =>
      command === undefined
        ? t('error: too many arguments. Expected {expected} but got {received}.', { expected, received })
        : t("error: too many arguments for '{command}'. Expected {expected} but got {received}.", { command, expected, received }));
  }
  if (code === 'commander.invalidArgument') {
    message = message.replace(/^error: (option|argument) '([^\n]*)' argument '([^\n]*)' is invalid\. (.*)$/, (_match, kind, option, value, reason) =>
      t("error: {kind} '{option}' argument '{value}' is invalid. {reason}", { kind: t(kind), option, value, reason }));
  }
  return message;
}

function translateExtraInfo(description) {
  return description.replace(/\b(default|choices|preset|env): /g, (_match, label) => `${t(label)}: `);
}

/** Adapt existing commands while retaining one stable tree for parsing and completion. */
function configureLocalization(program, dependencies = {}) {
  const originals = new WeakMap();
  const commands = [];
  const collect = command => {
    commands.push(command);
    originals.set(command, command.description());
    for (const value of [...command.options, ...command.registeredArguments]) originals.set(value, value.description);
    command.configureHelp({
      ...command.configureHelp(),
      formatHelp(current, helper) {
        return Help.prototype.formatHelp.call(this, current, helper)
          .replace(/^(Usage:|Arguments:|Options:|Global Options:|Commands:)/gm, heading => t(heading));
      },
      optionDescription(option) { return translateExtraInfo(Help.prototype.optionDescription.call(this, option)); },
      argumentDescription(argument) { return translateExtraInfo(Help.prototype.argumentDescription.call(this, argument)); }
    });
    const report = command.error;
    command.error = function(message, options = {}) {
      return report.call(this, translateError(message, options.code), options);
    };
    command.commands.forEach(collect);
  };
  collect(program);
  const localize = () => {
    for (const command of commands) {
      command.description(t(originals.get(command)));
      for (const value of [...command.options, ...command.registeredArguments]) value.description = t(originals.get(value));
      command.helpOption('-h, --help', t('display help for command'));
      command._helpCommandDescription = t('display help for command');
    }
  };
  localize();
  // Switches are extracted before root parsing. Leave literal --lang values for
  // the child command, whose required options are unknown to the root parser.
  const findOption = program._findOption;
  program._findOption = function(flag) { return flag === '--lang' ? undefined : findOption.call(this, flag); };
  let parsing = 0;
  const parse = program._parseCommand;
  program._parseCommand = function(operands, args) {
    const selection = resolveLanguage(args, program, dependencies);
    program.languageSelection = selection;
    program.setOptionValueWithSource('lang', selection.language, { argument: 'cli', environment: 'env', settings: 'config', default: 'default' }[selection.source]);
    const cleanedArgs = scanLanguageArguments(args, program).args;
    return withLanguage(selection.language, () => {
      localize();
      parsing += 1;
      const finish = error => { parsing -= 1; if (error) { error.language = selection.language; throw error; } };
      try {
        const result = parse.call(this, operands, cleanedArgs);
        if (result && typeof result.then === 'function') return result.then(value => { finish(); return value; }, finish);
        finish();
        return result;
      } catch (error) { return finish(error); }
    });
  };
  for (const command of commands) {
    const outputHelp = command.outputHelp;
    command.outputHelp = function(...args) {
      if (parsing) return outputHelp.apply(this, args);
      const selection = resolveLanguage([], program, dependencies);
      program.languageSelection = selection;
      return withLanguage(selection.language, () => { localize(); return outputHelp.apply(this, args); });
    };
  }
  return program;
}

module.exports = { resolveLanguage, configureLocalization };
