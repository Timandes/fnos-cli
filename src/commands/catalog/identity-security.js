const command = (method, description, options = [], timeoutPosition = 'last') => ({
  method,
  description,
  timeoutPosition,
  options
});

const identitySecurityCatalog = {
  user: {
    className: 'User',
    commands: {
      info: command('getInfo', 'Get user information'),
      listUG: command('listUserGroups', 'List users and groups'),
      groupUsers: command('groupUsers', 'Get user grouping information'),
      isAdmin: command('isAdmin', 'Check whether the current user is an administrator'),
      listTokens: command('listTokens', 'List authentication tokens'),
      getMyTwofaConfig: command('getMyTwofaConfig', 'Get current user two-factor configuration'),
      getGlobalTwofaConfig: command('getGlobalTwofaConfig', 'Get global two-factor configuration'),
      getUserTwofaConfig: command('getUserTwofaConfig', 'Get a user two-factor configuration', [
        { name: 'uid', flag: '--uid <integer>', type: 'integer', min: 0, required: true, description: 'User ID' }
      ]),
      getActiveState: command('getActiveState', 'Get current user active state'),
      getGroupInfo: command('getGroupInfo', 'Get group information', [
        { name: 'group', flag: '--group <group>', type: 'string', required: true, description: 'Group name' }
      ]),
      listGroups: command('listGroups', 'List groups'),
      listLoginDevices: command('listLoginDevices', 'List login devices'),
      getPreference: command('getPreference', 'Get a user preference', [
        { name: 'name', flag: '--name <name>', type: 'string', required: true, description: 'Preference name' }
      ])
    }
  },
  ipblock: {
    className: 'IPBlocker',
    commands: {
      listAllowedAddresses: command('listAllowedAddresses', 'List allowed IP addresses'),
      getAutoBlockRule: command('getAutoBlockRule', 'Get automatic IP blocking rule'),
      listDeniedAddresses: command('listDeniedAddresses', 'List denied IP addresses')
    }
  },
  security: {
    className: 'Security',
    commands: {
      getFirewall: command('getFirewall', 'Get firewall configuration'),
      getProcessTraffic: command('getProcessTraffic', 'Get process traffic data', [
        { name: 'processes', flag: '--processes <json>', type: 'json-record-array', required: true, description: 'Process objects as a JSON array' }
      ])
    }
  }
};

module.exports = { identitySecurityCatalog };
