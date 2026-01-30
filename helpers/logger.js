const winston = require('winston');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
});

// Add custom logging methods for HTTP requests/responses
logger.logRequest = function(req) {
  this.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    dispatcher: req.headers['x-dispatcher-id']
  });
};

logger.logResponse = function(req, res, responseTime) {
  const logData = {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    dispatcher: req.headers['x-dispatcher-id']
  };

  if (res.statusCode >= 400) {
    this.error('Request failed', logData);
  } else {
    this.info('Request completed', logData);
  }
};

module.exports = logger;
