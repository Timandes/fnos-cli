const settings = require('../utils/settings');
const { createClient } = require('../utils/client');
const { resolveServerName } = require('../utils/auth-helper');
const { errorMessage } = require('../utils/errors');
const { selectServer } = require('../utils/server-selector');
const { loginOAuth, validateOAuthEndpoint } = require('../utils/oauth');
const { CommandParameterError } = require('./options');
const { Option } = require('commander');
const { fixedValues, withCompletion } = require('../completion/metadata');
const { formatOutput } = require('../utils/formatter');
const {
  registerAuthenticationOptions,
  registerServerOption
} = require('./options');

function registerLoginCommand(program, dependencies = {}) {
  const create = dependencies.createClient || createClient;
  const stderr = dependencies.stderr || console.error;
  const stdout = dependencies.stdout || console.log;
  const command = program.command('login').description('Login to fnOS and save credentials');
  registerAuthenticationOptions(command);
  command.addOption(withCompletion(
    new Option('--auth <type>', 'Authentication type (default: password)').default('password'),
    fixedValues(['password', 'oauth'])
  ));
  command.action(async (options) => {
    let client;
    let release;
    try {
      if (!['password', 'oauth'].includes(options.auth)) throw new CommandParameterError('--auth must be password or oauth.');
      if (!options.endpoint) throw new CommandParameterError('--endpoint is required.');
      if (options.auth === 'oauth') {
        if ([options.username, options.password, options.twofaCode, options.trustDevice].some(value => value !== undefined)) {
          throw new CommandParameterError('OAuth login cannot use username, password, two-factor or trust-device options.');
        }
        validateOAuthEndpoint(options.endpoint, options.verifySsl === true);
        const result = await (dependencies.loginOAuth || loginOAuth)(options, dependencies);
        stdout(formatOutput(result, Boolean(program.opts().raw)));
        process.exitCode = 0;
        return;
      }
      if (!options.username || !options.password) throw new CommandParameterError('Password login requires -e/--endpoint, -u/--username and -p/--password.');
      const store = dependencies.settings || settings;
      release = await store.acquireServerLock(options.server || 'default');
      client = await create({
        endpoint: options.endpoint,
        username: options.username,
        password: options.password,
        timeout: 60,
        saveCredentials: true,
        serverName: options.server || 'default',
        twofaCode: options.twofaCode,
        trustDevice: options.trustDevice,
        verifySsl: options.verifySsl
      });
      stdout(formatOutput({
        result: 'succ',
        server: options.server || 'default',
        authType: 'password',
        // URL userinfo may hold proxy credentials; omit it from the summary.
        endpoint: options.endpoint.replace(/^((?:wss?:\/\/)?)[^/?#]*@/i, '$1'),
        username: options.username,
        credentialsSaved: true
      }, Boolean(program.opts().raw)));
      process.exitCode = 0;
    } catch (error) {
      stderr(`Error: ${errorMessage(error)}`);
      process.exitCode = error.exitCode || 1;
    } finally {
      try { if (client) client.close(); }
      finally { if (release) release(); }
    }
  });
}

function registerLogoutCommand(program, dependencies = {}) {
  const store = dependencies.settings || settings;
  const stdout = dependencies.stdout || console.log;
  const stderr = dependencies.stderr || console.error;
  const resolveName = dependencies.resolveServerName || resolveServerName;
  const command = program.command('logout').description('Logout and clear saved credentials');
  registerServerOption(command);
  command.action(async (options) => {
    try {
      const servers = store.listServers();
      if (servers.length === 0 && options.server === undefined) {
        stdout('No saved credentials found.');
        process.exitCode = 0;
        return;
      }
      const serverName = await resolveName(options.server, {
        settingsStore: store,
        select: dependencies.selectServer || selectServer,
        selectorDependencies: dependencies.selectorDependencies
      });
      if (store.withServerLock) await store.withServerLock(serverName, async () => store.clearCredentials(serverName));
      else store.clearCredentials(serverName);
      stdout(`Logged out from "${serverName}" successfully. Credentials cleared.`);
      process.exitCode = 0;
    } catch (error) {
      stderr(`Error: ${errorMessage(error)}`);
      process.exitCode = error.exitCode || 1;
    }
  });
}

/** Show local metadata without disclosing credentials or contacting the server. */
function registerAuthStatusCommand(program, dependencies = {}) {
  const store = dependencies.settings || settings;
  const stdout = dependencies.stdout || console.log;
  const stderr = dependencies.stderr || console.error;
  const command = program.command('auth.status').description('Show local authentication metadata (does not verify server access)');
  registerServerOption(command);
  command.action(async options => {
    try {
      const serverName = await (dependencies.resolveServerName || resolveServerName)(options.server, {
        settingsStore: store, select: dependencies.selectServer || selectServer,
        selectorDependencies: dependencies.selectorDependencies
      });
      const credentials = store.getCredentials(serverName);
      const authType = credentials.authType || 'password';
      const status = { server: serverName, authType, endpoint: credentials.endpoint,
        verifySsl: authType === 'oauth' ? credentials.oauth.verifySsl === true : credentials.verifySsl === true,
        ...(credentials.username ? { username: credentials.username } : {}) };
      if (authType === 'oauth') {
        status.expiresAt = credentials.oauth.session.expiresAt;
        status.expired = status.expiresAt <= Math.floor(Date.now() / 1000);
      }
      stdout(formatOutput(status, Boolean(program.opts().raw)));
      process.exitCode = 0;
    } catch (error) {
      stderr(`Error: ${errorMessage(error)}`);
      process.exitCode = error.exitCode || 1;
    }
  });
}

module.exports = { registerLoginCommand, registerLogoutCommand, registerAuthStatusCommand };
