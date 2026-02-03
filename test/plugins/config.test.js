/**
 * Tests for PluginConfig class
 */

const { expect } = require('chai');
const PluginConfig = require('../../src/plugins/config');

describe('PluginConfig', () => {
  describe('getConfig', () => {
    it('returns plugin configuration from settings', () => {
      const settings = {
        plugins: {
          'test-plugin': {
            setting1: 'value1',
            setting2: 123
          }
        }
      };

      const config = PluginConfig.getConfig('test-plugin', settings);

      expect(config).to.deep.equal({
        setting1: 'value1',
        setting2: 123
      });
    });

    it('returns empty object if plugin configuration does not exist', () => {
      const settings = {
        plugins: {}
      };

      const config = PluginConfig.getConfig('non-existent-plugin', settings);

      expect(config).to.deep.equal({});
    });

    it('returns empty object if plugins section does not exist', () => {
      const settings = {};

      const config = PluginConfig.getConfig('test-plugin', settings);

      expect(config).to.deep.equal({});
    });
  });

  describe('validate', () => {
    it('returns valid=true for valid configuration', () => {
      const config = { setting: 'value' };
      const schema = {
        type: 'object',
        properties: {
          setting: { type: 'string' }
        },
        required: ['setting']
      };

      const result = PluginConfig.validate(config, schema);

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.undefined;
    });

    it('returns valid=false with errors for invalid configuration', () => {
      const config = { setting: 123 }; // Invalid: should be string
      const schema = {
        type: 'object',
        properties: {
          setting: { type: 'string' }
        },
        required: ['setting']
      };

      const result = PluginConfig.validate(config, schema);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array');
      expect(result.errors.length).to.be.greaterThan(0);
    });

    it('returns valid=false for missing required fields', () => {
      const config = {}; // Missing required field
      const schema = {
        type: 'object',
        properties: {
          setting: { type: 'string' }
        },
        required: ['setting']
      };

      const result = PluginConfig.validate(config, schema);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array');
    });
  });

  describe('createReadonlyAuth', () => {
    it('creates a readonly credentials object', () => {
      const credentials = {
        endpoint: 'test.com',
        username: 'user',
        password: 'pass',
        token: 'token123',
        longToken: 'longToken456',
        secret: 'secret789'
      };

      const readonly = PluginConfig.createReadonlyAuth(credentials);

      expect(readonly).to.deep.equal(credentials);
    });

    it('prevents modification of readonly credentials', () => {
      const credentials = {
        endpoint: 'test.com',
        username: 'user',
        password: 'pass',
        token: 'token123',
        longToken: 'longToken456',
        secret: 'secret789'
      };

      const readonly = PluginConfig.createReadonlyAuth(credentials);

      expect(() => {
        readonly.username = 'newuser';
      }).to.throw();
    });

    it('prevents deletion of readonly credentials properties', () => {
      const credentials = {
        endpoint: 'test.com',
        username: 'user',
        password: 'pass',
        token: 'token123',
        longToken: 'longToken456',
        secret: 'secret789'
      };

      const readonly = PluginConfig.createReadonlyAuth(credentials);

      expect(() => {
        delete readonly.username;
      }).to.throw();
    });

    it('returns null if credentials is null', () => {
      const readonly = PluginConfig.createReadonlyAuth(null);

      expect(readonly).to.be.null;
    });
  });
});