/**
 * Tests for CommandRegistrar class
 */

const { expect } = require('chai');
const { Command } = require('commander');
const CommandRegistrar = require('../../src/plugins/registrar');

describe('CommandRegistrar', () => {
  let program;
  let registrar;

  beforeEach(() => {
    program = new Command();
    registrar = new CommandRegistrar();
  });

  describe('mapParams', () => {
    it('maps simple parameters to command options', () => {
      const cmd = program.command('test');

      const params = [
        { name: 'param1', required: true, description: 'Parameter 1' },
        { name: 'param2', required: false, description: 'Parameter 2' }
      ];

      registrar.mapParams(cmd, params);

      // Verify options are added
      const options = cmd.options;
      expect(options).to.have.lengthOf(2);
      expect(options[0].long).to.equal('--param1');
      expect(options[1].long).to.equal('--param2');
    });

    it('uses custom option format when provided', () => {
      const cmd = program.command('test');

      const params = [
        { name: 'param1', option: '--custom-name <value>', description: 'Custom option' }
      ];

      registrar.mapParams(cmd, params);

      const options = cmd.options;
      expect(options).to.have.lengthOf(1);
      expect(options[0].long).to.equal('--custom-name');
    });

    it('marks required parameters as required', () => {
      const cmd = program.command('test');

      const params = [
        { name: 'param1', required: true, description: 'Required parameter' }
      ];

      registrar.mapParams(cmd, params);

      const options = cmd.options;
      expect(options[0].required).to.be.true;
    });
  });

  describe('wrapAction', () => {
    it('wraps action function with plugin deps', async () => {
      const action = async (options) => {
        return { result: 'success', input: options.param1 };
      };

      const pluginDeps = {
        logger: { info: () => {} },
        settings: {},
        auth: null,
        getSDKInstance: () => {}
      };

      const wrappedAction = registrar.wrapAction(action, pluginDeps);

      const result = await wrappedAction({ param1: 'test' });

      expect(result).to.deep.equal({ result: 'success', input: 'test' });
    });

    it('handles action errors gracefully', async () => {
      const action = async (options) => {
        throw new Error('Test error');
      };

      const pluginDeps = {
        logger: { info: () => {}, error: () => {} },
        settings: {},
        auth: null,
        getSDKInstance: () => {}
      };

      const wrappedAction = registrar.wrapAction(action, pluginDeps);

      try {
        await wrappedAction({ param1: 'test' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.equal('Test error');
      }
    });
  });

  describe('registerCommand', () => {
    it('registers a plugin command to commander program', () => {
      const commandConfig = {
        description: 'Test command',
        action: async (options) => ({ result: 'ok' }),
        params: [
          { name: 'input', required: true, description: 'Input parameter' }
        ]
      };

      const pluginDeps = {
        logger: { info: () => {}, error: () => {} },
        settings: {},
        auth: null,
        getSDKInstance: () => {}
      };

      registrar.registerCommand(program, 'test-plugin', 'test', commandConfig, pluginDeps);

      // Verify plugin subcommand is registered
      const pluginCmd = program.commands.find(cmd => cmd.name() === 'test-plugin');
      expect(pluginCmd).to.exist;

      // Verify command is registered under plugin subcommand
      const testCmd = pluginCmd.commands.find(cmd => cmd.name() === 'test');
      expect(testCmd).to.exist;
      expect(testCmd.description()).to.equal('Test command');
    });

    it('adds global options support', () => {
      const commandConfig = {
        description: 'Test command',
        action: async (options) => ({ result: 'ok', debug: options.debug }),
        params: []
      };

      const pluginDeps = {
        logger: { info: () => {} },
        settings: {},
        auth: null,
        getSDKInstance: () => {}
      };

      const programWithGlobal = program.option('--debug', 'Debug mode');
      registrar.registerCommand(programWithGlobal, 'test-plugin', 'test', commandConfig, pluginDeps);

      // Verify command is registered
      const pluginCmd = programWithGlobal.commands.find(cmd => cmd.name() === 'test-plugin');
      expect(pluginCmd).to.exist;

      const testCmd = pluginCmd.commands.find(cmd => cmd.name() === 'test');
      expect(testCmd).to.exist;
    });
  });

  describe('registerAll', () => {
    it('registers all plugin commands', () => {
      const registry = {
        getAll: () => ({
          'plugin1': {
            name: 'plugin1',
            version: '1.0.0',
            commands: {
              'cmd1': {
                description: 'Command 1',
                action: async () => ({ result: 'cmd1' }),
                params: []
              }
            }
          },
          'plugin2': {
            name: 'plugin2',
            version: '1.0.0',
            commands: {
              'cmd2': {
                description: 'Command 2',
                action: async () => ({ result: 'cmd2' }),
                params: []
              }
            }
          }
        })
      };

      const pluginDeps = {
        logger: { info: () => {}, error: () => {} },
        settings: {},
        auth: null,
        getSDKInstance: () => {}
      };

      registrar.registerAll(program, registry, pluginDeps);

      // Verify both plugins are registered
      const commands = program.commands;
      const plugin1Cmd = commands.find(cmd => cmd.name() === 'plugin1');
      const plugin2Cmd = commands.find(cmd => cmd.name() === 'plugin2');

      expect(plugin1Cmd).to.exist;
      expect(plugin2Cmd).to.exist;
    });
  });
});