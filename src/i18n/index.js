const { AsyncLocalStorage } = require('node:async_hooks');
const { isLanguage } = require('./languages');
const dictionaries = { en: require('./en'), 'zh-CN': require('./zh-CN') };
const context = new AsyncLocalStorage();

/** Return the language for this invocation, defaulting to simplified Chinese. */
function getLanguage() {
  return context.getStore() || 'zh-CN';
}

/** Run synchronous or asynchronous work in an isolated language context. */
function withLanguage(language, callback) {
  if (!isLanguage(language)) throw new TypeError('Language must be zh-CN or en.');
  return context.run(language, callback);
}

/** Translate CLI-owned text; interpolated values are always treated literally. */
function t(key, values = {}) {
  const dictionary = dictionaries[getLanguage()];
  const message = Object.hasOwn(dictionary, key) ? dictionary[key]
    : Object.hasOwn(dictionaries.en, key) ? dictionaries.en[key] : key;
  return message.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : match);
}

module.exports = { getLanguage, withLanguage, t };
