const { createAPILimiter } = require('./rate-limiter');

/**
 * VAHAN API rate limiter
 */
const vahanLimiter = createAPILimiter('vahan');

/**
 * eWay Bill API rate limiter
 */
const ewayLimiter = createAPILimiter('eway');

/**
 * eInvoice API rate limiter
 */
const einvoiceLimiter = createAPILimiter('einvoice');

module.exports = {
  vahanRateLimiter: vahanLimiter,
  ewayRateLimiter: ewayLimiter,
  einvoiceRateLimiter: einvoiceLimiter
};
