/**
 * Lightweight Circuit Breaker for External API Calls
 *
 * STATES:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests fail fast (or use fallback)
 * - HALF-OPEN: Testing if service recovered
 *
 * CRITICAL: This circuit breaker is FAIL-OPEN by default
 * If the circuit breaker itself errors, requests pass through normally
 * This ensures core flows are never blocked by the circuit breaker
 *
 * USAGE:
 *   const breaker = new CircuitBreaker({ name: 'whitebooks-eway' });
 *   const result = await breaker.execute(
 *     () => apiCall(),
 *     () => fallbackCall()  // optional
 *   );
 */

const logger = require('../helpers/logger');

// Circuit states
const STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

/**
 * Default configuration
 */
const DEFAULT_OPTIONS = {
  failureThreshold: 5,        // Number of failures before opening circuit
  successThreshold: 2,        // Successes in HALF_OPEN to close circuit
  timeout: 30000,             // Request timeout (ms)
  resetTimeout: 30000,        // Time to wait before trying again (ms)
  volumeThreshold: 5,         // Minimum requests before calculating failure rate
  failureRateThreshold: 50,   // Percentage of failures to trip circuit
};

class CircuitBreaker {
  /**
   * Create a new circuit breaker
   * @param {Object} options - Configuration options
   * @param {string} options.name - Name for logging
   * @param {number} [options.failureThreshold=5] - Failures before opening
   * @param {number} [options.successThreshold=2] - Successes to close from half-open
   * @param {number} [options.resetTimeout=30000] - Time before half-open attempt
   */
  constructor(options = {}) {
    this.name = options.name || 'unnamed';
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // State
    this.state = STATES.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.totalRequests = 0;
    this.totalFailures = 0;

    // Stats for monitoring
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      fallbackCalls: 0,
      stateChanges: [],
    };
  }

  /**
   * Check if circuit should allow request
   * @returns {boolean}
   */
  canRequest() {
    if (this.state === STATES.CLOSED) {
      return true;
    }

    if (this.state === STATES.OPEN) {
      // Check if reset timeout has passed
      const now = Date.now();
      if (this.lastFailureTime && (now - this.lastFailureTime) >= this.options.resetTimeout) {
        this._transitionTo(STATES.HALF_OPEN);
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow one request to test
    return true;
  }

  /**
   * Record a successful call
   */
  recordSuccess() {
    this.stats.successfulCalls++;

    if (this.state === STATES.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this._transitionTo(STATES.CLOSED);
      }
    } else if (this.state === STATES.CLOSED) {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  /**
   * Record a failed call
   */
  recordFailure() {
    this.stats.failedCalls++;
    this.failures++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === STATES.HALF_OPEN) {
      // Any failure in half-open trips back to open
      this._transitionTo(STATES.OPEN);
    } else if (this.state === STATES.CLOSED) {
      // Check if we should trip the circuit
      if (this.failures >= this.options.failureThreshold) {
        this._transitionTo(STATES.OPEN);
      }
    }
  }

  /**
   * Transition to a new state
   * @param {string} newState
   */
  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;

    // Reset counters on state change
    if (newState === STATES.CLOSED) {
      this.failures = 0;
      this.successes = 0;
    } else if (newState === STATES.HALF_OPEN) {
      this.successes = 0;
    }

    // Log state change
    logger.info('Circuit breaker state change', {
      name: this.name,
      from: oldState,
      to: newState,
      failures: this.failures,
      totalFailures: this.totalFailures
    });

    // Track state changes for monitoring
    this.stats.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: Date.now()
    });

    // Keep only last 10 state changes
    if (this.stats.stateChanges.length > 10) {
      this.stats.stateChanges.shift();
    }
  }

  /**
   * Execute a function with circuit breaker protection
   * IMPORTANT: This is FAIL-OPEN - if circuit breaker errors, request passes through
   *
   * @param {Function} fn - Async function to execute
   * @param {Function} [fallbackFn] - Optional fallback if circuit is open
   * @returns {Promise<any>} - Result of fn or fallbackFn
   */
  async execute(fn, fallbackFn = null) {
    this.stats.totalCalls++;
    this.totalRequests++;

    try {
      // Check if circuit allows request
      if (!this.canRequest()) {
        this.stats.rejectedCalls++;

        // If fallback provided, use it
        if (fallbackFn) {
          logger.debug('Circuit open, using fallback', { name: this.name });
          this.stats.fallbackCalls++;
          return await fallbackFn();
        }

        // FAIL-OPEN: If no fallback, let the request through anyway
        // This ensures we never block core business flows
        logger.warn('Circuit open but no fallback, allowing request (fail-open)', {
          name: this.name,
          state: this.state
        });
      }

      // Execute the function
      const result = await fn();
      this.recordSuccess();
      return result;

    } catch (error) {
      this.recordFailure();

      // If circuit just opened and fallback exists, try fallback
      if (this.state === STATES.OPEN && fallbackFn) {
        logger.debug('Request failed, circuit open, trying fallback', { name: this.name });
        this.stats.fallbackCalls++;
        return await fallbackFn();
      }

      // Re-throw the error
      throw error;
    }
  }

  /**
   * Execute with automatic fallback to direct call
   * Useful when wrapping centralized API calls that should fall back to direct
   *
   * @param {Function} primaryFn - Primary function (e.g., central API call)
   * @param {Function} fallbackFn - Fallback function (e.g., direct API call)
   * @returns {Promise<any>}
   */
  async executeWithFallback(primaryFn, fallbackFn) {
    return this.execute(primaryFn, fallbackFn);
  }

  /**
   * Get current circuit breaker stats
   * @returns {Object}
   */
  getStats() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      ...this.stats,
      config: this.options
    };
  }

  /**
   * Force reset the circuit breaker (for testing/manual intervention)
   */
  reset() {
    this._transitionTo(STATES.CLOSED);
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
  }

  /**
   * Check if circuit is currently open
   * @returns {boolean}
   */
  isOpen() {
    return this.state === STATES.OPEN;
  }

  /**
   * Check if circuit is currently closed (healthy)
   * @returns {boolean}
   */
  isClosed() {
    return this.state === STATES.CLOSED;
  }
}

/**
 * Registry of circuit breakers for different services
 * Allows sharing circuit breaker state across the application
 */
const circuitBreakerRegistry = new Map();

/**
 * Get or create a circuit breaker for a service
 * @param {string} name - Service name
 * @param {Object} [options] - Options (only used on first creation)
 * @returns {CircuitBreaker}
 */
function getCircuitBreaker(name, options = {}) {
  if (!circuitBreakerRegistry.has(name)) {
    circuitBreakerRegistry.set(name, new CircuitBreaker({ name, ...options }));
  }
  return circuitBreakerRegistry.get(name);
}

/**
 * Get stats for all circuit breakers
 * @returns {Object}
 */
function getAllStats() {
  const stats = {};
  for (const [name, breaker] of circuitBreakerRegistry.entries()) {
    stats[name] = breaker.getStats();
  }
  return stats;
}

module.exports = {
  CircuitBreaker,
  getCircuitBreaker,
  getAllStats,
  STATES,
  DEFAULT_OPTIONS,
};
