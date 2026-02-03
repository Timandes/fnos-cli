/**
 * Plugin SDK for fnos-cli
 * Provides utilities and helpers for plugin development
 *
 * @module PluginSDK
 */

const winston = require('winston');
const SchemaValidator = require('../plugins/schema-validator');

/**
 * Custom Error class for plugin errors
 */
class PluginError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'PluginError';
    this.code = code || 'PLUGIN_ERROR';
  }
}

/**
 * Validate configuration against a JSON Schema
 * @param {Object} config - Configuration to validate
 * @param {Object} schema - JSON Schema
 * @returns {Object} Validation result { valid, errors }
 */
function validateConfig(config, schema) {
  const validator = SchemaValidator.createValidator(schema);
  return SchemaValidator.validate(config, validator);
}

/**
 * Create a schema validator function
 * @param {Object} schema - JSON Schema
 * @returns {Function} Validator function that returns { valid, errors }
 */
function createSchemaValidator(schema) {
  const validate = SchemaValidator.createValidator(schema);
  return (data) => SchemaValidator.validate(data, validate);
}

/**
 * Create a logger instance for plugins
 * @param {string} name - Plugin name
 * @returns {Object} Winston logger instance
 */
function createLogger(name) {
  return winston.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, label }) => {
            return `${level}: [${name}] ${message}`;
          })
        )
      })
    ]
  });
}

/**
 * Create a plugin error
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {PluginError} Plugin error instance
 */
function createPluginError(message, code) {
  return new PluginError(message, code);
}

/**
 * Format an error for display
 * @param {Error|null} error - Error to format
 * @returns {string} Formatted error message
 */
function formatError(error) {
  if (!error) {
    return 'Unknown error';
  }

  let message = error.message || 'Unknown error';

  if (error.code) {
    message = `${error.code}: ${message}`;
  }

  return message;
}

module.exports = {
  validateConfig,
  createSchemaValidator,
  createLogger,
  createPluginError,
  formatError,
  PluginError
};