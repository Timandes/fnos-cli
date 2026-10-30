const { t, withLanguage, getLanguage } = require('../i18n');
const { ConfigurationError } = require('./settings');
const { isLanguage } = require('../i18n/languages');
const { HTTPSRequiredError } = require('fnos');
const { redactSensitive } = require('./logger');

function errorMessage(error) {
  const message = error instanceof HTTPSRequiredError
    ? t('fnOS requires HTTPS: {requested} was redirected to {redirect}. Use the corresponding wss:// endpoint.', { requested: error.requestedUri, redirect: error.redirectUri })
    : error instanceof ConfigurationError ? t(error.messageKey, error.messageValues)
      : error?.message || String(error);
  return redactSensitive(message);
}

/** Format a failure after its async invocation context may have unwound. */
function formatError(error) {
  return withLanguage(isLanguage(error?.language) ? error.language : getLanguage(), () =>
    t('Error: {message}', { message: errorMessage(error) }));
}

module.exports = { errorMessage, formatError };
