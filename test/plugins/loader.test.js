/**
 * Tests for PluginLoader class
 */

const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const os = require('os');
const PluginLoader = require('../../src/plugins/loader');
const PluginRegistry = require('../../src/plugins/registry');
const PluginConfig = require('../../src/plugins/config');

describe('PluginLoader', () => {
  let tempDir;
  let loader;
  let registry;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-test-'));
    registry = new PluginRegistry();
    loader = new PluginLoader();
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('readManifest', () => {
    it('reads valid plugin manifest', async () => {
      const pluginDir = path.join(tempDir, 'test-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });

      const packageJson = {
        name: 'test-plugin',
        version: '1.0.0',
        fnos: {
          plugin: {
            name: 'test-plugin',
            version: '1.0.0',
            entry: 'index.js'
          }
        }
      };

      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const manifest = await loader.readManifest(pluginDir);

      expect(manifest).to.deep.equal(packageJson.fnos.plugin);
    });

    it('returns null if package.json does not exist', async () => {
      const pluginDir = path.join(tempDir, 'test-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });

      const manifest = await loader.readManifest(pluginDir);

      expect(manifest).to.be.null;
    });

    it('returns null if fnos.plugin field does not exist', async () => {
      const pluginDir = path.join(tempDir, 'test-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });

      const packageJson = {
        name: 'test-plugin',
        version: '1.0.0'
      };

      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const manifest = await loader.readManifest(pluginDir);

      expect(manifest).to.be.null;
    });
  });

  describe('validateManifest', () => {
    it('returns true for valid manifest', () => {
      const validManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        entry: 'index.js'
      };

      const isValid = loader.validateManifest(validManifest);

      expect(isValid).to.be.true;
    });

    it('returns false for manifest without name', () => {
      const invalidManifest = {
        version: '1.0.0',
        entry: 'index.js'
      };

      const isValid = loader.validateManifest(invalidManifest);

      expect(isValid).to.be.false;
    });

    it('returns false for manifest without version', () => {
      const invalidManifest = {
        name: 'test-plugin',
        entry: 'index.js'
      };

      const isValid = loader.validateManifest(invalidManifest);

      expect(isValid).to.be.false;
    });

    it('returns false for manifest without entry', () => {
      const invalidManifest = {
        name: 'test-plugin',
        version: '1.0.0'
      };

      const isValid = loader.validateManifest(invalidManifest);

      expect(isValid).to.be.false;
    });
  });

  describe('initPlugin', () => {
    it('initializes plugin and returns commands', async () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        schema: {
          type: 'object',
          properties: {
            setting: { type: 'string' }
          }
        }
      };

      const deps = {
        logger: { info: () => {} },
        settings: {},
        auth: null,
        getSDKInstance: () => {}
      };

      const initStub = async (config, deps) => ({
        'command1': {
          description: 'Test command',
          action: async () => ({ result: 'ok' })
        }
      });

      const commands = await loader.initPlugin(
        { ...plugin, init: initStub },
        {},
        deps
      );

      expect(commands).to.haveOwnProperty('command1');
    });
  });

  describe('load', () => {
    it('loads a valid plugin', async () => {
      const pluginDir = path.join(tempDir, 'test-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });

      const packageJson = {
        name: 'test-plugin',
        version: '1.0.0',
        fnos: {
          plugin: {
            name: 'test-plugin',
            version: '1.0.0',
            entry: 'index.js'
          }
        }
      };

      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const indexJs = `
        module.exports = {
          name: 'test-plugin',
          version: '1.0.0',
          schema: { type: 'object' },
          async init(config, deps) {
            return {
              'test': {
                description: 'Test command',
                action: async () => ({ result: 'ok' })
              }
            };
          }
        };
      `;

      fs.writeFileSync(path.join(pluginDir, 'index.js'), indexJs);

      const deps = {
        logger: { info: () => {} },
        settings: {},
        auth: null,
        getSDKInstance: () => {}
      };

      const pluginInstance = await loader.load(pluginDir, {
        settings: {},
        deps
      });

      expect(pluginInstance).to.exist;
      expect(pluginInstance.name).to.equal('test-plugin');
      expect(pluginInstance.commands).to.haveOwnProperty('test');
    });

    it('returns null if plugin manifest is invalid', async () => {
      const pluginDir = path.join(tempDir, 'test-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });

      const packageJson = {
        name: 'test-plugin'
        // Missing fnos.plugin field
      };

      fs.writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const deps = {
        logger: { info: () => {} },
        settings: {},
        auth: null,
        getSDKInstance: () => {}
      };

      const pluginInstance = await loader.load(pluginDir, {
        settings: {},
        deps
      });

      expect(pluginInstance).to.be.null;
    });
  });

  describe('loadAll', () => {
    it('loads all plugins from specified paths', async () => {
      const plugin1Dir = path.join(tempDir, 'plugin1');
      const plugin2Dir = path.join(tempDir, 'plugin2');

      fs.mkdirSync(plugin1Dir, { recursive: true });
      fs.mkdirSync(plugin2Dir, { recursive: true });

      // Create plugin 1
      fs.writeFileSync(
        path.join(plugin1Dir, 'package.json'),
        JSON.stringify({
          name: 'plugin1',
          version: '1.0.0',
          fnos: {
            plugin: {
              name: 'plugin1',
              version: '1.0.0',
              entry: 'index.js'
            }
          }
        }, null, 2)
      );

      fs.writeFileSync(
        path.join(plugin1Dir, 'index.js'),
        `
          module.exports = {
            name: 'plugin1',
            version: '1.0.0',
            schema: { type: 'object' },
            async init(config, deps) {
              return { 'cmd1': { description: 'Command 1', action: async () => ({}) } };
            }
          };
        `
      );

      // Create plugin 2
      fs.writeFileSync(
        path.join(plugin2Dir, 'package.json'),
        JSON.stringify({
          name: 'plugin2',
          version: '1.0.0',
          fnos: {
            plugin: {
              name: 'plugin2',
              version: '1.0.0',
              entry: 'index.js'
            }
          }
        }, null, 2)
      );

      fs.writeFileSync(
        path.join(plugin2Dir, 'index.js'),
        `
          module.exports = {
            name: 'plugin2',
            version: '1.0.0',
            schema: { type: 'object' },
            async init(config, deps) {
              return { 'cmd2': { description: 'Command 2', action: async () => ({}) } };
            }
          };
        `
      );

      const deps = {
        logger: { info: () => {} },
        settings: {},
        auth: null,
        getSDKInstance: () => {}
      };

      const plugins = await loader.loadAll({
        pluginPaths: [plugin1Dir, plugin2Dir],
        settings: {},
        deps
      });

      expect(Object.keys(plugins)).to.have.lengthOf(2);
      expect(plugins).to.haveOwnProperty('plugin1');
      expect(plugins).to.haveOwnProperty('plugin2');
    });

    it('handles loading errors gracefully', async () => {
      const pluginDir = path.join(tempDir, 'invalid-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });

      // Invalid package.json (invalid JSON)
      fs.writeFileSync(path.join(pluginDir, 'package.json'), '{ invalid json }');

      const deps = {
        logger: { info: () => {}, error: () => {} },
        settings: {},
        auth: null,
        getSDKInstance: () => {}
      };

      const plugins = await loader.loadAll({
        pluginPaths: [pluginDir],
        settings: {},
        deps
      });

      // Should not throw, just skip invalid plugin
      expect(plugins).to.deep.equal({});
    });
  });
});