const settings = require('../utils/settings');
const { createClient } = require('../utils/client');
const { resolveServerName } = require('../utils/auth-helper');
const { errorMessage } = require('../utils/errors');
const { selectServer } = require('../utils/server-selector');
const {
  registerAuthenticationOptions,
  registerServerOption
} = require('./options');

function registerLoginCommand(program, dependencies = {}) {
  const create = dependencies.createClient || createClient;
  const stderr = dependencies.stderr || console.error;
  const command = program.command('login').description('Login to fnOS and save credentials');
  registerAuthenticationOptions(command, true);
  command.action(async (options) => {
    let client;
    try {
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
      process.exitCode = 0;
    } catch (error) {
      stderr(`Error: ${errorMessage(error)}`);
      process.exitCode = error.exitCode || 1;
    } finally {
      if (client) client.close();
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
      if (servers.length === 0) {
        stdout('No saved credentials found.');
        process.exitCode = 0;
        return;
      }
      const serverName = await resolveName(options.server, {
        settingsStore: store,
        select: dependencies.selectServer || selectServer,
        selectorDependencies: dependencies.selectorDependencies
      });
      store.clearCredentials(serverName);
      stdout(`Logged out from "${serverName}" successfully. Credentials cleared.`);
      process.exitCode = 0;
    } catch (error) {
      stderr(`Error: ${errorMessage(error)}`);
      process.exitCode = error.exitCode || 1;
    }
  });
}

module.exports = { registerLoginCommand, registerLogoutCommand };
