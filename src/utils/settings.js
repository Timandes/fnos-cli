/**
 * Settings manager for fnos
 */

const fs = require('node:fs');
const { randomUUID, createHash } = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const { acquireFileLock, acquireFileLockSync } = require('./file-lock');
const { protectPath } = require('./private-path');
const { PasswordStore, isEncryptedPassword } = require('./password-store');
const { isLanguage, interpolate } = require('../i18n/languages');

const AUTH_FIELDS = [
  'endpoint', 'username', 'password', 'token', 'longToken', 'secret',
  'credentialVersion', 'secretFormat', 'verifySsl'
];
const REQUIRED_CREDENTIAL_FIELDS = ['endpoint', 'username', 'password'];
const SERVER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

class ConfigurationError extends Error {
  constructor(message, values = {}) {
    super(interpolate(message, values));
    this.messageKey = message;
    this.messageValues = values;
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

function sameKnownCredentials(left, right, decode) {
  return (left.authType || 'password') === (right.authType || 'password') &&
    AUTH_FIELDS.every((field) => field === 'password'
      ? decode(left) === decode(right)
      : field === 'verifySsl'
      ? (left[field] === true) === (right[field] === true)
      : left[field] === right[field]);
}

function validateCredentialRecord(record, label, metadataOnly = false) {
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
    field === 'password' && (isEncryptedPassword(record[field]) || (metadataOnly && isPlainObject(record[field]))) ? false :
    typeof record[field] !== 'string' || record[field].length === 0)) {
    throw new ConfigurationError('Invalid credentials for server "{label}".', { label });
  }
}

class Settings {
  constructor(homeDir = os.homedir()) {
    this.settingsDir = path.join(homeDir, '.fnos');
    this.settingsPath = path.join(this.settingsDir, 'settings.json');
    this.passwordStore = new PasswordStore(this.settingsDir);
  }

  _ensureDir() {
    fs.mkdirSync(this.settingsDir, { recursive: true, mode: 0o700 });
    protectPath(this.settingsDir, true);
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

  _passwordContext(record, name) {
    return [name, record.endpoint, record.username];
  }

  _decodePassword(record, name, secure = true) {
    return typeof record.password === 'string' ? record.password
      : this.passwordStore.decrypt(record.password, this._passwordContext(record, name), secure);
  }

  _encryptRecord(record, name) {
    if (!isPlainObject(record) || record.authType === 'oauth' || typeof record.password !== 'string' || !record.password) return record;
    return { ...record, password: this.passwordStore.encrypt(record.password, this._passwordContext(record, name)) };
  }

  save(data, { encryptPasswords = true } = {}) {
    this._ensureDir();
    const temporaryPath = `${this.settingsPath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      const records = [data, ...Object.values(isPlainObject(data.servers) ? data.servers : {})];
      if (encryptPasswords && records.some(record => isEncryptedPassword(record?.password)) &&
          records.some(record => record?.authType !== 'oauth' && typeof record?.password === 'string')) {
        // Reads/migrations must never silently rotate a missing key.
        this.passwordStore.key(false);
      }
      const encoded = encryptPasswords ? this._encryptRecord({ ...data }, 'default') : { ...data };
      if (encryptPasswords && isPlainObject(data.servers)) {
        encoded.servers = Object.fromEntries(Object.entries(data.servers).map(([name, record]) => [name, this._encryptRecord(record, name)]));
      }
      const fd = fs.openSync(temporaryPath, 'wx', 0o600);
      try {
        protectPath(temporaryPath);
        fs.writeFileSync(fd, JSON.stringify(encoded, null, 2));
      } finally { fs.closeSync(fd); }
      fs.renameSync(temporaryPath, this.settingsPath);
      return encoded;
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
    const data = this._loadCredentialSettings(true, { migrate: false, skipServer: serverName, metadataOnly: true });
    if (!Object.prototype.hasOwnProperty.call(data.servers, serverName)) {
      return false;
    }
    const servers = { ...data.servers };
    delete servers[serverName];
    // Logout must remain possible without the key; preserve other records byte-for-byte in value.
    this.save({ ...data, servers }, { encryptPasswords: false });
    return true;
  }

  exists() {
    return fs.existsSync(this.settingsPath);
  }

  _loadCredentialSettings(locked = false, { migrate = true, skipServer, metadataOnly = false } = {}) {
    const data = this.load() || {};
    if (!isPlainObject(data)) throw new ConfigurationError('Invalid settings structure.');
    const servers = data.servers === undefined ? {} : data.servers;
    if (!isPlainObject(servers)) throw new ConfigurationError('Invalid servers configuration.');
    for (const [name, credentials] of Object.entries(servers)) {
      if (!isValidServerName(name)) {
        throw new ConfigurationError('Invalid server name in settings: "{name}".', { name });
      }
      if (name !== skipServer) validateCredentialRecord(credentials, name, metadataOnly);
    }
    const hasLegacy = AUTH_FIELDS.some(field => Object.hasOwn(data, field));
    let normalized = { ...data, servers };
    if (hasLegacy) {
      const legacy = pickCredentials(data);
      if (skipServer !== 'default') {
        validateCredentialRecord(legacy, 'default', metadataOnly);
        // Metadata queries compare identities/policies without accessing the key.
        const encryptedDuplicate = isPlainObject(legacy.password) || isPlainObject(servers.default?.password);
        const decode = metadataOnly && encryptedDuplicate ? () => '' : record => this._decodePassword(record, 'default', false);
        if (servers.default && !sameKnownCredentials(legacy, servers.default, decode)) {
          throw new ConfigurationError('Conflicting legacy credentials and servers.default were found.');
        }
      }
      normalized = { ...data, servers: { ...servers, default: servers.default || legacy } };
      AUTH_FIELDS.forEach(field => delete normalized[field]);
    }
    const hasPlaintext = Object.values(servers).some(record => record.authType !== 'oauth' && typeof record.password === 'string');
    if (!migrate || (!hasLegacy && !hasPlaintext)) return normalized;
    if (!locked) return this._withSettingsLock(() => this._loadCredentialSettings(true));
    return this.save(normalized);
  }

  listServers() {
    const data = this._loadCredentialSettings(false, { migrate: false, metadataOnly: true });
    return Object.entries(data.servers).map(([name, credentials]) => ({
      name, endpoint: credentials.endpoint, username: credentials.username
    }));
  }

  listServerNamesReadOnly() {
    const data = this._loadCredentialSettings(false, { migrate: false, metadataOnly: true });
    return sortServerNames(Object.keys(data.servers));
  }

  /** Return status fields without decrypting, migrating or exposing secrets. */
  getCredentialMetadata(serverName = 'default') {
    const record = this._loadCredentialSettings(false, { migrate: false, metadataOnly: true }).servers[serverName];
    if (!record) return null;
    return { authType: record.authType || 'password', endpoint: record.endpoint, username: record.username,
      verifySsl: record.verifySsl === true,
      ...(record.authType === 'oauth' ? { oauth: { verifySsl: record.oauth.verifySsl === true,
        session: { expiresAt: record.oauth.session.expiresAt } } } : {}) };
  }

  getCredentials(serverName = 'default') {
    const data = this._loadCredentialSettings();
    const credentials = data.servers[serverName];
    if (!credentials) return null;
    const record = pickCredentials(credentials);
    if (record.authType !== 'oauth') record.password = this._decodePassword(record, serverName);
    return record;
  }

  saveCredentials(serverName, credentials, { allowKeyCreation = false } = {}) {
    if (!isValidServerName(serverName)) {
      throw new ConfigurationError('Invalid server name: "{name}".', { name: serverName });
    }
    validateCredentialRecord(credentials, serverName);
    const record = pickCredentials(credentials.authType === 'oauth' ? credentials : {
      credentialVersion: 2, secretFormat: 'decrypted-v1', ...credentials, authType: 'password'
    });
    return this._withSettingsLock(() => {
      // Replacing a server must work even if that server's envelope is damaged.
      const data = this._loadCredentialSettings(true, { migrate: false, skipServer: serverName, metadataOnly: true });
      if (credentials.authType !== 'oauth') {
        const hasEncrypted = Object.values(data.servers).some(value => isPlainObject(value?.password));
        if (allowKeyCreation) this.passwordStore.key(true);
        else if (hasEncrypted) this.passwordStore.key(false);
      }
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
