const SUPPORTED_LANGUAGES = Object.freeze(['zh-CN', 'en']);

/** Test an explicit CLI language identifier without loading dictionaries. */
function isLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value);
}

module.exports = { SUPPORTED_LANGUAGES, isLanguage };
