const assert = require('node:assert/strict');
const { describe, it } = require('mocha');

function loadCatalog(modulePath) {
  try {
    return require(modulePath);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes(modulePath)) return {};
    throw error;
  }
}

const { monitoringCatalog } = loadCatalog('../../src/commands/catalog/monitoring');
const { storageCatalog } = loadCatalog('../../src/commands/catalog/storage');

function commandCount(catalog) {
  return Object.values(catalog).reduce((count, domain) => count + Object.keys(domain.commands).length, 0);
}

describe('monitoring and storage catalogs', () => {
  it('defines the expected domains and command counts', () => {
    assert.ok(monitoringCatalog, 'monitoring catalog must be implemented');
    assert.ok(storageCatalog, 'storage catalog must be implemented');
    assert.deepEqual(Object.keys(monitoringCatalog), ['resmon', 'event', 'notify']);
    assert.deepEqual(Object.keys(storageCatalog), ['store', 'file', 'backup', 'download', 'mount']);
    assert.equal(commandCount(monitoringCatalog), 12);
    assert.equal(commandCount(storageCatalog), 30);
  });

  it('preserves legacy command names and fixes positional defaults', () => {
    assert.ok(monitoringCatalog, 'monitoring catalog must be implemented');
    assert.ok(storageCatalog, 'storage catalog must be implemented');
    assert.equal(monitoringCatalog.resmon.commands.mem.method, 'memory');
    assert.deepEqual(storageCatalog.store.commands.listDisk.options[0].defaultValue, true);
    assert.deepEqual(storageCatalog.store.commands.state.options.map((option) => option.defaultValue), [[], []]);
    assert.equal(storageCatalog.file.commands.ls.options[0].defaultValue, null);
    assert.equal(storageCatalog.file.commands.rm.options[1].defaultValue, true);
  });
});
