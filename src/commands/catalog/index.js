const { monitoringCatalog } = require('./monitoring');
const { storageCatalog } = require('./storage');
const { systemCatalog } = require('./system');
const { identitySecurityCatalog } = require('./identity-security');
const { networkSharingCatalog } = require('./network-sharing');
const { applicationsCatalog } = require('./applications');

const COMMAND_CATALOG = Object.freeze({
  ...monitoringCatalog,
  ...storageCatalog,
  ...systemCatalog,
  ...identitySecurityCatalog,
  ...networkSharingCatalog,
  ...applicationsCatalog
});

const DOMAIN_COUNT = Object.keys(COMMAND_CATALOG).length;
const COMMAND_COUNT = Object.values(COMMAND_CATALOG)
  .reduce((count, domain) => count + Object.keys(domain.commands).length, 0);

module.exports = { COMMAND_CATALOG, DOMAIN_COUNT, COMMAND_COUNT };
