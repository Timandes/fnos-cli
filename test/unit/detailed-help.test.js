const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, afterEach } = require('mocha');
const { createProgram } = require('../../src');
const { withLanguage } = require('../../src/i18n');
const { COMMAND_CATALOG } = require('../../src/commands/catalog');
const { buildMethodArguments } = require('../../src/commands/options');
const { buildCompletionSpec } = require('../../src/completion/spec');
const { runCli } = require('../helpers/run-cli');
const homes = [];
afterEach(() => { process.exitCode = undefined; homes.splice(0).forEach(home => fs.rmSync(home, { recursive: true, force: true })); });
function information(names, locale = 'en') {
  return withLanguage(locale, () => {
    const program = createProgram({ env: { FNOS_LANG: locale } });
    return names.reduce((parent, name) => parent.commands.find(child => child.name() === name), program).helpInformation();
  });
}
function compact(value) { return value.replace(/\s+/g, ''); }

describe('detailed operational help', () => {
  it('explains disk discovery, defaults, effects and follow-up without credentials', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-detailed-help-')); homes.push(home);
    const output = runCli(['--lang', 'en', 'store.listDisk', '--help'], home);
    assert.equal(output.status, 0, output.stderr);
    assert.equal(output.stderr, '');
    for (const title of ['Purpose:', 'Objects and Relationships:', 'Parameter Contract:', 'Conditions and Effects:', 'Results:', 'Examples:', 'Related Commands:']) assert.ok(output.stdout.includes(title), title);
    const text = compact(output.stdout);
    assert.ok(text.includes('disk[].name'));
    assert.ok(text.includes('default:true'));
    assert.ok(text.includes('true,false'));
    assert.ok(text.includes('fnosstorediskSmart'));
    assert.equal(fs.existsSync(path.join(home, '.fnos', 'settings.json')), false);
    assert.equal(fs.existsSync(path.join(home, '.fnos', 'password.key')), false);
  });
  it('keeps grouped and dotted detailed sections identical in both languages', () => {
    for (const locale of ['zh-CN', 'en']) {
      const heading = locale === 'en' ? '\nPurpose:' : '\n用途：';
      const grouped = information(['store', 'listDisk'], locale);
      const dotted = information(['store.listDisk'], locale);
      assert.ok(grouped.includes(heading));
      assert.equal(grouped.slice(grouped.indexOf(heading)), dotted.slice(dotted.indexOf(heading)));
      assert.ok(grouped.startsWith(locale === 'en' ? 'Usage:' : '用法：'));
    }
  });
  it('keeps detailed blocks out of root, group and completion descriptions', () => {
    for (const names of [[], ['store']]) assert.doesNotMatch(information(names), /Objects and Relationships:|Parameter Contract:/);
    const spec = withLanguage('en', () => buildCompletionSpec(createProgram()));
    const description = spec.commands.find(x => x.name === 'store').commands.find(x => x.name === 'listDisk').description;
    assert.doesNotMatch(description, /Purpose:|\n/);
  });
  it('presents real validation rules and distinguishes missing values from supplied values', () => {
    assert.match(compact(information(['user', 'getUserTwofaConfig'])), /required.*integer.*minimum:0/i);
    const backup = compact(information(['backup', 'listTasks']));
    assert.match(backup, /allowed:0,1/);
    assert.match(backup, /meanings.*not.*confirmed/i);
    assert.match(compact(information(['store', 'state'])), /default:\[\]/);
    assert.match(compact(information(['file', 'ls'])), /default:null/);
    assert.match(compact(information(['security', 'getProcessTraffic'])), /non-emptyJSONarrayofobjects/);
    assert.match(compact(information(['file', 'rm'])), /commas.*noescaping/i);
    assert.match(compact(information(['file', 'rm'])), /nodryrunorconfirmation|noconfirmation|withoutconfirmation/i);
  });
  it('distinguishes utility effects and authentication requirements', () => {
    const login = compact(information(['login']));
    assert.ok(login.includes('OAuth'));
    assert.doesNotMatch(login, /--servercannotbecombinedwith/);
    const status = compact(information(['auth.status']));
    assert.match(status, /doesnotcontacttheserver/i);
    assert.match(status, /expired/);
    assert.match(compact(information(['config', 'get'])), /effectiveLanguage/);
    assert.match(compact(information(['config', 'set'])), /subsequentinvocations/i);
    assert.match(compact(information(['completion', 'install'])), /~\/\.fnos\/completions/);
  });
  it('covers all business operations and parses generated example inputs without executing actions', async () => {
    const { getHelpSections, commandExamples } = require('../../src/help/sections');
    for (const locale of ['zh-CN', 'en']) for (const [domain, group] of Object.entries(COMMAND_CATALOG)) for (const [name, definition] of Object.entries(group.commands)) {
      const names = [domain, name];
      const sections = withLanguage(locale, () => getHelpSections(names));
      assert.ok(sections.length >= 6, names.join(' '));
      assert.deepEqual(withLanguage(locale, () => getHelpSections([names.join('.')])), sections);
      const examples = commandExamples(names);
      assert.ok(examples.length, names.join(' '));
      for (const tokens of examples) {
        const program = createProgram();
        let called = false;
        const target = tokens.slice(1, 3).reduce((parent, token) => parent.commands.find(child => child.name() === token), program);
        target.action((_options, command) => {
          called = true;
          const [d, n] = tokens.slice(1, 3);
          const args = buildMethodArguments(COMMAND_CATALOG[d].commands[n], command.optsWithGlobals());
          assert.ok(Array.isArray(args));
        });
        const args = tokens.slice(1).map((token, index, values) => {
          if (!/^<.*>$/.test(token)) return token;
          const [d, n] = tokens.slice(1, 3);
          const option = COMMAND_CATALOG[d].commands[n].options.find(value => value.flag.split(' ')[0] === values[index - 1]);
          return option?.type === 'integer' ? String(option.min || 0) : 'example-value';
        });
        await program.parseAsync(args, { from: 'user' });
        assert.ok(called);
      }
    }
  });
  it('covers utility examples with parsing-only actions and no credential access', async () => {
    const { commandExamples, getHelpSections } = require('../../src/help/sections');
    const paths = ['login', 'logout', 'auth.status', 'completion', 'completion install', 'config get', 'config set', 'config unset'];
    for (const name of paths) for (const locale of ['zh-CN', 'en']) {
      assert.equal(withLanguage(locale, () => getHelpSections(name.split(' '))).length, 7);
      for (const tokens of commandExamples(name.split(' '))) {
        const program = createProgram({ createClient: () => assert.fail('help examples must not contact a server') });
        const names = name.split(' ');
        const command = names.reduce((parent, token) => parent.commands.find(child => child.name() === token), program);
        let called = false;
        command.action(() => { called = true; });
        await program.parseAsync(tokens.slice(1), { from: 'user' });
        assert.ok(called, name);
      }
    }
  });
  it('wraps prose by display width without breaking identifiers or adding ANSI', () => {
    const { renderHelpDetails } = require('../../src/help/sections');
    const width = require('string-width');
    for (const locale of ['zh-CN', 'en']) for (const columns of [40, 80, 100, 120]) {
      const output = withLanguage(locale, () => renderHelpDetails(['store', 'listDisk'], columns));
      assert.ok(output.includes('disk[].name'));
      assert.doesNotMatch(output, /\u001b/);
      assert.doesNotMatch(output, /^  [，。；：！？、）】》]+$/m);
      for (const line of output.split('\n')) {
        if (!line.trim().startsWith('fnos ')) assert.ok(width(line) <= columns, `${columns}: ${line}`);
      }
    }
  });
  it('includes the same detailed contract in the generated English reference', () => {
    const reference = require('../../scripts/generate-command-reference').renderCommandReference();
    const disk = reference.split('### `store listDisk`')[1].split(/\n### `/)[0];
    assert.match(disk, /Objects and Relationships/);
    assert.match(disk, /disk\[\]\.name/);
    assert.match(disk, /`--no-hot-spare <boolean>`/);
    assert.doesNotMatch(reference, /^- --[\w-]+ <\w+>/m);
  });
});
