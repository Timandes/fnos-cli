const { HTTPSRequiredError } = require('fnos');
const { buildMethodArguments } = require('./options');
const clientUtils = require('../utils/client');
const { formatOutput } = require('../utils/formatter');
const { resolveCredentials } = require('../utils/auth-helper');

function errorMessage(error) {
  if (error instanceof HTTPSRequiredError) {
    return `fnOS requires HTTPS: ${error.requestedUri} was redirected to ${error.redirectUri}. Use the corresponding wss:// endpoint.`;
  }
  return error.message || String(error);
}

async function runCommand(context, dependencies = {}) {
  const createClient = dependencies.createClient || clientUtils.createClient;
  const getSDKInstance = dependencies.getSDKInstance || clientUtils.getSDKInstance;
  const resolve = dependencies.resolveCredentials || resolveCredentials;
  const stdout = dependencies.stdout || console.log;
  const stderr = dependencies.stderr || console.error;
  let client;

  try {
    const args = buildMethodArguments(context.definition, context.options, 10000);
    const credentials = resolve(context.options);
    client = await createClient({
      credentials,
      timeout: 60,
      twofaCode: context.options.twofaCode,
      trustDevice: context.options.trustDevice,
      verifySsl: context.options.verifySsl
    });
    const instance = getSDKInstance(client, context.domain.className);
    const result = context.domain.className === 'SystemInfo' && context.definition.method === 'getHostName'
      ? {
          result: 'succ',
          req: 'appcgi.sysinfo.getHostName',
          data: { hostName: client.hostName, trimVersion: client.trimVersion }
        }
      : await instance[context.definition.method](...args);
    stdout(formatOutput(result, context.globalOptions.raw));
    return 0;
  } catch (error) {
    stderr(`Error: ${errorMessage(error)}`);
    return error.exitCode || 1;
  } finally {
    if (client) client.close();
  }
}

module.exports = { errorMessage, runCommand };
