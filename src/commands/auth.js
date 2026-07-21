const settings = require('../utils/settings');
const { createClient } = require('../utils/client');
const { errorMessage } = require('../utils/errors');
const { registerAuthenticationOptions } = require('./options');

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
  program.command('logout').description('Logout and clear saved credentials').action(() => {
    const credentials = store.getCredentials();
    if (credentials && (credentials.endpoint || credentials.username)) {
      store.clearCredentials();
      stdout('Logged out successfully. Credentials cleared.');
    } else {
      stdout('No saved credentials found.');
    }
    process.exitCode = 0;
  });
}

module.exports = { registerLoginCommand, registerLogoutCommand };
