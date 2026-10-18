const command = (method, description, options = [], timeoutPosition = 'last') => ({
  method,
  description,
  timeoutPosition,
  options
});

const applicationsCatalog = {
  docker: {
    description: 'Docker containers, images, and networks',
    className: 'DockerManager',
    commands: {
      listComposes: command('listComposes', 'List Docker Compose projects'),
      listContainers: command('listContainers', 'List Docker containers', [
        { name: 'all', flag: '--all <boolean>', type: 'boolean', defaultValue: true, description: 'Include stopped containers' }
      ]),
      stats: command('stats', 'Get Docker container statistics'),
      getSystemSettings: command('getSystemSettings', 'Get Docker system settings'),
      listImageDownloads: command('listImageDownloads', 'List Docker image downloads'),
      listImages: command('listImages', 'List Docker images'),
      listNetworks: command('listNetworks', 'List Docker networks'),
      listRegistryRepositories: command('listRegistryRepositories', 'List Docker registry repositories', [
        { name: 'keyword', flag: '--keyword <keyword>', type: 'string', defaultValue: '', description: 'Search keyword' },
        { name: 'page', flag: '--page <integer>', type: 'integer', min: 1, defaultValue: 1, description: 'Page number' },
        { name: 'pageSize', flag: '--page-size <integer>', type: 'integer', min: 1, defaultValue: 20, description: 'Items per page' }
      ])
    }
  }
};

module.exports = { applicationsCatalog };
