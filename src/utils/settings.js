/**
 * Settings manager for fnos
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class Settings {
  constructor() {
    this.settingsDir = path.join(os.homedir(), '.fnos');
    this.settingsPath = path.join(this.settingsDir, 'settings.json');
  }

  /**
   * Ensure settings directory exists
   */
  _ensureDir() {
    if (!fs.existsSync(this.settingsDir)) {
      fs.mkdirSync(this.settingsDir, { recursive: true });
    }
  }

  /**
   * Load settings from file
   * @returns {Object|null} Settings object or null if not exists
   */
  load() {
    if (!fs.existsSync(this.settingsPath)) {
      return null;
    }
    try {
      const data = fs.readFileSync(this.settingsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load settings:', error.message);
      return null;
    }
  }

  /**
   * Save settings to file
   * @param {Object} data - Settings data to save
   */
  save(data) {
    this._ensureDir();
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(data, null, 2), {
        mode: 0o600 // Read/write for owner only
      });
    } catch (error) {
      console.error('Failed to save settings:', error.message);
      throw error;
    }
  }

  /**
   * Clear settings file
   */
  clear() {
    if (fs.existsSync(this.settingsPath)) {
      fs.unlinkSync(this.settingsPath);
    }
  }

  /**
   * Clear only authentication credentials, preserving other settings
   */
  clearCredentials() {
    const existingSettings = this.load();
    if (!existingSettings) {
      return;
    }

    // Remove only auth-related fields, keep other settings
    const authFields = ['endpoint', 'username', 'password', 'token', 'longToken', 'secret'];
    authFields.forEach(field => delete existingSettings[field]);

    // Always save the file (even if empty), to preserve the settings.json file
    this.save(existingSettings);
  }

  /**
   * Check if settings file exists
   * @returns {boolean} True if settings file exists
   */
  exists() {
    return fs.existsSync(this.settingsPath);
  }

  /**
   * Get authentication credentials
   * @returns {Object|null} Credentials object or null
   */
  getCredentials() {
    const settings = this.load();
    if (!settings) {
      return null;
    }
    return {
      endpoint: settings.endpoint,
      username: settings.username,
      password: settings.password,
      token: settings.token,
      longToken: settings.longToken,
      secret: settings.secret
    };
  }

  /**
   * Save authentication credentials
   * @param {Object} credentials - Credentials to save
   */
  saveCredentials(credentials) {
    const existingSettings = this.load() || {};
    this.save({
      ...existingSettings,
      ...credentials
    });
  }
}

module.exports = new Settings();