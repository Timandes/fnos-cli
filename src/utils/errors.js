const { HTTPSRequiredError } = require('fnos');
const { redactSensitive } = require('./logger');

function errorMessage(error) {
  const message = error instanceof HTTPSRequiredError
    ? `fnOS requires HTTPS: ${error.requestedUri} was redirected to ${error.redirectUri}. Use the corresponding wss:// endpoint.`
    : error?.message || String(error);
  return redactSensitive(message);
}

module.exports = { errorMessage };
