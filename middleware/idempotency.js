/**
 * Idempotency Middleware for POST Requests
 *
 * USAGE:
 * - Client includes `X-Idempotency-Key` header with a unique key
 * - If the same key is seen again within TTL, returns cached response
 * - If no header, middleware is bypassed (opt-in behavior)
 *
 * SAFETY:
 * - Opt-in: Only active when X-Idempotency-Key header is present
 * - In-memory storage: Per-instance only (suitable for single-node deployment)
 * - TTL: Keys expire after 24 hours to prevent memory bloat
 * - Does NOT block requests without the header
 */

const logger = require('../helpers/logger');

// In-memory store for idempotency keys
// Structure: { key: { response: object, timestamp: number, status: 'pending'|'complete' } }
const idempotencyStore = new Map();

// Configuration
const CONFIG = {
  TTL_MS: 24 * 60 * 60 * 1000,        // 24 hours
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // Cleanup every hour
  HEADER_NAME: 'x-idempotency-key',
  MAX_STORE_SIZE: 10000,               // Prevent unbounded growth
};

// Periodic cleanup of expired entries
let cleanupInterval = null;

function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of idempotencyStore.entries()) {
      if (now - value.timestamp > CONFIG.TTL_MS) {
        idempotencyStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Idempotency store cleanup', { entriesRemoved: cleaned, remaining: idempotencyStore.size });
    }
  }, CONFIG.CLEANUP_INTERVAL_MS);

  // Don't block Node.js exit
  cleanupInterval.unref();
}

// Start cleanup on module load
startCleanup();

/**
 * Generate a deterministic idempotency key from request data
 * Used when client doesn't provide a key but we want to detect duplicates
 *
 * @param {Object} req - Express request object
 * @returns {string|null} - Generated key or null
 */
function generateKeyFromRequest(req) {
  // For eWay Bill: use docNo + fromGstin + toGstin
  if (req.body?.docNo && req.body?.fromGstin) {
    const crypto = require('crypto');
    const data = `${req.body.docNo}:${req.body.fromGstin}:${req.body.toGstin || ''}`;
    return `auto:${crypto.createHash('sha256').update(data).digest('hex').substring(0, 32)}`;
  }
  return null;
}

/**
 * Idempotency middleware factory
 *
 * @param {Object} options - Configuration options
 * @param {boolean} [options.autoGenerate=false] - Auto-generate key from request body if header missing
 * @param {string[]} [options.methods=['POST']] - HTTP methods to apply idempotency to
 * @returns {Function} Express middleware
 */
function createIdempotencyMiddleware(options = {}) {
  const {
    autoGenerate = false,
    methods = ['POST'],
  } = options;

  return async function idempotencyMiddleware(req, res, next) {
    // Only apply to specified methods
    if (!methods.includes(req.method)) {
      return next();
    }

    // Get idempotency key from header (opt-in)
    let idempotencyKey = req.headers[CONFIG.HEADER_NAME];

    // If no header and autoGenerate is enabled, try to generate from body
    if (!idempotencyKey && autoGenerate) {
      idempotencyKey = generateKeyFromRequest(req);
    }

    // If still no key, bypass middleware (opt-in behavior)
    if (!idempotencyKey) {
      return next();
    }

    // Prefix with route to avoid collisions across endpoints
    const storeKey = `${req.path}:${idempotencyKey}`;

    // Check if key exists
    const existing = idempotencyStore.get(storeKey);

    if (existing) {
      // Key exists - check status
      if (existing.status === 'complete') {
        // Return cached response
        logger.info('Idempotency: returning cached response', {
          key: idempotencyKey.substring(0, 16) + '...',
          path: req.path,
          age: Date.now() - existing.timestamp
        });

        // Set header to indicate this is a cached response
        res.set('X-Idempotency-Cached', 'true');
        return res.status(existing.httpStatus || 200).json(existing.response);
      }

      if (existing.status === 'pending') {
        // Request is still being processed - return 409 Conflict
        logger.warn('Idempotency: request still in progress', {
          key: idempotencyKey.substring(0, 16) + '...',
          path: req.path
        });
        return res.status(409).json({
          success: false,
          error_message: 'A request with this idempotency key is currently being processed'
        });
      }
    }

    // Enforce max store size
    if (idempotencyStore.size >= CONFIG.MAX_STORE_SIZE) {
      logger.warn('Idempotency store at capacity, bypassing', { size: idempotencyStore.size });
      return next();
    }

    // Mark as pending
    idempotencyStore.set(storeKey, {
      status: 'pending',
      timestamp: Date.now(),
    });

    // Capture the response
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      // Store the response for future identical requests
      idempotencyStore.set(storeKey, {
        status: 'complete',
        response: body,
        httpStatus: res.statusCode,
        timestamp: Date.now(),
      });

      logger.debug('Idempotency: stored response', {
        key: idempotencyKey.substring(0, 16) + '...',
        path: req.path,
        status: res.statusCode
      });

      return originalJson(body);
    };

    // Handle errors - clean up pending state
    res.on('finish', () => {
      const entry = idempotencyStore.get(storeKey);
      // If still pending after response finished (error case), remove it
      if (entry && entry.status === 'pending') {
        idempotencyStore.delete(storeKey);
      }
    });

    next();
  };
}

/**
 * Simple middleware that just checks idempotency without auto-generation
 * Use this for routes where you want strict opt-in behavior
 */
const idempotencyMiddleware = createIdempotencyMiddleware({ autoGenerate: false });

/**
 * Get current store stats (for monitoring)
 */
function getStoreStats() {
  let pending = 0;
  let complete = 0;

  for (const value of idempotencyStore.values()) {
    if (value.status === 'pending') pending++;
    else if (value.status === 'complete') complete++;
  }

  return {
    total: idempotencyStore.size,
    pending,
    complete,
    maxSize: CONFIG.MAX_STORE_SIZE,
  };
}

/**
 * Clear the store (for testing)
 */
function clearStore() {
  idempotencyStore.clear();
}

module.exports = {
  idempotencyMiddleware,
  createIdempotencyMiddleware,
  getStoreStats,
  clearStore,
  CONFIG,
};
