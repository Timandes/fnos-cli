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

/** Resolve language before Commander handles help or validation errors. */
function resolveLanguage(args, program, dependencies = {}) {
  let command = program;
  let explicit;
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--') break;
    if (token === '--lang' || token.startsWith('--lang=')) {
      explicit = token === '--lang' ? args[++index] : token.slice(7);
      if (explicit === undefined || explicit.startsWith('-')) throw languageError();
      continue;
    }
    const options = [];
    for (let parent = command; parent; parent = parent.parent) options.push(...parent.options);
    const equal = token.indexOf('=');
    const flag = equal === -1 ? token : token.slice(0, equal);
    const option = options.find(value => value.long === flag || value.short === flag);
    if (option) {
      if ((option.required || option.optional) && equal === -1) index += 1;
      continue;
    }
    if (/^-[^-].+/.test(token)) {
      // A required short option consumes its remaining suffix, or the next token.
      for (let offset = 1; offset < token.length; offset += 1) {
        const short = options.find(value => value.short === `-${token[offset]}`);
        if (short?.required || short?.optional) {
          if (offset === token.length - 1) index += 1;
          break;
        }
      }
      continue;
    }
    const child = command.commands.find(value => value.name() === token || value.aliases().includes(token));
    if (child) command = child;
  }
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
    message = message.replace(/\(Did you mean ([^\n]+)\?\)/g, (_match, suggestion) => t('(Did you mean {suggestion}?)', { suggestion }));
  }
  if (code === 'commander.excessArguments') {
    message = message.replace(/^error: too many arguments( for '[^\n]*')?\. Expected (\d+) arguments? but got (\d+)\.$/, (_match, command = '', expected, received) =>
      t('error: too many arguments{command}. Expected {expected} but got {received}.', { command, expected, received }));
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
  let parsing = 0;
  const parse = program._parseCommand;
  program._parseCommand = function(operands, args) {
    const selection = resolveLanguage(args, program, dependencies);
    program.languageSelection = selection;
    return withLanguage(selection.language, () => {
      localize();
      parsing += 1;
      const finish = error => { parsing -= 1; if (error) { error.language = selection.language; throw error; } };
      try {
        const result = parse.call(this, operands, args);
        if (result && typeof result.then === 'function') return result.then(value => { finish(); return value; }, finish);
        finish();
        return result;
      } catch (error) { return finish(error); }
    });
  };
  const outputHelp = program.outputHelp;
  program.outputHelp = function(...args) {
    if (parsing) return outputHelp.apply(this, args);
    const selection = resolveLanguage([], program, dependencies);
    program.languageSelection = selection;
    return withLanguage(selection.language, () => { localize(); return outputHelp.apply(this, args); });
  };
  return program;
}

module.exports = { resolveLanguage, configureLocalization };
