/**
 * Command mapping configuration
 */

const COMMAND_MAPPING = {
  resmon: {
    className: 'ResourceMonitor',
    commands: {
      cpu: { method: 'cpu', description: 'Get CPU resource monitoring information' },
      gpu: { method: 'gpu', description: 'Get GPU resource monitoring information' },
      mem: { method: 'memory', description: 'Get memory resource monitoring information' },
      disk: { method: 'disk', description: 'Get disk resource monitoring information' },
      net: { method: 'net', description: 'Get network resource monitoring information' },
      gen: { method: 'general', description: 'Get general resource monitoring information', params: ['items'] }
    }
  },
  store: {
    className: 'Store',
    commands: {
      general: { method: 'general', description: 'Get storage general information' },
      calcSpace: { method: 'calculateSpace', description: 'Calculate storage space information' },
      listDisk: { method: 'listDisks', description: 'List disk information', params: ['noHotSpare'] },
      diskSmart: { method: 'getDiskSmart', description: 'Get disk SMART information', params: ['disk'] },
      state: { method: 'getState', description: 'Get storage state information', params: ['name', 'uuid'] }
    }
  },
  sysinfo: {
    className: 'SystemInfo',
    commands: {
      getHostName: { method: 'getHostName', description: 'Get host name information' },
      getTrimVersion: { method: 'getTrimVersion', description: 'Get Trim version information' },
      getMachineId: { method: 'getMachineId', description: 'Get machine ID information' },
      getHardwareInfo: { method: 'getHardwareInfo', description: 'Get hardware information' },
      getUptime: { method: 'getUptime', description: 'Get system uptime information' }
    }
  },
  user: {
    className: 'User',
    commands: {
      info: { method: 'getInfo', description: 'Get user information' },
      listUG: { method: 'listUserGroups', description: 'List users and groups' },
      groupUsers: { method: 'groupUsers', description: 'Get user grouping information' },
      isAdmin: { method: 'isAdmin', description: 'Check if current user is admin' }
    }
  },
  network: {
    className: 'Network',
    commands: {
      list: { method: 'list', description: 'List network information', params: ['type'] },
      detect: { method: 'detect', description: 'Detect network interface', params: ['ifName'] }
    }
  },
  file: {
    className: 'File',
    commands: {
      ls: { method: 'list', description: 'List files and directories', params: ['path'] },
      mkdir: { method: 'mkdir', description: 'Create directory', params: ['path'] },
      rm: { method: 'remove', description: 'Remove files or directories', params: ['files', 'moveToTrashbin', 'details'] }
    }
  },
  sac: {
    className: 'SAC',
    commands: {
      upsStatus: { method: 'upsStatus', description: 'Get UPS status information' }
    }
  }
};

module.exports = { COMMAND_MAPPING };