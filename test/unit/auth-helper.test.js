const assert = require('node:assert/strict');
const { describe } = require('mocha');
const { it } = require('../helpers/english');
const {
  resolveCredentials,
  resolveServerName
} = require('../../src/utils/auth-helper');

describe('credential resolution', () => {
  it('automatically resolves the only saved server', async () => {
    const store = {
      listServers: () => [
        { name: 'default', endpoint: 'saved:5666', username: 'saved' }
      ],
      getCredentials: () => ({
        endpoint: 'saved:5666',
        username: 'saved',
        password: 'saved-pw'
      })
    };

    const credentials = await resolveCredentials({}, { settingsStore: store });

    assert.equal(credentials.source, 'settings_file');
    assert.equal(credentials.serverName, 'default');
  });

  it('preserves authentication exit code 3 for partial temporary credentials', async () => {
    await assert.rejects(
      resolveCredentials({ endpoint: 'partial:5666' }),
      (error) => error.message === 'PARTIAL_CREDENTIALS' && error.exitCode === 3
    );
  });

  it('preserves authentication exit code 3 when no server is saved', async () => {
    await assert.rejects(
      resolveCredentials({}, {
        settingsStore: {
          listServers: () => [],
          getCredentials: () => null
        }
      }),
      (error) => error.exitCode === 3
    );
  });

  it('resolves explicitly named saved credentials', async () => {
    const records = {
      default: {
        endpoint: 'home:5666',
        username: 'home-user',
        password: 'home-pw'
      },
      office: {
        endpoint: 'office:5666',
        username: 'office-user',
        password: 'office-pw'
      }
    };
    const settingsStore = {
      listServers: () => Object.entries(records).map(([name, credentials]) => ({
        name,
        endpoint: credentials.endpoint,
        username: credentials.username
      })),
      getCredentials: (name) => records[name] || null
    };

    const credentials = await resolveCredentials(
      { server: 'office' },
      { settingsStore }
    );

    assert.deepEqual(credentials, {
      ...records.office,
      source: 'settings_file',
      serverName: 'office'
    });
  });

  it('lists available names when an explicit server does not exist', async () => {
    const settingsStore = {
      listServers: () => [
        { name: 'default', endpoint: 'home:5666', username: 'home-user' },
        { name: 'office', endpoint: 'office:5666', username: 'office-user' }
      ]
    };

    await assert.rejects(
      resolveServerName('missing', { settingsStore }),
      (error) => error.exitCode === 3 &&
        /default/.test(error.message) &&
        /office/.test(error.message)
    );
  });

  it('rejects mixing a saved server with temporary credentials', async () => {
    await assert.rejects(
      resolveCredentials({
        server: 'office',
        endpoint: 'temporary:5666'
      }),
      (error) => error.name === 'CommandParameterError' &&
        error.exitCode === 4
    );
  });

  it('rejects mixing a saved server with an empty temporary credential', async () => {
    await assert.rejects(
      resolveCredentials(
        { server: 'office', password: '' },
        {
          settingsStore: {
            listServers: () => [
              { name: 'office', endpoint: 'office:5666', username: 'office-user' }
            ],
            getCredentials: () => ({
              endpoint: 'office:5666',
              username: 'office-user',
              password: 'office-pw'
            })
          }
        }
      ),
      (error) => error.name === 'CommandParameterError' &&
        error.exitCode === 4
    );
  });

  it('rejects empty temporary credentials instead of using saved credentials', async () => {
    await assert.rejects(
      resolveCredentials(
        { endpoint: '', username: '', password: '' },
        {
          settingsStore: {
            listServers: () => [
              { name: 'default', endpoint: 'saved:5666', username: 'saved-user' }
            ],
            getCredentials: () => ({
              endpoint: 'saved:5666',
              username: 'saved-user',
              password: 'saved-pw'
            })
          }
        }
      ),
      (error) => error.message === 'PARTIAL_CREDENTIALS' &&
        error.exitCode === 3
    );
  });

  it('uses the selector when multiple servers are available', async () => {
    const summaries = [
      { name: 'default', endpoint: 'home:5666', username: 'home-user' },
      { name: 'office', endpoint: 'office:5666', username: 'office-user' }
    ];
    const settingsStore = {
      listServers: () => summaries,
      getCredentials: (name) => ({
        endpoint: `${name}:5666`,
        username: `${name}-user`,
        password: `${name}-pw`
      })
    };
    let received;

    const credentials = await resolveCredentials({}, {
      settingsStore,
      select: async (servers) => {
        received = servers;
        return 'office';
      }
    });

    assert.deepEqual(received, summaries);
    assert.equal(credentials.serverName, 'office');
    assert.equal(credentials.endpoint, 'office:5666');
  });
});
