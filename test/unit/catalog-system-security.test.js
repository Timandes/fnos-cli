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

const { systemCatalog } = loadCatalog('../../src/commands/catalog/system');
const { identitySecurityCatalog } = loadCatalog('../../src/commands/catalog/identity-security');

function count(catalog) {
  return Object.values(catalog).reduce((total, domain) => total + Object.keys(domain.commands).length, 0);
}

describe('system and identity/security catalogs', () => {
  it('defines the expected commands', () => {
    assert.ok(systemCatalog, 'system catalog must be implemented');
    assert.ok(identitySecurityCatalog, 'identity/security catalog must be implemented');
    assert.equal(count(systemCatalog), 12);
    assert.equal(count(identitySecurityCatalog), 18);
    assert.equal(systemCatalog.sysinfo.commands.getHostName.method, 'getHostName');
    assert.equal(identitySecurityCatalog.user.commands.info.method, 'getInfo');
    assert.equal(identitySecurityCatalog.security.commands.getProcessTraffic.options[0].type, 'json-record-array');
  });
});
