const command = (method, description, options = [], timeoutPosition = 'last') => ({
  method,
  description,
  timeoutPosition,
  options
});

const monitoringCatalog = {
  resmon: {
    className: 'ResourceMonitor',
    commands: {
      cpu: command('cpu', 'Get CPU resource monitoring information', [], 'first'),
      gpu: command('gpu', 'Get GPU resource monitoring information', [], 'first'),
      mem: command('memory', 'Get memory resource monitoring information', [], 'first'),
      disk: command('disk', 'Get disk resource monitoring information', [], 'first'),
      net: command('net', 'Get network resource monitoring information', [], 'first'),
      gen: command('general', 'Get general resource monitoring information', [
        { name: 'items', flag: '--items <items>', type: 'csv', defaultValue: null, description: 'Comma-separated monitoring items' }
      ], 'first'),
      npu: command('npu', 'Get NPU resource monitoring information', [], 'first'),
      processes: command('processes', 'List monitored processes', [], 'first'),
      serviceProcesses: command('serviceProcesses', 'List monitored service processes', [], 'first'),
      systemFan: command('systemFan', 'Get system fan monitoring information', [], 'first')
    }
  },
  event: {
    className: 'EventLogger',
    commands: {
      commonList: command('commonList', 'List common event log entries')
    }
  },
  notify: {
    className: 'Notify',
    commands: {
      unreadTotal: command('unreadTotal', 'Get unread notification total')
    }
  }
};

module.exports = { monitoringCatalog };
