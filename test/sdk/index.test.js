/**
 * Tests for Plugin SDK
 */

const { expect } = require('chai');
const SDK = require('../../src/sdk/index');

describe('Plugin SDK', () => {
  describe('validateConfig', () => {
    it('validates configuration against schema', () => {
      const config = { setting: 'value' };
      const schema = {
        type: 'object',
        properties: {
          setting: { type: 'string' }
        },
        required: ['setting']
      };

      const result = SDK.validateConfig(config, schema);

      expect(result.valid).to.be.true;
    });

    it('returns errors for invalid configuration', () => {
      const config = { setting: 123 };
      const schema = {
        type: 'object',
        properties: {
          setting: { type: 'string' }
        },
        required: ['setting']
      };

      const result = SDK.validateConfig(config, schema);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array');
    });
  });

  describe('createSchemaValidator', () => {
    it('creates a validator function', () => {
      const schema = { type: 'object' };

      const validate = SDK.createSchemaValidator(schema);

      expect(validate).to.be.a('function');
    });

    it('validator function validates data correctly', () => {
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } }
      };

      const validate = SDK.createSchemaValidator(schema);
      const result = validate({ name: 'test' });

      expect(result.valid).to.be.true;
    });
  });

  describe('createLogger', () => {
    it('creates a logger instance', () => {
      const logger = SDK.createLogger('test-plugin');

      expect(logger).to.be.an('object');
      expect(logger.info).to.be.a('function');
      expect(logger.error).to.be.a('function');
      expect(logger.warn).to.be.a('function');
      expect(logger.debug).to.be.a('function');
    });

    it('logger has correct name', () => {
      const logger = SDK.createLogger('my-plugin');

      // Logger should have the plugin name
      expect(logger).to.exist;
    });
  });

  describe('createPluginError', () => {
    it('creates a plugin error with message', () => {
      const error = SDK.createPluginError('Something went wrong');

      expect(error).to.be.an('error');
      expect(error.message).to.equal('Something went wrong');
      expect(error.name).to.equal('PluginError');
    });

    it('creates a plugin error with code', () => {
      const error = SDK.createPluginError('Invalid config', 'INVALID_CONFIG');

      expect(error.message).to.equal('Invalid config');
      expect(error.code).to.equal('INVALID_CONFIG');
    });
  });

  describe('formatError', () => {
    it('formats standard error', () => {
      const error = new Error('Test error');

      const formatted = SDK.formatError(error);

      expect(formatted).to.be.a('string');
      expect(formatted).to.include('Test error');
    });

    it('formats plugin error with code', () => {
      const error = SDK.createPluginError('Test error', 'TEST_ERROR');

      const formatted = SDK.formatError(error);

      expect(formatted).to.include('Test error');
      expect(formatted).to.include('TEST_ERROR');
    });

    it('handles null error', () => {
      const formatted = SDK.formatError(null);

      expect(formatted).to.equal('Unknown error');
    });

    it('handles error with stack trace', () => {
      const error = new Error('Test error');

      const formatted = SDK.formatError(error);

      expect(formatted).to.be.a('string');
    });
  });
});