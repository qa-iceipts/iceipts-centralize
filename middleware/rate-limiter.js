const rateLimit = require('express-rate-limit');
const config = require('../config/gateway.config');
const logger = require('../helpers/logger');

/**
 * Global rate limiter
 */
const globalLimiter = rateLimit({
  windowMs: config.rateLimits.global.windowMs,
  max: config.rateLimits.global.max,
  message: {
    success: false,
    error_message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      success: false,
      error_message: 'Too many requests, please try again later.'
    });
  }
});

/**
 * Create API-specific rate limiter
 */
function createAPILimiter(apiType) {
  const limits = config.rateLimits[apiType.toLowerCase()];
  
  if (!limits) {
    throw new Error(`Rate limit config not found for API type: ${apiType}`);
  }

  return rateLimit({
    windowMs: limits.windowMs,
    max: limits.max,
    message: {
      success: false,
      error_message: `Too many ${apiType} requests, please try again later.`
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use dispatcher ID if available, otherwise use IP
      return req.headers['x-dispatcher-id'] || req.ip;
    },
    handler: (req, res) => {
      logger.warn(`${apiType} rate limit exceeded`, {
        dispatcher: req.headers['x-dispatcher-id'],
        ip: req.ip,
        path: req.path
      });
      res.status(429).json({
        success: false,
        error_message: `Too many ${apiType} requests, please try again later.`
      });
    }
  });
}

module.exports = {
  globalLimiter,
  createAPILimiter
};
