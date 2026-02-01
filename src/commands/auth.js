/**
 * Authentication commands (login, logout)
 */

const { Command } = require('commander');
const settings = require('../utils/settings');
const { createClient } = require('../utils/client');
const { logger } = require('../utils/logger');

/**
 * Register login command
 * @param {Command} program - Commander program instance
 */
function registerLoginCommand(program) {
  program
    .command('login')
    .description('Login to fnOS system and save credentials')
    .requiredOption('-e, --endpoint <endpoint>', 'Server endpoint (e.g., nas-9.timandes.net:5666)')
    .requiredOption('-u, --username <username>', 'Username')
    .requiredOption('-p, --password <password>', 'Password')
    .action(async (options) => {
      try {
        const { endpoint, username, password } = options;

        logger.info('Logging in...');
        const client = await createClient({ endpoint, username, password, timeout: 60, saveCredentials: true });
        logger.info('Login successful! Credentials saved.');
        client.close();
        process.exit(0);
      } catch (error) {
        logger.error(`Login failed: ${error.message}`);
        process.exit(3);
      }
    });
}

/**
 * Register logout command
 * @param {Command} program - Commander program instance
 */
function registerLogoutCommand(program) {
  program
    .command('logout')
    .description('Logout and clear saved credentials')
    .action(() => {
      try {
        if (settings.exists()) {
          settings.clear();
          console.log('Logged out successfully. Credentials cleared.');
        } else {
          console.log('No saved credentials found.');
        }
        process.exit(0);
      } catch (error) {
        logger.error(`Logout failed: ${error.message}`);
        process.exit(1);
      }
    });
}

module.exports = { registerLoginCommand, registerLogoutCommand };