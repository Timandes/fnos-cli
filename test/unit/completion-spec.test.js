const assert = require('node:assert/strict');
const { Argument, Command } = require('commander');
const { describe, it } = require('mocha');
const { createProgram } = require('../../src');
const { fixedValues, withCompletion } = require('../../src/completion/metadata');
const { buildCompletionSpec } = require('../../src/completion/spec');

function findCommand(node, name) {
  return node.commands.find((command) => command.name === name);
}

describe('completion specification', () => {
  it('includes visible command options, global options, and value metadata', () => {
    const spec = buildCompletionSpec(createProgram());
    const docker = findCommand(findCommand(spec, 'docker'), 'listContainers');
    const byLong = Object.fromEntries(docker.options.map((option) => [option.long, option]));
    assert.ok(byLong['--raw']);
    assert.ok(byLong['--help']);
    assert.deepEqual(byLong['--all'].completion, {
      kind: 'values', values: ['true', 'false']
    });
    assert.deepEqual(byLong['--server'].completion, { kind: 'server' });
  });

  it('omits hidden legacy spellings', () => {
    const spec = buildCompletionSpec(createProgram());
    const network = findCommand(findCommand(spec, 'network'), 'getInfo');
    assert.equal(network.options.some((option) => option.long === '--ifName'), false);
    assert.equal(network.options.some((option) => option.long === '--if-name'), true);
  });

  it('completes grouped commands and inherits authentication from their parent', () => {
    const spec = buildCompletionSpec(createProgram());
    const user = findCommand(spec, 'user');
    assert.ok(user);
    const preference = findCommand(user, 'getPreference');
    assert.deepEqual(preference.path, ['user', 'getPreference']);
    assert.ok(preference.options.some((option) => option.long === '--name'));
    assert.ok(preference.options.some((option) => option.long === '--raw'));
    assert.deepEqual(preference.options.find((option) => option.long === '--server').completion, { kind: 'server' });
    assert.equal(findCommand(spec, 'user.getPreference'), undefined);
  });

  it('recursively models child commands and annotated arguments', () => {
    const program = new Command('fnos').option('--global', 'Global option');
    const completion = program.command('completion').description('Generate completion');
    completion.addArgument(withCompletion(
      new Argument('[shell]', 'Shell name'),
      fixedValues(['zsh'])
    ));
    const install = completion.command('install').description('Install completion');
    install.addArgument(withCompletion(
      new Argument('<shell>', 'Shell name'),
      fixedValues(['zsh'])
    ));

    const spec = buildCompletionSpec(program);
    const completionSpec = findCommand(spec, 'completion');
    const installSpec = findCommand(completionSpec, 'install');
    assert.deepEqual(completionSpec.path, ['completion']);
    assert.deepEqual(installSpec.path, ['completion', 'install']);
    assert.deepEqual(completionSpec.arguments[0].completion.values, ['zsh']);
    assert.deepEqual(installSpec.arguments[0].completion.values, ['zsh']);
    assert.ok(installSpec.options.some((option) => option.long === '--global'));
  });

  it('models the public completion grammar but not the internal runtime', () => {
    const spec = buildCompletionSpec(createProgram());
    const completion = findCommand(spec, 'completion');

    assert.ok(completion);
    assert.deepEqual(completion.arguments[0].completion.values, ['zsh']);
    assert.equal(findCommand(completion, 'install').arguments[0].completion.values[0], 'zsh');
    assert.equal(findCommand(spec, '__complete'), undefined);
  });
});
