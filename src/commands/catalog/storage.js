const command = (method, description, options = [], timeoutPosition = 'last') => ({
  method,
  description,
  timeoutPosition,
  options
});

const storageCatalog = {
  store: {
    className: 'Store',
    commands: {
      general: command('general', 'Get storage general information'),
      calcSpace: command('calculateSpace', 'Calculate storage space information'),
      listDisk: command('listDisks', 'List disk information', [
        {
          name: 'noHotSpare',
          flag: '--no-hot-spare <boolean>',
          legacyFlags: ['--noHotSpare <boolean>'],
          readNames: ['noHotSpare', 'hotSpare'],
          type: 'boolean',
          defaultValue: true,
          description: 'Exclude hot spare disks'
        }
      ]),
      diskSmart: command('getDiskSmart', 'Get disk SMART information', [
        { name: 'disk', flag: '--disk <disk>', type: 'string', required: true, description: 'Disk device name' }
      ]),
      state: command('getState', 'Get storage state information', [
        { name: 'name', flag: '--name <names>', type: 'csv', defaultValue: [], description: 'Comma-separated array names' },
        { name: 'uuid', flag: '--uuid <uuids>', type: 'csv', defaultValue: [], description: 'Comma-separated array UUIDs' }
      ]),
      getUserStorage: command('getUserStorage', 'Get user storage information', [
        { name: 'spaceInfo', flag: '--space-info <boolean>', type: 'boolean', defaultValue: false, description: 'Include space information' },
        { name: 'storInfo', flag: '--stor-info <boolean>', type: 'boolean', defaultValue: false, description: 'Include storage information' },
        { name: 'quotaInfo', flag: '--quota-info <boolean>', type: 'boolean', defaultValue: false, description: 'Include quota information' }
      ]),
      getCacheDeviceState: command('getCacheDeviceState', 'Get cache device state'),
      getDiskIdleTime: command('getDiskIdleTime', 'Get disk idle time'),
      getDiskWakeup: command('getDiskWakeup', 'Get disk wake-up state'),
      getRemovableConfig: command('getRemovableConfig', 'Get removable device configuration'),
      listCacheDevices: command('listCacheDevices', 'List cache devices'),
      listRemovableDevices: command('listRemovableDevices', 'List removable devices')
    }
  },
  file: {
    className: 'File',
    commands: {
      ls: command('list', 'List files and directories', [
        { name: 'path', flag: '--path <path>', type: 'string', defaultValue: null, description: 'Directory path' }
      ]),
      mkdir: command('mkdir', 'Create a directory', [
        { name: 'path', flag: '--path <path>', type: 'string', required: true, description: 'Directory path' }
      ]),
      rm: command('remove', 'Remove files or directories', [
        { name: 'files', flag: '--files <files>', type: 'csv', required: true, description: 'Comma-separated file paths' },
        {
          name: 'moveToTrashbin',
          flag: '--move-to-trashbin <boolean>',
          legacyFlags: ['--moveToTrashbin <boolean>'],
          type: 'boolean',
          defaultValue: true,
          description: 'Move removed files to trash'
        },
        { name: 'details', flag: '--details <json>', type: 'json', defaultValue: null, description: 'File detail object as JSON' }
      ]),
      getAcl: command('getAcl', 'Get file ACL information', [
        { name: 'files', flag: '--files <files>', type: 'csv', required: true, description: 'Comma-separated vol-prefixed paths' }
      ]),
      listAppDirectories: command('listAppDirectories', 'List application directories'),
      listFavorites: command('listFavorites', 'List favorite files'),
      listDirectoryEntries: command('listDirectoryEntries', 'List directory entries'),
      listRecent: command('listRecent', 'List recent files'),
      listShared: command('listShared', 'List shared files'),
      listSharedByOthers: command('listSharedByOthers', 'List files shared by others'),
      listTeamTrashBins: command('listTeamTrashBins', 'List team trash bins'),
      listTrash: command('listTrash', 'List trash entries')
    }
  },
  backup: {
    className: 'BackupManager',
    commands: {
      listTasks: command('listTasks', 'List backup tasks', [
        { name: 'direction', flag: '--direction <integer>', type: 'integer', required: true, allowedValues: [0, 1], description: 'Backup direction: 0 or 1' }
      ])
    }
  },
  download: {
    className: 'DownloadCenter',
    commands: {
      getDefaultSaveDirectory: command('getDefaultSaveDirectory', 'Get the default download directory'),
      getStatistics: command('getStatistics', 'Get download statistics'),
      queryTasks: command('queryTasks', 'Query download tasks', [
        { name: 'stateFilter', flag: '--state-filter <integer>', type: 'integer', min: 0, defaultValue: 65535, description: 'Task state bit mask' },
        { name: 'initFlag', flag: '--init-flag <boolean>', type: 'boolean', defaultValue: true, description: 'Include initialization data' }
      ])
    }
  },
  mount: {
    className: 'MountManager',
    commands: {
      listMounts: command('listMounts', 'List mounted resources'),
      getSettings: command('getSettings', 'Get mount settings')
    }
  }
};

module.exports = { storageCatalog };
