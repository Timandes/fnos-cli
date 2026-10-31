const SUPPORTED_LANGUAGES = Object.freeze(['zh-CN', 'en']);

/** Test an explicit CLI language identifier without loading dictionaries. */
function isLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value);
}

/** Interpolate named values once, without interpreting replacement text. */
function interpolate(message, values = {}) {
  return message.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : match);
}

module.exports = { SUPPORTED_LANGUAGES, isLanguage, interpolate };
