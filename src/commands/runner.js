const { buildMethodArguments } = require('./options');
const clientUtils = require('../utils/client');
const { formatOutput } = require('../utils/formatter');
const { resolveCredentials } = require('../utils/auth-helper');
const { errorMessage } = require('../utils/errors');
const { createSession } = require('../utils/session');

function outputOptions(raw, dependencies) {
  const env = dependencies.env || process.env;
  const stdoutIsTTY = dependencies.stdoutIsTTY === undefined
    ? Boolean(process.stdout.isTTY)
    : Boolean(dependencies.stdoutIsTTY);
  const stdoutColumns = dependencies.stdoutColumns === undefined
    ? process.stdout.columns
    : dependencies.stdoutColumns;
  const color = !raw && stdoutIsTTY &&
    !Object.prototype.hasOwnProperty.call(env, 'NO_COLOR') &&
    env.TERM !== 'dumb';
  return {
    color,
    columns: stdoutIsTTY && Number.isInteger(stdoutColumns) && stdoutColumns > 0
      ? stdoutColumns
      : undefined
  };
}

async function runCommand(context, dependencies = {}) {
  const create = dependencies.createSession || (options => createSession(options, dependencies));
  const getSDKInstance = dependencies.getSDKInstance || clientUtils.getSDKInstance;
  const resolve = dependencies.resolveCredentials || resolveCredentials;
  const stdout = dependencies.stdout || console.log;
  const stderr = dependencies.stderr || console.error;
  let session;

  try {
    const args = buildMethodArguments(context.definition, context.options, 10000);
    const credentials = await resolve(context.options);
    session = await create({
      credentials,
      timeout: 60,
      twofaCode: context.options.twofaCode,
      trustDevice: context.options.trustDevice,
      verifySsl: context.options.verifySsl
    });
    const instance = getSDKInstance(session.client, context.domain.className);
    const result = await instance[context.definition.method](...args);
    const raw = Boolean(context.globalOptions.raw);
    stdout(formatOutput(result, raw, outputOptions(raw, dependencies)));
    const responses = Array.isArray(result) ? result : [result];
    const failed = responses.find(value => value &&
      (value.result === 'fail' || (typeof value.errno === 'number' && value.errno !== 0)));
    if (failed) {
      stderr(`Error: ${errorMessage(new Error(failed.errmsg || failed.msg || 'fnOS business request failed.'))}`);
      return 1;
    }
    return 0;
  } catch (error) {
    stderr(`Error: ${errorMessage(error)}`);
    return error.exitCode || 1;
  } finally {
    if (session) session.dispose();
  }
}

module.exports = { errorMessage, runCommand };
