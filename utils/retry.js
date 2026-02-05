/**
 * Generic Retry Wrapper for External API Calls
 *
 * USAGE:
 *   const { withRetry } = require('../utils/retry');
 *   const result = await withRetry(() => axios.post(url, data), { maxAttempts: 3 });
 *
 * SAFETY:
 * - Does NOT retry on validation errors (4xx except 429)
 * - Uses exponential backoff to prevent thundering herd
 * - Preserves original error if all retries fail
 * - Zero dependencies beyond Node.js built-ins
 */

const logger = require('../helpers/logger');

/**
 * Default configuration for retry behavior
 */
const DEFAULT_OPTIONS = {
  maxAttempts: 3,           // Total attempts (1 initial + 2 retries)
  baseDelayMs: 1000,        // Initial delay: 1 second
  maxDelayMs: 10000,        // Cap delay at 10 seconds
  retryableStatusCodes: [   // HTTP status codes that should trigger retry
    408,  // Request Timeout
    429,  // Too Many Requests (rate limited)
    500,  // Internal Server Error
    502,  // Bad Gateway
    503,  // Service Unavailable
    504,  // Gateway Timeout
  ],
  // Errors that indicate network issues (should retry)
  retryableErrorCodes: [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
    'EHOSTUNREACH',
  ],
};

/**
 * Check if an error should trigger a retry
 * @param {Error} error - The error to check
 * @param {Object} options - Retry options
 * @returns {boolean} - Whether to retry
 */
function shouldRetry(error, options) {
  // Check for network-level errors (no response received)
  if (error.code && options.retryableErrorCodes.includes(error.code)) {
    return true;
  }

  // Check for HTTP response errors
  if (error.response) {
    const status = error.response.status;

    // NEVER retry client errors (4xx) except 429 (rate limited)
    // These are validation errors that won't succeed on retry
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }

    // Retry if status is in retryable list
    return options.retryableStatusCodes.includes(status);
  }

  // For errors without response (network failures), retry
  if (error.request && !error.response) {
    return true;
  }

  // Default: don't retry unknown errors
  return false;
}

/**
 * Calculate delay for next retry using exponential backoff with jitter
 * @param {number} attempt - Current attempt number (1-based)
 * @param {Object} options - Retry options
 * @returns {number} - Delay in milliseconds
 */
function calculateDelay(attempt, options) {
  // Exponential backoff: baseDelay * 2^(attempt-1)
  const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt - 1);

  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, options.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with automatic retry on transient failures
 *
 * @param {Function} fn - Async function to execute (should return a Promise)
 * @param {Object} [options] - Retry configuration
 * @param {number} [options.maxAttempts=3] - Maximum number of attempts
 * @param {number} [options.baseDelayMs=1000] - Base delay between retries
 * @param {number} [options.maxDelayMs=10000] - Maximum delay between retries
 * @param {string} [options.operationName] - Name for logging purposes
 * @returns {Promise<any>} - Result of the function
 * @throws {Error} - Last error if all retries fail
 *
 * @example
 * // Basic usage
 * const result = await withRetry(() => axios.get('/api/data'));
 *
 * @example
 * // With custom options
 * const result = await withRetry(
 *   () => externalApiCall(params),
 *   { maxAttempts: 5, operationName: 'fetchVehicleData' }
 * );
 */
async function withRetry(fn, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      // Execute the function
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt < opts.maxAttempts && shouldRetry(error, opts)) {
        const delay = calculateDelay(attempt, opts);

        // Log retry attempt (without sensitive data)
        logger.warn('API call failed, retrying', {
          operation: opts.operationName || 'unknown',
          attempt,
          maxAttempts: opts.maxAttempts,
          delayMs: Math.round(delay),
          errorCode: error.code || error.response?.status || 'unknown',
          errorMessage: error.message?.substring(0, 100)  // Truncate for safety
        });

        await sleep(delay);
      } else {
        // Don't retry - either max attempts reached or non-retryable error
        if (attempt < opts.maxAttempts) {
          logger.debug('API call failed, not retrying (non-retryable error)', {
            operation: opts.operationName || 'unknown',
            attempt,
            errorCode: error.code || error.response?.status || 'unknown'
          });
        }
        break;
      }
    }
  }

  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Create a wrapped version of a function that automatically retries
 * Useful for wrapping existing service methods without modifying them
 *
 * @param {Function} fn - Function to wrap
 * @param {Object} [options] - Retry options
 * @returns {Function} - Wrapped function with retry logic
 *
 * @example
 * const originalFetch = service.fetchData;
 * service.fetchData = wrapWithRetry(originalFetch.bind(service), { maxAttempts: 3 });
 */
function wrapWithRetry(fn, options = {}) {
  return async function (...args) {
    return withRetry(() => fn(...args), options);
  };
}

module.exports = {
  withRetry,
  wrapWithRetry,
  DEFAULT_OPTIONS,
  // Export for testing
  shouldRetry,
  calculateDelay,
};
