const assert = require('node:assert/strict');
const { describe, it } = require('mocha');
const sdk = require('fnos');

function loadCatalog() {
  try {
    return require('../../src/commands/catalog');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('../../src/commands/catalog')) return {};
    throw error;
  }
}

const { COMMAND_CATALOG, DOMAIN_COUNT, COMMAND_COUNT } = loadCatalog();

const LEGACY_COMMANDS = [
  'resmon.cpu', 'resmon.gpu', 'resmon.mem', 'resmon.disk', 'resmon.net', 'resmon.gen',
  'store.general', 'store.calcSpace', 'store.listDisk', 'store.diskSmart', 'store.state',
  'sysinfo.getHostName', 'sysinfo.getTrimVersion', 'sysinfo.getMachineId',
  'sysinfo.getHardwareInfo', 'sysinfo.getUptime', 'user.info', 'user.listUG',
  'user.groupUsers', 'user.isAdmin', 'network.list', 'network.detect',
  'file.ls', 'file.mkdir', 'file.rm', 'sac.upsStatus'
];

describe('complete command catalog', () => {
  it('contains 21 domains and 111 unique commands', () => {
    assert.ok(COMMAND_CATALOG, 'complete command catalog must be implemented');
    const names = Object.entries(COMMAND_CATALOG).flatMap(([domainName, domain]) =>
      Object.keys(domain.commands).map((commandName) => `${domainName}.${commandName}`)
    );
    assert.equal(DOMAIN_COUNT, 21);
    assert.equal(COMMAND_COUNT, 111);
    assert.equal(new Set(names).size, 111);
    for (const legacyName of LEGACY_COMMANDS) assert.ok(names.includes(legacyName), legacyName);
  });

  it('references classes and methods exported by fnos 0.4.0', () => {
    assert.ok(COMMAND_CATALOG, 'complete command catalog must be implemented');
    assert.equal(sdk.version, '0.4.0');
    for (const [domainName, domain] of Object.entries(COMMAND_CATALOG)) {
      const Constructor = sdk[domain.className];
      assert.equal(typeof Constructor, 'function', `${domainName}: ${domain.className}`);
      for (const [commandName, definition] of Object.entries(domain.commands)) {
        assert.equal(typeof Constructor.prototype[definition.method], 'function', `${domainName}.${commandName}`);
        assert.equal(typeof definition.description, 'string');
        assert.ok(definition.description.length > 0);
        assert.ok(['first', 'last'].includes(definition.timeoutPosition));
        assert.ok(Array.isArray(definition.options));
      }
    }
  });
});
