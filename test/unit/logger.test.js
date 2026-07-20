const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { afterEach, describe, it } = require('mocha');

const homes = [];
afterEach(() => {
  for (const home of homes.splice(0)) fs.rmSync(home, { recursive: true, force: true });
});

describe('sensitive log redaction', () => {
  it('removes sentinels from every CLI level, SDK stderr, and the log file', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fnos-cli-logger-unit-'));
    homes.push(home);
    const script = String.raw`
      const { logger, setLogLevel } = require('./src/utils/logger');
      setLogLevel(3);
      logger.info('password=PASSWORD_SENTINEL code=OTP_SENTINEL');
      logger.debug('token=TOKEN_SENTINEL longToken=LONG_TOKEN_SENTINEL long_token=LONG_SNAKE_SENTINEL');
      logger.silly('accessToken=ACCESS_TOKEN_SENTINEL access_token=ACCESS_SNAKE_SENTINEL secret=SECRET_SENTINEL hmac=HMAC_SENTINEL');
      const sdkLogger = require('fnos/dist/logger').default;
      sdkLogger.debug('Calculated iz-result: SIGNATURE_SENTINEL');
      sdkLogger.debug('Sending msg to channel: PAYLOAD_SENTINEL');
      logger.end();
    `;
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    assert.equal(result.status, 0, result.stderr);
    const logsDir = path.join(home, '.fnos', 'logs');
    const fileOutput = fs.readdirSync(logsDir)
      .map((name) => fs.readFileSync(path.join(logsDir, name), 'utf8'))
      .join('\n');
    const combined = `${result.stdout}\n${result.stderr}\n${fileOutput}`;
    const sentinels = [
      'PASSWORD_SENTINEL', 'OTP_SENTINEL', 'TOKEN_SENTINEL', 'LONG_TOKEN_SENTINEL',
      'LONG_SNAKE_SENTINEL', 'ACCESS_TOKEN_SENTINEL', 'ACCESS_SNAKE_SENTINEL',
      'SECRET_SENTINEL', 'HMAC_SENTINEL', 'SIGNATURE_SENTINEL', 'PAYLOAD_SENTINEL'
    ];
    for (const sentinel of sentinels) assert.ok(!combined.includes(sentinel), sentinel);
    assert.match(combined, /Calculated iz-result: \[REDACTED\]/);
    assert.match(combined, /Sending msg to channel: \[REDACTED\]/);
  });
});
