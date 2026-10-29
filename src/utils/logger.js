/**
 * Logger utility using Winston
 */

const winston = require('winston');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const util = require('util');

// Create logs directory if it doesn't exist
const logsDir = path.join(os.homedir(), '.fnos', 'logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Generate random number for log filename
const randomNum = crypto.randomBytes(4).toString('hex');
const logFilename = `fnos-${new Date().toISOString().split('T')[0]}-${randomNum}.log`;

const SENSITIVE_VALUE = /((?:"?(?:longToken|long_token|accessToken|access_token|refreshToken|refresh_token|codeVerifier|code_verifier|twofaCode|twofa_code|password|secret|token|code|hmac)"?)\s*[:=]\s*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\[REDACTED\]|[^\s,}\]]+)/gi;
const SIGNED_MESSAGE = /^(Calculated iz-result:|Sending msg to channel:|已发送请求:)\s*.*$/i;

function redactSensitive(value) {
  const message = String(value);
  if (SIGNED_MESSAGE.test(message)) return message.replace(SIGNED_MESSAGE, '$1 [REDACTED]');
  return message
    .replace(/\bBearer\s+[^\s,"'}\]]+/gi, 'Bearer [REDACTED]')
    .replace(SENSITIVE_VALUE, (match, prefix, rawValue) => {
      const quote = rawValue[0] === '"' || rawValue[0] === "'" ? rawValue[0] : '';
      const value = quote ? rawValue.slice(1, -1) : rawValue;
      return value === '[REDACTED]' ? match : `${prefix}${quote}[REDACTED]${quote}`;
    })
    .replace(/(服务器返回的secret:\s*)\S+/gi, '$1[REDACTED]');
}

const redactFormat = winston.format((info) => {
  info.message = redactSensitive(info.message);
  return info;
});

// These rejections are returned to the command, which prints the complete error.
const skipSdkAuthenticationErrors = winston.format((info) =>
  /^(登录失败|两步验证失败):/.test(info.message) ? false : info);

// Log format
const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `${timestamp} - ${level.toUpperCase()} - ${message}`;
});

// Create a custom transport that outputs to stderr
class StderrTransport extends winston.Transport {
  constructor(opts = {}) {
    super(opts);
    this.level = opts.level || 'error';
    this.format = opts.format || winston.format.simple();
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Format the message
    const formatted = this.format.transform(info);
    const message = typeof formatted === 'string' ? formatted : formatted[Symbol.for('message')] || formatted.message;

    // Output to stderr
    process.stderr.write(message + '\n');

    callback();
  }
}

// Create logger
const logger = winston.createLogger({
  level: 'silly', // Capture all levels for file output
  format: winston.format.combine(
    redactFormat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console transport - output all logs to stderr
    new StderrTransport({
      level: 'error', // Default: only show errors
      format: winston.format.combine(
        redactFormat(),
        winston.format.colorize(),
        logFormat
      )
    }),
    // File transport - output all levels
    new winston.transports.File({
      level: 'silly', // Write all levels to file
      filename: path.join(logsDir, logFilename),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  ]
});

/**
 * Set log level based on verbose flag
 * @param {number} verbose - Verbose level (0, 1, 2, 3)
 */
function setLogLevel(verbose) {
  const consoleTransport = logger.transports.find(t => t instanceof StderrTransport);
  
  if (verbose === 0) {
    // Default: only show errors on console
    consoleTransport.level = 'error';
  } else if (verbose >= 1 && verbose <= 3) {
    const levels = ['info', 'debug', 'silly'];
    // Show logs at specified level on console
    consoleTransport.level = levels[verbose - 1];
  }
  
  // Also update the overall logger level to ensure file transport works correctly
  logger.level = verbose >= 3 ? 'silly' : (verbose >= 2 ? 'debug' : (verbose >= 1 ? 'info' : 'error'));
  
  // Try to update SDK logger level if available
  try {
    const fnosLogger = require('fnos/dist/logger');
    if (fnosLogger && fnosLogger.default && fnosLogger.default.transports) {
      // Replace CLI-owned transports as well, so repeated setup cannot duplicate logs.
      for (const transport of [...fnosLogger.default.transports]) {
        if (transport instanceof winston.transports.Console || transport instanceof StderrTransport) {
          fnosLogger.default.remove(transport);
        }
      }
      fnosLogger.default.level = consoleTransport.level;
      // Add our custom stderr transport
      const sdkStderrTransport = new StderrTransport({
        level: consoleTransport.level,
        format: winston.format.combine(
          skipSdkAuthenticationErrors(),
          redactFormat(),
          winston.format.colorize(),
          logFormat
        )
      });
      fnosLogger.default.add(sdkStderrTransport);
    }
  } catch (error) {
    // Ignore if fnos logger is not available
  }
}

module.exports = { logger, redactSensitive, setLogLevel };
