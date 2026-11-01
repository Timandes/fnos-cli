const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createCipheriv, createDecipheriv } = require('node:crypto');
const { protectPath } = require('./private-path');

function base64Bytes(value, length) {
  if (typeof value !== 'string' || !value.length) return false;
  const bytes = Buffer.from(value, 'base64');
  return bytes.toString('base64') === value && (length === undefined ? bytes.length > 0 : bytes.length === length);
}

function isEncryptedPassword(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    value.version === 1 && value.algorithm === 'aes-256-gcm' &&
    base64Bytes(value.iv, 12) && base64Bytes(value.tag, 16) && base64Bytes(value.ciphertext);
}

class PasswordStore {
  constructor(settingsDir) {
    this.keyPath = path.join(settingsDir, 'password.key');
  }

  // Creation is called only while holding the settings lock. Never replace a bad key.
  key(create, secure = true) {
    try {
      if (create && !fs.existsSync(this.keyPath)) {
        const fd = fs.openSync(this.keyPath, 'wx', 0o600);
        try {
          protectPath(this.keyPath);
          fs.writeFileSync(fd, randomBytes(32));
        } catch (error) {
          fs.closeSync(fd);
          fs.unlinkSync(this.keyPath);
          throw error;
        }
        fs.closeSync(fd);
      }
      if (!fs.lstatSync(this.keyPath).isFile()) throw new Error('Invalid key path');
      if (secure) protectPath(this.keyPath);
      const key = fs.readFileSync(this.keyPath);
      if (key.length !== 32) throw new Error('Invalid key length');
      return key;
    } catch {
      throw new Error(require('../i18n').t('Password key is missing, damaged or inaccessible. If damaged, remove ~/.fnos/password.key, then run "fnos login" again.'));
    }
  }

  encrypt(password, context) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(true), iv);
    cipher.setAAD(Buffer.from(JSON.stringify(['fnos-password-v1', ...context])));
    const ciphertext = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
    return { version: 1, algorithm: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
  }

  decrypt(envelope, context, secure = true) {
    const key = this.key(false, secure);
    try {
      if (!isEncryptedPassword(envelope)) throw new Error('Invalid encrypted password');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
      decipher.setAAD(Buffer.from(JSON.stringify(['fnos-password-v1', ...context])));
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8');
    } catch {
      throw new Error(require('../i18n').t('Failed to decrypt saved password. Run "fnos login" again for this server.'));
    }
  }
}

module.exports = { PasswordStore, isEncryptedPassword };
