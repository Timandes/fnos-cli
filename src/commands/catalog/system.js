const command = (method, description, options = [], timeoutPosition = 'last') => ({
  method,
  description,
  timeoutPosition,
  options
});

const systemCatalog = {
  sysinfo: {
    className: 'SystemInfo',
    commands: {
      getHostName: command('getHostName', 'Get host name information'),
      getTrimVersion: command('getTrimVersion', 'Get Trim version information'),
      getMachineId: command('getMachineId', 'Get machine ID information'),
      getHardwareInfo: command('getHardwareInfo', 'Get hardware information'),
      getUptime: command('getUptime', 'Get system uptime information'),
      getReservedPartition: command('getReservedPartition', 'Get reserved partition information')
    }
  },
  sac: {
    className: 'SAC',
    commands: {
      upsStatus: command('upsStatus', 'Get UPS status information'),
      getEmailConfig: command('getEmailConfig', 'Get email notification configuration'),
      listEmailProviders: command('listEmailProviders', 'List email notification providers')
    }
  },
  license: {
    className: 'LicenseManager',
    commands: {
      list: command('list', 'List installed software licenses', [
        { name: 'page', flag: '--page <integer>', type: 'integer', min: 1, defaultValue: 1, description: 'Page number' },
        { name: 'pageSize', flag: '--page-size <integer>', type: 'integer', min: 1, defaultValue: 200, description: 'Items per page' }
      ])
    }
  },
  liveupdate: {
    className: 'LiveUpdate',
    commands: {
      getStatus: command('getStatus', 'Get live update status')
    }
  },
  sysrestore: {
    className: 'SystemRestore',
    commands: {
      getInfo: command('getInfo', 'Get system restore information')
    }
  }
};

module.exports = { systemCatalog };
