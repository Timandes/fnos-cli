/**
 * Logger utility using Winston
 */

const winston = require('winston');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

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

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // File transport
    new winston.transports.File({
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
  const levels = ['info', 'debug', 'silly'];
  if (verbose >= 1 && verbose <= 3) {
    logger.level = levels[verbose - 1];
  }
}

module.exports = { logger, setLogLevel };