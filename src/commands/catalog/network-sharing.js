const command = (method, description, options = [], timeoutPosition = 'last') => ({
  method,
  description,
  timeoutPosition,
  options
});

const networkSharingCatalog = {
  network: {
    className: 'Network',
    commands: {
      list: command('list', 'List network information', [
        { name: 'type', flag: '--type <integer>', type: 'integer', allowedValues: [0, 1], defaultValue: 0, description: 'Network list type: 0 or 1' }
      ]),
      detect: command('detect', 'Detect a network interface', [
        { name: 'ifName', flag: '--if-name <name>', legacyFlags: ['--ifName <name>'], type: 'string', required: true, description: 'Network interface name' }
      ]),
      getGateway: command('getGateway', 'Get gateway information'),
      getMultiGatewayStatus: command('getMultiGatewayStatus', 'Get multi-gateway status'),
      getNicPerformanceMode: command('getNicPerformanceMode', 'Get NIC performance mode'),
      getInfo: command('getInfo', 'Get network interface information', [
        { name: 'ifName', flag: '--if-name <name>', legacyFlags: ['--ifName <name>'], type: 'string', required: true, description: 'Network interface name' }
      ]),
      getSshStatus: command('getSshStatus', 'Get SSH service status')
    }
  },
  share: {
    className: 'Share',
    commands: {
      smbOpt: command('smbOpt', 'Get SMB options'),
      dlnaOptions: command('dlnaOptions', 'Get DLNA options'),
      dlnaShareOptions: command('dlnaShareOptions', 'Get DLNA share options'),
      ftpOptions: command('ftpOptions', 'Get FTP options'),
      ftpShareOptions: command('ftpShareOptions', 'Get FTP share options'),
      nfsOptions: command('nfsOptions', 'Get NFS options'),
      nfsShareOptions: command('nfsShareOptions', 'Get NFS share options'),
      smbShareOptions: command('smbShareOptions', 'Get SMB share options'),
      webdavOptions: command('webdavOptions', 'Get WebDAV options'),
      webdavShareOptions: command('webdavShareOptions', 'Get WebDAV share options'),
      getLinkDefaults: command('getLinkDefaults', 'Get share link defaults'),
      getDefaultLink: command('getDefaultLink', 'Get the default share link'),
      listLinks: command('listLinks', 'List share links', [
        { name: 'isAdmin', flag: '--is-admin <boolean>', type: 'boolean', defaultValue: false, description: 'Use administrator view' },
        { name: 'keyword', flag: '--keyword <keyword>', type: 'string', defaultValue: '', description: 'Search keyword' },
        { name: 'page', flag: '--page <integer>', type: 'integer', min: 1, defaultValue: 1, description: 'Page number' },
        { name: 'pageSize', flag: '--page-size <integer>', type: 'integer', min: 1, defaultValue: 100, description: 'Items per page' },
        { name: 'sortColumn', flag: '--sort-column <column>', type: 'string', defaultValue: 'createdTime', description: 'Sort column' },
        { name: 'sortType', flag: '--sort-type <type>', type: 'string', defaultValue: 'DESC', description: 'Sort direction' }
      ]),
      getLinkPermission: command('getLinkPermission', 'Get share link permission')
    }
  },
  iscsi: {
    className: 'IscsiManager',
    commands: {
      getConfig: command('getConfig', 'Get iSCSI configuration'),
      listInitiators: command('listInitiators', 'List iSCSI initiators'),
      listLuns: command('listLuns', 'List iSCSI LUNs'),
      listLunUsergroups: command('listLunUsergroups', 'List iSCSI LUN user groups', [
        { name: 'lunName', flag: '--lun-name <name>', type: 'string', defaultValue: '', description: 'LUN name filter' },
        { name: 'wwn', flag: '--wwn <wwn>', type: 'string', defaultValue: '', description: 'WWN filter' }
      ]),
      listTargets: command('listTargets', 'List iSCSI targets')
    }
  },
  netsvr: {
    className: 'NetworkServer',
    commands: {
      listCertificates: command('listCertificates', 'List server certificates'),
      getConnectionConfig: command('getConnectionConfig', 'Get connection configuration'),
      getConnectionStatus: command('getConnectionStatus', 'Get connection status'),
      listDdnsProviders: command('listDdnsProviders', 'List DDNS providers'),
      listDdnsRecords: command('listDdnsRecords', 'List DDNS records', [
        { name: 'page', flag: '--page <integer>', type: 'integer', min: 1, defaultValue: 1, description: 'Page number' },
        { name: 'pageSize', flag: '--page-size <integer>', type: 'integer', min: 1, defaultValue: 200, description: 'Items per page' }
      ])
    }
  }
};

module.exports = { networkSharingCatalog };
