/**
 * Settings manager for fnos
 */

const fs = require('node:fs');
const { randomUUID, createHash } = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const { acquireFileLock, acquireFileLockSync } = require('./file-lock');
const { isLanguage } = require('../i18n/languages');

const AUTH_FIELDS = [
  'endpoint', 'username', 'password', 'token', 'longToken', 'secret',
  'credentialVersion', 'secretFormat', 'verifySsl'
];
const REQUIRED_CREDENTIAL_FIELDS = ['endpoint', 'username', 'password'];
const SERVER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

class ConfigurationError extends Error {
  constructor(message, values = {}) {
    super(require('../i18n').t(message, values));
    this.name = 'ConfigurationError';
    this.exitCode = 1;
  }
}

function pickCredentials(record) {
  if (record.authType === 'oauth') {
    const oauth = record.oauth;
    return {
      authType: 'oauth', endpoint: record.endpoint,
      ...(record.username ? { username: record.username } : {}),
      oauth: {
        clientId: oauth.clientId, deviceId: oauth.deviceId, deviceName: oauth.deviceName,
        scopes: [...oauth.scopes], verifySsl: oauth.verifySsl === true,
        session: { accessToken: oauth.session.accessToken, refreshToken: oauth.session.refreshToken, expiresAt: oauth.session.expiresAt }
      }
    };
  }
  return Object.fromEntries(
    [...AUTH_FIELDS, 'authType']
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
  return (left.authType || 'password') === (right.authType || 'password') &&
    AUTH_FIELDS.every((field) => field === 'verifySsl'
      ? (left[field] === true) === (right[field] === true)
      : left[field] === right[field]);
}

function validateCredentialRecord(record, label) {
  if (record?.verifySsl !== undefined && typeof record.verifySsl !== 'boolean') {
    throw new ConfigurationError('Invalid certificate verification policy for server "{label}".', { label });
  }
  if (record?.authType !== undefined && !['password', 'oauth'].includes(record.authType)) {
    throw new ConfigurationError('Unsupported authentication type for server "{label}".', { label });
  }
  if (record?.authType === 'oauth') {
    const oauth = record.oauth;
    const session = oauth?.session;
    let validEndpoint = false;
    try {
      const url = new URL(record.endpoint);
      validEndpoint = !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' &&
        (url.protocol === 'https:' || (url.protocol === 'http:' && oauth?.verifySsl !== true));
    } catch {}
    if (!validEndpoint || !isPlainObject(oauth) || (oauth.verifySsl !== undefined && typeof oauth.verifySsl !== 'boolean') ||
        !['clientId', 'deviceId', 'deviceName'].every(key => typeof oauth[key] === 'string' && oauth[key].trim()) ||
        !Array.isArray(oauth.scopes) || !oauth.scopes.length || oauth.scopes.some(value => typeof value !== 'string' || !value.trim()) ||
        !isPlainObject(session) || !['accessToken', 'refreshToken'].every(key => typeof session[key] === 'string' && session[key]) ||
        !Number.isFinite(session.expiresAt) || session.expiresAt <= 0) {
      throw new ConfigurationError('Invalid OAuth credentials for server "{label}".', { label });
    }
    return;
  }
  if (!isPlainObject(record) ||
      REQUIRED_CREDENTIAL_FIELDS.some((field) =>
    typeof record[field] !== 'string' || record[field].length === 0)) {
    throw new ConfigurationError('Invalid credentials for server "{label}".', { label });
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
      console.error(require('../i18n').t('Failed to save settings.'));
      throw error;
    }
  }

  _loadPreferenceSettings() {
    if (!this.exists()) return {};
    const data = this.load();
    if (!isPlainObject(data)) throw new ConfigurationError('Invalid settings structure.');
    return data;
  }

  /** Read a language preference without migrating or modifying credentials. */
  getLanguage() {
    return this._loadPreferenceSettings().language ?? null;
  }

  /** Merge a validated language preference under the shared settings lock. */
  setLanguage(language) {
    if (!isLanguage(language)) {
      const error = new Error(require('../i18n').t('Language must be zh-CN or en.'));
      error.exitCode = 4;
      throw error;
    }
    return this._withSettingsLock(() => {
      this.save({ ...this._loadPreferenceSettings(), language });
    });
  }

  /** Clear only the language preference, leaving an absent file absent. */
  clearLanguage() {
    if (!this.exists()) return;
    return this._withSettingsLock(() => {
      const data = this._loadPreferenceSettings();
      if (!Object.hasOwn(data, 'language')) return;
      delete data.language;
      this.save(data);
    });
  }

  clear() {
    if (fs.existsSync(this.settingsPath)) fs.unlinkSync(this.settingsPath);
  }

  clearCredentials(serverName = 'default') {
    return this._withSettingsLock(() => this._clearCredentials(serverName));
  }

  _clearCredentials(serverName) {
    const data = this._loadCredentialSettings(true);
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

  _loadCredentialSettings(locked = false) {
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
        throw new ConfigurationError('Invalid server name in settings: "{name}".', { name });
      }
      validateCredentialRecord(credentials, name);
    }
    const hasLegacy = AUTH_FIELDS.some((field) =>
      Object.prototype.hasOwnProperty.call(data, field));
    if (!hasLegacy) return { ...data, servers };
    if (!locked) return this._withSettingsLock(() => this._loadCredentialSettings(true));
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
        throw new ConfigurationError('Invalid server name in settings: "{name}".', { name });
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
      throw new ConfigurationError('Invalid server name: "{name}".', { name: serverName });
    }
    validateCredentialRecord(credentials, serverName);
    const record = pickCredentials(credentials.authType === 'oauth' ? credentials : {
      credentialVersion: 2, secretFormat: 'decrypted-v1', ...credentials, authType: 'password'
    });
    return this._withSettingsLock(() => {
      const data = this._loadCredentialSettings(true);
      this.save({ ...data, servers: { ...data.servers, [serverName]: record } });
    });
  }

  _withSettingsLock(action) {
    this._ensureDir();
    const release = acquireFileLockSync(`${this.settingsPath}.lock`);
    try { return action(); } finally { release(); }
  }

  /** Save a rotated session only if the target identity still matches. */
  updateOAuthSession(serverName, identity, session) {
    return this._withSettingsLock(() => {
      const data = this._loadCredentialSettings(true);
      const current = data.servers[serverName];
      if (current?.authType !== 'oauth' || current.endpoint !== identity.endpoint ||
          current.oauth.clientId !== identity.oauth.clientId || current.oauth.deviceId !== identity.oauth.deviceId ||
          current.oauth.session.refreshToken !== identity.oauth.session.refreshToken) {
        throw new ConfigurationError('OAuth server credentials changed or were removed; run login again.');
      }
      const record = { ...current, oauth: { ...current.oauth, session } };
      validateCredentialRecord(record, serverName);
      this.save({ ...data, servers: { ...data.servers, [serverName]: pickCredentials(record) } });
    });
  }

  /** Acquire the named server lock before re-reading credentials. */
  async acquireServerLock(serverName) {
    if (!isValidServerName(serverName)) throw new ConfigurationError('Invalid server name.');
    this._ensureDir();
    const lockName = createHash('sha256').update(serverName).digest('hex');
    return acquireFileLock(path.join(this.settingsDir, `server-${lockName}.lock`));
  }

  /** Serialize login, logout and OAuth execution for the same server. */
  async withServerLock(serverName, action) {
    const release = await this.acquireServerLock(serverName);
    try { return await action(); } finally { release(); }
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
