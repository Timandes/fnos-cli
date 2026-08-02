const assert = require('node:assert/strict');
const { Command } = require('commander');
const { describe, it } = require('mocha');
const { COMMAND_CATALOG } = require('../../src/commands/catalog');
const { getCompletion } = require('../../src/completion/metadata');

function loadOptions() {
  try {
    return require('../../src/commands/options');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('../../src/commands/options')) return {};
    throw error;
  }
}

const optionCompiler = loadOptions();
const missingCompiler = () => assert.fail('command option compiler must be implemented');
const buildMethodArguments = optionCompiler.buildMethodArguments || missingCompiler;
const registerAuthenticationOptions = optionCompiler.registerAuthenticationOptions || missingCompiler;
const registerBusinessOptions = optionCompiler.registerBusinessOptions || missingCompiler;
const registerServerOption = optionCompiler.registerServerOption || missingCompiler;
const CommandParameterError = optionCompiler.CommandParameterError || Error;

describe('command option compiler', () => {
  it('fills SDK defaults before appending timeout', () => {
    assert.deepEqual(buildMethodArguments(COMMAND_CATALOG.store.commands.listDisk, {}, 10000), [true, 10000]);
    assert.deepEqual(buildMethodArguments(COMMAND_CATALOG.network.commands.list, {}, 10000), [0, 10000]);
    assert.deepEqual(buildMethodArguments(COMMAND_CATALOG.store.commands.state, {}, 10000), [[], [], 10000]);
    assert.deepEqual(buildMethodArguments(COMMAND_CATALOG.resmon.commands.gen, {}, 10000), [10000, null]);
  });

  it('preserves omitted values before a later provided option', () => {
    const definition = COMMAND_CATALOG.share.commands.listLinks;
    assert.deepEqual(buildMethodArguments(definition, { pageSize: '25' }, 10000), [
      false, '', 1, 25, 'createdTime', 'DESC', 10000
    ]);
  });

  it('parses booleans, CSV, JSON, and JSON record arrays', () => {
    assert.deepEqual(buildMethodArguments(COMMAND_CATALOG.file.commands.rm, {
      files: 'a,b',
      moveToTrashbin: 'false',
      details: '{"name":"a","count":1}'
    }, 10000), [['a', 'b'], false, { name: 'a', count: 1 }, 10000]);
    assert.deepEqual(buildMethodArguments(COMMAND_CATALOG.security.commands.getProcessTraffic, {
      processes: '[{"pid":1001,"process":"demo"}]'
    }, 10000), [[{ pid: 1001, process: 'demo' }], 10000]);
  });

  it('rejects missing, malformed, and out-of-range values with exit code 4', () => {
    const invalidCases = [
      () => buildMethodArguments(COMMAND_CATALOG.backup.commands.listTasks, {}, 10000),
      () => buildMethodArguments(COMMAND_CATALOG.network.commands.list, { type: '2' }, 10000),
      () => buildMethodArguments(COMMAND_CATALOG.file.commands.rm, { files: '' }, 10000),
      () => buildMethodArguments(COMMAND_CATALOG.security.commands.getProcessTraffic, { processes: '[1]' }, 10000),
      () => buildMethodArguments(COMMAND_CATALOG.store.commands.listDisk, { hotSpare: 'yes' }, 10000),
      () => buildMethodArguments(COMMAND_CATALOG.network.commands.list, { type: '0x0' }, 10000)
    ];
    for (const invoke of invalidCases) {
      assert.throws(invoke, (error) => error instanceof CommandParameterError && error.exitCode === 4);
    }
  });

  it('registers authentication and legacy business options with Commander', () => {
    const command = new Command('list-disk').exitOverride();
    registerAuthenticationOptions(command);
    registerBusinessOptions(command, COMMAND_CATALOG.store.commands.listDisk.options);
    command.parse(['node', 'list-disk', '--noHotSpare', 'false'], { from: 'node' });
    assert.equal(command.opts().noHotSpare, 'false');
    assert.deepEqual(buildMethodArguments(COMMAND_CATALOG.store.commands.listDisk, command.opts(), 10000), [false, 10000]);
    assert.ok(command.options.some((option) => option.long === '--twofa-code'));
    assert.ok(command.options.some((option) => option.long === '--verify-ssl'));
  });

  it('registers the shared server option', () => {
    const command = new Command('network-list').exitOverride();
    registerServerOption(command);

    command.parse(
      ['node', 'network-list', '--server', 'office-nas'],
      { from: 'node' }
    );

    assert.equal(command.opts().server, 'office-nas');
    assert.deepEqual(command.options.map(({ long }) => long), ['--server']);
  });

  it('annotates boolean, enum, and server options for completion', () => {
    const command = new Command('sample');
    registerBusinessOptions(command, [
      { name: 'all', flag: '--all <boolean>', type: 'boolean', description: 'All rows' },
      {
        name: 'direction',
        flag: '--direction <integer>',
        type: 'integer',
        allowedValues: [0, 1],
        description: 'Direction'
      },
      { name: 'name', flag: '--name <name>', type: 'string', description: 'Name' }
    ]);
    registerServerOption(command);

    const byLong = Object.fromEntries(command.options.map((option) => [option.long, option]));
    assert.deepEqual(getCompletion(byLong['--all']), {
      kind: 'values',
      values: ['true', 'false']
    });
    assert.deepEqual(getCompletion(byLong['--direction']), {
      kind: 'values',
      values: ['0', '1']
    });
    assert.equal(getCompletion(byLong['--name']), null);
    assert.deepEqual(getCompletion(byLong['--server']), { kind: 'server' });
  });

  it('includes the shared server option with authentication options', () => {
    const command = new Command('network-list').exitOverride();
    registerAuthenticationOptions(command);

    assert.ok(command.options.some(({ long }) => long === '--server'));
  });

  it('rejects server names outside the portable format', () => {
    const command = new Command('network-list').exitOverride();
    registerServerOption(command);

    assert.throws(
      () => command.parse(
        ['node', 'network-list', '--server', 'bad name'],
        { from: 'node' }
      ),
      (error) => error instanceof CommandParameterError && error.exitCode === 4
    );
  });
});
