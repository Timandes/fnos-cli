/**
 * Settings manager for fnos
 */

const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const os = require('node:os');
const path = require('node:path');

const AUTH_FIELDS = [
  'endpoint', 'username', 'password', 'token', 'longToken', 'secret',
  'credentialVersion', 'secretFormat'
];
const REQUIRED_CREDENTIAL_FIELDS = ['endpoint', 'username', 'password'];
const SERVER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
    this.exitCode = 1;
  }
}

function pickCredentials(record) {
  return Object.fromEntries(
    AUTH_FIELDS
      .filter((field) => Object.prototype.hasOwnProperty.call(record, field))
      .map((field) => [field, record[field]])
  );
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidServerName(name) {
  return typeof name === 'string' && SERVER_NAME_PATTERN.test(name);
}

function sortServerNames(names) {
  return [...names].sort((left, right) => {
    if (left === 'default') return right === 'default' ? 0 : -1;
    if (right === 'default') return 1;
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  });
}

function sameKnownCredentials(left, right) {
  return AUTH_FIELDS.every((field) => left[field] === right[field]);
}

function validateCredentialRecord(record, label) {
  if (!isPlainObject(record) ||
      REQUIRED_CREDENTIAL_FIELDS.some((field) =>
    typeof record[field] !== 'string' || record[field].length === 0)) {
    throw new ConfigurationError(`Invalid credentials for server "${label}".`);
  }
}

class Settings {
  constructor(homeDir = os.homedir()) {
    this.settingsDir = path.join(homeDir, '.fnos');
    this.settingsPath = path.join(this.settingsDir, 'settings.json');
  }

  _ensureDir() {
    fs.mkdirSync(this.settingsDir, { recursive: true, mode: 0o700 });
    fs.chmodSync(this.settingsDir, 0o700);
  }

  load() {
    if (!fs.existsSync(this.settingsPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
    } catch (error) {
      throw new ConfigurationError(error instanceof SyntaxError
        ? 'Failed to load settings: invalid JSON.'
        : 'Failed to load settings.');
    }
  }

  save(data) {
    this._ensureDir();
    const temporaryPath = `${this.settingsPath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), { mode: 0o600 });
      fs.chmodSync(temporaryPath, 0o600);
      fs.renameSync(temporaryPath, this.settingsPath);
    } catch (error) {
      fs.rmSync(temporaryPath, { force: true });
      console.error('Failed to save settings.');
      throw error;
    }
  }

  clear() {
    if (fs.existsSync(this.settingsPath)) fs.unlinkSync(this.settingsPath);
  }

  clearCredentials(serverName = 'default') {
    const data = this._loadCredentialSettings();
    if (!Object.prototype.hasOwnProperty.call(data.servers, serverName)) {
      return false;
    }
    const servers = { ...data.servers };
    delete servers[serverName];
    this.save({ ...data, servers });
    return true;
  }

  exists() {
    return fs.existsSync(this.settingsPath);
  }

  _loadCredentialSettings() {
    const data = this.load() || {};
    if (!isPlainObject(data)) {
      throw new ConfigurationError('Invalid settings structure.');
    }
    const servers = data.servers === undefined ? {} : data.servers;
    if (!isPlainObject(servers)) {
      throw new ConfigurationError('Invalid servers configuration.');
    }
    for (const [name, credentials] of Object.entries(servers)) {
      if (!isValidServerName(name)) {
        throw new ConfigurationError(`Invalid server name in settings: "${name}".`);
      }
      validateCredentialRecord(credentials, name);
    }
    const hasLegacy = AUTH_FIELDS.some((field) =>
      Object.prototype.hasOwnProperty.call(data, field));
    if (!hasLegacy) return { ...data, servers };
    const legacy = pickCredentials(data);
    validateCredentialRecord(legacy, 'default');
    if (data.servers?.default &&
        !sameKnownCredentials(legacy, data.servers.default)) {
      throw new ConfigurationError(
        'Conflicting legacy credentials and servers.default were found.'
      );
    }

    const migrated = {
      ...data,
      servers: {
        ...servers,
        default: data.servers?.default || legacy
      }
    };
    AUTH_FIELDS.forEach((field) => delete migrated[field]);
    this.save(migrated);
    return migrated;
  }

  listServers() {
    const data = this._loadCredentialSettings();
    return Object.entries(data.servers).map(([name, credentials]) => ({
      name,
      endpoint: credentials.endpoint,
      username: credentials.username
    }));
  }

  listServerNamesReadOnly() {
    const data = this.load();
    if (data === null) return [];
    if (!isPlainObject(data)) {
      throw new ConfigurationError('Invalid settings structure.');
    }
    const servers = data.servers === undefined ? {} : data.servers;
    if (!isPlainObject(servers)) {
      throw new ConfigurationError('Invalid servers configuration.');
    }
    for (const [name, credentials] of Object.entries(servers)) {
      if (!isValidServerName(name)) {
        throw new ConfigurationError(`Invalid server name in settings: "${name}".`);
      }
      validateCredentialRecord(credentials, name);
    }
    const names = Object.keys(servers);
    const hasLegacy = AUTH_FIELDS.some((field) =>
      Object.prototype.hasOwnProperty.call(data, field));
    if (hasLegacy) {
      const legacy = pickCredentials(data);
      validateCredentialRecord(legacy, 'default');
      if (servers.default && !sameKnownCredentials(legacy, servers.default)) {
        throw new ConfigurationError(
          'Conflicting legacy credentials and servers.default were found.'
        );
      }
      names.push('default');
    }
    return sortServerNames([...new Set(names)]);
  }

  getCredentials(serverName = 'default') {
    const data = this._loadCredentialSettings();
    const credentials = data.servers[serverName];
    return credentials ? pickCredentials(credentials) : null;
  }

  saveCredentials(serverName, credentials) {
    if (!isValidServerName(serverName)) {
      throw new ConfigurationError(`Invalid server name: "${serverName}".`);
    }
    const data = this._loadCredentialSettings();
    const record = pickCredentials({
      credentialVersion: 2,
      secretFormat: 'decrypted-v1',
      ...credentials
    });
    validateCredentialRecord(record, serverName);
    this.save({
      ...data,
      servers: {
        ...data.servers,
        [serverName]: record
      }
    });
  }
}

const settings = new Settings();
module.exports = settings;
module.exports.Settings = Settings;
module.exports.AUTH_FIELDS = AUTH_FIELDS;
module.exports.ConfigurationError = ConfigurationError;
module.exports.SERVER_NAME_PATTERN = SERVER_NAME_PATTERN;
module.exports.isValidServerName = isValidServerName;
module.exports.sortServerNames = sortServerNames;
