/**
 * Settings manager for fnos
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

class Settings {
  constructor(homeDir = os.homedir()) {
    this.settingsDir = path.join(homeDir, '.fnos');
    this.settingsPath = path.join(this.settingsDir, 'settings.json');
  }

  _ensureDir() {
    fs.mkdirSync(this.settingsDir, { recursive: true, mode: 0o700 });
  }

  load() {
    if (!fs.existsSync(this.settingsPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
    } catch (error) {
      console.error(error instanceof SyntaxError
        ? 'Failed to load settings: invalid JSON.'
        : 'Failed to load settings.');
      return null;
    }
  }

  save(data) {
    this._ensureDir();
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(data, null, 2), { mode: 0o600 });
      fs.chmodSync(this.settingsPath, 0o600);
    } catch (error) {
      console.error('Failed to save settings.');
      throw error;
    }
  }

  clear() {
    if (fs.existsSync(this.settingsPath)) fs.unlinkSync(this.settingsPath);
  }

  clearCredentials() {
    const existingSettings = this.load();
    if (!existingSettings) return;
    const authFields = [
      'endpoint', 'username', 'password', 'token', 'longToken', 'secret',
      'credentialVersion', 'secretFormat'
    ];
    authFields.forEach((field) => delete existingSettings[field]);
    this.save(existingSettings);
  }

  exists() {
    return fs.existsSync(this.settingsPath);
  }

  getCredentials() {
    const data = this.load();
    if (!data) return null;
    const fields = [
      'endpoint', 'username', 'password', 'token', 'longToken', 'secret',
      'credentialVersion', 'secretFormat'
    ];
    return Object.fromEntries(fields.map((field) => [field, data[field]]));
  }

  saveCredentials(credentials) {
    const existingSettings = this.load() || {};
    this.save({
      ...existingSettings,
      credentialVersion: 2,
      secretFormat: 'decrypted-v1',
      ...credentials
    });
  }
}

const settings = new Settings();
module.exports = settings;
module.exports.Settings = Settings;
