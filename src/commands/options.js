const { t } = require('../i18n');
const { Option } = require('commander');
const { isValidServerName } = require('../utils/settings');
const {
  SERVER_COMPLETION,
  fixedValues,
  withCompletion
} = require('../completion/metadata');

class CommandParameterError extends Error {
  constructor(message, values = {}) {
    super(t(message, values));
    this.name = 'CommandParameterError';
    this.exitCode = 4;
  }
}

function cloneDefault(value) {
  if (Array.isArray(value)) return value.map((item) => cloneDefault(item));
  if (value && typeof value === 'object') return { ...value };
  return value;
}

function parseBoolean(name, value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string' && value.toLowerCase() === 'true') return true;
  if (typeof value === 'string' && value.toLowerCase() === 'false') return false;
  throw new CommandParameterError('--{name} must be true or false.', { name });
}

function parseInteger(definition, value) {
  if (typeof value === 'string' && !/^-?\d+$/.test(value.trim())) {
    throw new CommandParameterError('--{name} must be a decimal integer.', { name: definition.name });
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) throw new CommandParameterError('--{name} must be an integer.', { name: definition.name });
  if (definition.min !== undefined && parsed < definition.min) {
    throw new CommandParameterError('--{name} must be at least {min}.', { name: definition.name, min: definition.min });
  }
  if (definition.max !== undefined && parsed > definition.max) {
    throw new CommandParameterError('--{name} must be at most {max}.', { name: definition.name, max: definition.max });
  }
  if (definition.allowedValues && !definition.allowedValues.includes(parsed)) {
    throw new CommandParameterError('--{name} must be one of: {values}.', { name: definition.name, values: definition.allowedValues.join(', ') });
  }
  return parsed;
}

function parseJson(name, value) {
  if (value && typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new CommandParameterError('--{name} must be valid JSON.', { name });
  }
}

function parseValue(definition, value) {
  if (definition.type === 'boolean') return parseBoolean(definition.name, value);
  if (definition.type === 'integer') return parseInteger(definition, value);
  if (definition.type === 'csv') {
    const values = Array.isArray(value) ? value : String(value).split(',').map((item) => item.trim()).filter(Boolean);
    if (values.length === 0) throw new CommandParameterError('--{name} must contain at least one value.', { name: definition.name });
    return values;
  }
  if (definition.type === 'json') {
    const parsed = parseJson(definition.name, value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new CommandParameterError('--{name} must be a JSON object.', { name: definition.name });
    }
    return parsed;
  }
  if (definition.type === 'json-record-array') {
    const parsed = parseJson(definition.name, value);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((item) => !item || Array.isArray(item) || typeof item !== 'object')) {
      throw new CommandParameterError('--{name} must be a non-empty JSON object array.', { name: definition.name });
    }
    return parsed;
  }
  const parsed = String(value);
  if (!parsed.trim()) throw new CommandParameterError('--{name} must not be empty.', { name: definition.name });
  return parsed;
}

function optionReadNames(definition) {
  if (definition.readNames) return definition.readNames;
  return [new Option(definition.flag).attributeName()];
}

function readRawValue(definition, options) {
  for (const name of optionReadNames(definition)) {
    if (options[name] !== undefined) return options[name];
  }
  return undefined;
}

function buildMethodArguments(definition, options, timeout = 10000) {
  const values = definition.options.map((option) => {
    const raw = readRawValue(option, options);
    if (raw === undefined) {
      if (option.required) throw new CommandParameterError('--{name} is required.', { name: option.name });
      return cloneDefault(option.defaultValue);
    }
    return parseValue(option, raw);
  });
  return definition.timeoutPosition === 'first' ? [timeout, ...values] : [...values, timeout];
}

function completionForDefinition(definition) {
  if (definition.type === 'boolean') return fixedValues(['true', 'false']);
  if (Array.isArray(definition.allowedValues)) {
    return fixedValues(definition.allowedValues);
  }
  return null;
}

function registerBusinessOptions(command, definitions) {
  for (const definition of definitions) {
    const option = new Option(definition.flag, definition.description);
    const completion = completionForDefinition(definition);
    command.addOption(completion ? withCompletion(option, completion) : option);
    for (const legacyFlag of definition.legacyFlags || []) {
      command.addOption(new Option(legacyFlag, `${definition.description} (legacy spelling)`).hideHelp());
    }
  }
  return command;
}

function parseServerName(value) {
  if (!isValidServerName(value)) {
    throw new CommandParameterError(
      '--server must match [A-Za-z0-9][A-Za-z0-9._-]{0,63}.'
    );
  }
  return value;
}

function registerServerOption(command) {
  const option = new Option('-s, --server <name>', 'Saved server name')
    .argParser(parseServerName);
  command.addOption(withCompletion(option, SERVER_COMPLETION));
  return command;
}

function registerAuthenticationOptions(command, requiredCredentials = false) {
  registerServerOption(command);
  const add = requiredCredentials ? 'requiredOption' : 'option';
  command[add]('-e, --endpoint <endpoint>', 'Server endpoint, including optional ws:// or wss:// prefix');
  command[add]('-u, --username <username>', 'Username');
  command[add]('-p, --password <password>', 'Password');
  command.option('--twofa-code <code>', 'Six-digit two-factor code');
  command.option('--trust-device', 'Trust this device after two-factor login');
  command.option('--verify-ssl', 'Verify HTTPS/WSS certificates (saved with login; default: disabled)');
  return command;
}

module.exports = {
  CommandParameterError,
  buildMethodArguments,
  parseServerName,
  registerAuthenticationOptions,
  registerBusinessOptions,
  registerServerOption
};
