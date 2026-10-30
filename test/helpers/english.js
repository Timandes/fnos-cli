const mocha = require('mocha');
const { withLanguage } = require('../../src/i18n');
const { createProgram } = require('../../src');

// Explicit language for pre-existing English-copy regressions; default-language
// tests use the real public entry points without these helpers.
function it(title, callback) {
  return mocha.it(title, callback && function() {
    return withLanguage('en', () => callback.call(this));
  });
}

function createEnglishProgram(dependencies = {}) {
  return withLanguage('en', () => createProgram({
    ...dependencies,
    env: { ...(dependencies.env || process.env), FNOS_LANG: 'en' }
  }));
}

module.exports = { it, createEnglishProgram };
