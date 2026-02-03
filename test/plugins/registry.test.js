/**
 * Tests for PluginRegistry class
 */

const { expect } = require('chai');
const PluginRegistry = require('../../src/plugins/registry');

describe('PluginRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('register', () => {
    it('registers a plugin successfully', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        commands: {
          'command1': { description: 'Test command' }
        }
      };

      const registered = registry.register('test-plugin', plugin);

      expect(registered).to.be.true;
    });

    it('prevents duplicate plugin registration', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        commands: {}
      };

      registry.register('test-plugin', plugin);
      const registeredAgain = registry.register('test-plugin', plugin);

      expect(registeredAgain).to.be.false;
    });

    it('stores plugin correctly', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        commands: {
          'command1': { description: 'Test command' }
        }
      };

      registry.register('test-plugin', plugin);
      const stored = registry.get('test-plugin');

      expect(stored).to.deep.equal(plugin);
    });
  });

  describe('checkConflict', () => {
    it('returns null when no conflict exists', () => {
      const conflict = registry.checkConflict('non-existent-command');

      expect(conflict).to.be.null;
    });

    it('detects conflict with existing command', () => {
      const plugin = {
        name: 'test-plugin',
        commands: {
          'command1': { description: 'Test command' }
        }
      };

      registry.register('test-plugin', plugin);
      const conflict = registry.checkConflict('command1');

      expect(conflict).to.not.be.null;
      expect(conflict.command).to.equal('command1');
      expect(conflict.plugin).to.equal('test-plugin');
    });

    it('checks against all registered plugins', () => {
      const plugin1 = {
        name: 'plugin1',
        commands: {
          'command1': { description: 'Command 1' }
        }
      };

      const plugin2 = {
        name: 'plugin2',
        commands: {
          'command2': { description: 'Command 2' }
        }
      };

      registry.register('plugin1', plugin1);
      registry.register('plugin2', plugin2);

      const conflict1 = registry.checkConflict('command1');
      const conflict2 = registry.checkConflict('command2');

      expect(conflict1).to.not.be.null;
      expect(conflict2).to.not.be.null;
    });
  });

  describe('getAll', () => {
    it('returns empty object when no plugins registered', () => {
      const all = registry.getAll();

      expect(all).to.deep.equal({});
    });

    it('returns all registered plugins', () => {
      const plugin1 = { name: 'plugin1', commands: {} };
      const plugin2 = { name: 'plugin2', commands: {} };

      registry.register('plugin1', plugin1);
      registry.register('plugin2', plugin2);

      const all = registry.getAll();

      expect(Object.keys(all)).to.have.lengthOf(2);
      expect(all.plugin1).to.deep.equal(plugin1);
      expect(all.plugin2).to.deep.equal(plugin2);
    });
  });

  describe('get', () => {
    it('returns null when plugin not found', () => {
      const plugin = registry.get('non-existent');

      expect(plugin).to.be.null;
    });

    it('returns the requested plugin', () => {
      const plugin = { name: 'test-plugin', commands: {} };

      registry.register('test-plugin', plugin);
      const retrieved = registry.get('test-plugin');

      expect(retrieved).to.deep.equal(plugin);
    });
  });

  describe('getAllCommands', () => {
    it('returns empty array when no commands registered', () => {
      const commands = registry.getAllCommands();

      expect(commands).to.be.an('array');
      expect(commands).to.have.lengthOf(0);
    });

    it('returns all commands from all plugins', () => {
      const plugin1 = {
        name: 'plugin1',
        commands: {
          'command1': { description: 'Command 1' },
          'command2': { description: 'Command 2' }
        }
      };

      const plugin2 = {
        name: 'plugin2',
        commands: {
          'command3': { description: 'Command 3' }
        }
      };

      registry.register('plugin1', plugin1);
      registry.register('plugin2', plugin2);

      const commands = registry.getAllCommands();

      expect(commands).to.have.lengthOf(3);
    });
  });

  describe('clear', () => {
    it('removes all registered plugins', () => {
      const plugin = { name: 'test-plugin', commands: {} };

      registry.register('test-plugin', plugin);
      expect(registry.getAll()).to.haveOwnProperty('test-plugin');

      registry.clear();
      expect(registry.getAll()).to.deep.equal({});
    });
  });
});