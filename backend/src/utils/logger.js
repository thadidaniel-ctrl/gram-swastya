const winston = require('winston');
const path = require('path');
const config = require('../config');

const isProduction = config.nodeEnv === 'production';

const printfFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  // Files/aggregators: JSON in production, plain text otherwise (never colorized).
  format: isProduction ? jsonFormat : printfFormat,
  transports: [
    new winston.transports.Console({
      // Console: colored in dev, structured JSON in production.
      format: isProduction
        ? jsonFormat
        : winston.format.combine(winston.format.colorize(), printfFormat),
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

module.exports = logger;
