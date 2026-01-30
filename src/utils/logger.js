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
const logFilename = `fnos-cli-${new Date().toISOString().split('T')[0]}-${randomNum}.log`;

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
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console transport - output all logs to stderr
    new StderrTransport({
      level: 'error', // Default: only show errors
      format: winston.format.combine(
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
      // Remove existing console transport
      const sdkConsoleTransport = fnosLogger.default.transports.find(t => t instanceof winston.transports.Console);
      if (sdkConsoleTransport) {
        fnosLogger.default.remove(sdkConsoleTransport);
      }
      // Add our custom stderr transport
      const sdkStderrTransport = new StderrTransport({
        level: consoleTransport.level,
        format: winston.format.combine(
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

module.exports = { logger, setLogLevel };