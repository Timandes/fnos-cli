function oauthRecord(overrides = {}) {
  return {
    authType: 'oauth', endpoint: 'https://nas.example:5667',
    oauth: {
      deviceId: 'test-device', deviceName: 'fnos-cli', clientId: 'YJNMPJUGA9',
      scopes: ['trim.user.all'], verifySsl: false,
      session: { accessToken: 'access-old', refreshToken: 'refresh-old', expiresAt: 2000000000 },
      ...overrides
    }
  };
}

module.exports = { oauthRecord };
