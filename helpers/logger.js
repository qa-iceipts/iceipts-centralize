const winston = require('winston');

/**
 * PII REDACTION CONFIGURATION
 * SECURITY: These fields will be redacted from all log output
 * Add new sensitive field names here (case-insensitive matching)
 */
const SENSITIVE_FIELDS = [
  // Authentication
  'password', 'secret', 'token', 'auth', 'apikey', 'api_key',
  'secretkey', 'secret_key', 'authheader', 'authorization',
  'client_secret', 'clientsecret', 'access_token', 'refresh_token',
  // Personal Identifiable Information
  'dlnumber', 'dl_number', 'drivinglicense', 'driving_license',
  'pan', 'panno', 'pan_number', 'aadhaar', 'aadhar',
  // Partial redaction fields (show last 4 chars)
  'vehiclenumber', 'vehicle_number', 'vehicleno', 'truckno',
  'gstin', 'mobile', 'phone', 'email',
];

// Fields that should show last 4 characters instead of full redaction
const PARTIAL_REDACT_FIELDS = [
  'vehiclenumber', 'vehicle_number', 'vehicleno', 'truckno', 'gstin'
];

/**
 * Check if a field name should be redacted
 * @param {string} fieldName - Field name to check
 * @returns {boolean}
 */
function isSensitiveField(fieldName) {
  const lowerField = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(sensitive => lowerField.includes(sensitive));
}

/**
 * Check if field should be partially redacted (show last 4 chars)
 * @param {string} fieldName - Field name to check
 * @returns {boolean}
 */
function isPartialRedactField(fieldName) {
  const lowerField = fieldName.toLowerCase();
  return PARTIAL_REDACT_FIELDS.some(partial => lowerField.includes(partial));
}

/**
 * Redact a value
 * @param {string} value - Value to redact
 * @param {boolean} partial - If true, show last 4 chars
 * @returns {string}
 */
function redactValue(value, partial = false) {
  if (value === null || value === undefined) return value;
  const strValue = String(value);
  if (strValue.length === 0) return strValue;

  if (partial && strValue.length > 4) {
    return '***' + strValue.slice(-4);
  }
  return '[REDACTED]';
}

/**
 * Recursively redact sensitive fields from an object
 * @param {any} obj - Object to redact
 * @param {number} depth - Current recursion depth (to prevent infinite loops)
 * @returns {any} - Redacted copy of the object
 */
function redactSensitiveData(obj, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) return obj;

  // Handle null/undefined
  if (obj === null || obj === undefined) return obj;

  // Handle primitives
  if (typeof obj !== 'object') return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, depth + 1));
  }

  // Handle objects
  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      // Redact sensitive fields
      const partial = isPartialRedactField(key);
      redacted[key] = redactValue(value, partial);
    } else if (typeof value === 'object' && value !== null) {
      // Recurse into nested objects
      redacted[key] = redactSensitiveData(value, depth + 1);
    } else {
      // Copy non-sensitive values as-is
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Winston format that redacts PII from log metadata
 * SECURITY: Applied to all log output automatically
 */
const piiRedactionFormat = winston.format((info) => {
  // Redact sensitive data from metadata
  const { level, message, timestamp, ...meta } = info;

  // Only process if there's metadata
  if (Object.keys(meta).length > 0) {
    const redactedMeta = redactSensitiveData(meta);
    return { level, message, timestamp, ...redactedMeta };
  }

  return info;
});

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  piiRedactionFormat(),  // SECURITY: Apply PII redaction
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  piiRedactionFormat(),  // SECURITY: Apply PII redaction
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

// Export redaction utilities for manual use if needed
logger.redactSensitiveData = redactSensitiveData;
logger.SENSITIVE_FIELDS = SENSITIVE_FIELDS;

module.exports = logger;
