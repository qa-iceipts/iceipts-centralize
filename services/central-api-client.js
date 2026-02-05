/**
 * Central API Client
 *
 * This module provides an abstraction layer for calling centralized API services.
 * It integrates retry logic, circuit breaker, and fallback mechanisms.
 *
 * USAGE (for dispatchers):
 *   const client = require('./central-api-client');
 *   const result = await client.validateVehicle('MH12AB1234', { dispatcherId: 'D001' });
 *
 * SAFETY:
 * - All methods have fallback support
 * - Uses circuit breaker to prevent cascade failures
 * - Retry logic for transient failures
 * - Does not change existing service behavior - additive only
 */

const axios = require('axios');
const config = require('../config/gateway.config');
const logger = require('../helpers/logger');
const { withRetry } = require('../utils/retry');
const { getCircuitBreaker } = require('./circuit-breaker');

/**
 * Configuration for central API client
 * Reads from gateway.config.js feature flags
 */
function getClientConfig() {
  return {
    enabled: config.features?.useCentralGateway || false,
    baseUrl: config.features?.centralGatewayUrl || 'http://localhost:5000',
    timeout: config.features?.centralGatewayTimeout || 45000,
    fallbackEnabled: config.features?.fallbackOnCentralFailure !== false,  // Default true
    retryEnabled: config.features?.retryEnabled !== false,  // Default true
    circuitBreakerEnabled: config.features?.circuitBreakerEnabled !== false,  // Default true
  };
}

/**
 * Build headers for central API requests
 * @param {Object} options - Request options
 * @returns {Object} - Headers object
 */
function buildHeaders(options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (options.dispatcherId) {
    headers['X-Dispatcher-ID'] = options.dispatcherId;
  }

  if (options.mineId) {
    headers['X-Mine-ID'] = options.mineId;
  }

  if (options.organizationId) {
    headers['X-Organization-ID'] = options.organizationId;
  }

  if (options.apiKey) {
    headers['X-API-Key'] = options.apiKey;
  }

  if (options.idempotencyKey) {
    headers['X-Idempotency-Key'] = options.idempotencyKey;
  }

  return headers;
}

/**
 * Make a request to the central API with retry and circuit breaker
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object} data - Request body
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - API response
 */
async function makeRequest(method, path, data = null, options = {}) {
  const clientConfig = getClientConfig();
  const url = `${clientConfig.baseUrl}${path}`;
  const circuitBreakerName = options.circuitBreakerName || 'central-api';

  const requestConfig = {
    method,
    url,
    headers: buildHeaders(options),
    timeout: options.timeout || clientConfig.timeout,
  };

  if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    requestConfig.data = data;
  }

  if (data && method.toUpperCase() === 'GET') {
    requestConfig.params = data;
  }

  // Wrap the request with retry if enabled
  const executeRequest = async () => {
    const response = await axios(requestConfig);
    return response.data;
  };

  // Apply retry wrapper
  const requestWithRetry = clientConfig.retryEnabled
    ? () => withRetry(executeRequest, {
        maxAttempts: 3,
        operationName: `${method} ${path}`
      })
    : executeRequest;

  // Apply circuit breaker if enabled
  if (clientConfig.circuitBreakerEnabled) {
    const breaker = getCircuitBreaker(circuitBreakerName, {
      failureThreshold: 5,
      resetTimeout: 30000
    });

    // If fallback is provided, use circuit breaker with fallback
    if (options.fallbackFn && clientConfig.fallbackEnabled) {
      return breaker.executeWithFallback(requestWithRetry, options.fallbackFn);
    }

    return breaker.execute(requestWithRetry);
  }

  // No circuit breaker - just execute with retry
  return requestWithRetry();
}

/**
 * Central API Client class
 * Provides methods for all supported external API operations
 */
class CentralAPIClient {
  constructor(defaultOptions = {}) {
    this.defaultOptions = defaultOptions;
  }

  /**
   * Merge options with defaults
   */
  _mergeOptions(options) {
    return { ...this.defaultOptions, ...options };
  }

  // ==================== VAHAN APIs ====================

  /**
   * Validate vehicle registration (RC)
   * @param {string} vehicleNumber - Vehicle registration number
   * @param {Object} [options] - Request options
   * @param {Function} [options.fallbackFn] - Fallback function if central fails
   * @returns {Promise<Object>}
   */
  async validateVehicle(vehicleNumber, options = {}) {
    const opts = this._mergeOptions(options);
    return makeRequest('POST', '/api/gateway/vahan/validate-vehicle', {
      vehicleNumber
    }, {
      ...opts,
      circuitBreakerName: 'vahan-vehicle'
    });
  }

  /**
   * Validate driving license (DL)
   * @param {string} dlNumber - Driving license number
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  async validateDL(dlNumber, options = {}) {
    const opts = this._mergeOptions(options);
    return makeRequest('POST', '/api/gateway/vahan/validate-dl', {
      dlNumber
    }, {
      ...opts,
      circuitBreakerName: 'vahan-dl'
    });
  }

  /**
   * Get vehicle by number
   * @param {string} vehicleNumber - Vehicle registration number
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  async getVehicle(vehicleNumber, options = {}) {
    const opts = this._mergeOptions(options);
    return makeRequest('GET', `/api/gateway/vahan/vehicle/${encodeURIComponent(vehicleNumber)}`, null, {
      ...opts,
      circuitBreakerName: 'vahan-vehicle'
    });
  }

  /**
   * Get driver by DL number
   * @param {string} dlNumber - Driving license number
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  async getDriver(dlNumber, options = {}) {
    const opts = this._mergeOptions(options);
    return makeRequest('GET', `/api/gateway/vahan/driver/${encodeURIComponent(dlNumber)}`, null, {
      ...opts,
      circuitBreakerName: 'vahan-dl'
    });
  }

  // ==================== eWay Bill APIs ====================

  /**
   * Generate eWay Bill
   * @param {Object} ewayData - eWay Bill data
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  async generateEwayBill(ewayData, options = {}) {
    const opts = this._mergeOptions(options);

    // Auto-generate idempotency key from document number if not provided
    if (!opts.idempotencyKey && ewayData.docNo) {
      opts.idempotencyKey = `eway-${ewayData.docNo}-${ewayData.fromGstin || ''}`;
    }

    return makeRequest('POST', '/api/gateway/eway/generate', {
      ewayData,
      dispatcherId: opts.dispatcherId,
      mineId: opts.mineId
    }, {
      ...opts,
      circuitBreakerName: 'eway-generate'
    });
  }

  /**
   * Cancel eWay Bill
   * @param {string} ewayBillNo - eWay Bill number
   * @param {number} cancelReason - Cancellation reason code
   * @param {string} cancelRemarks - Cancellation remarks
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  async cancelEwayBill(ewayBillNo, cancelReason, cancelRemarks, options = {}) {
    const opts = this._mergeOptions(options);

    // Auto-generate idempotency key
    if (!opts.idempotencyKey) {
      opts.idempotencyKey = `eway-cancel-${ewayBillNo}`;
    }

    return makeRequest('POST', '/api/gateway/eway/cancel', {
      ewayBillNo,
      cancelReason,
      cancelRemarks,
      dispatcherId: opts.dispatcherId,
      mineId: opts.mineId
    }, {
      ...opts,
      circuitBreakerName: 'eway-cancel'
    });
  }

  /**
   * Extend eWay Bill validity
   * @param {Object} extendData - Extension data
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  async extendEwayBill(extendData, options = {}) {
    const opts = this._mergeOptions(options);
    return makeRequest('POST', '/api/gateway/eway/extend', extendData, {
      ...opts,
      circuitBreakerName: 'eway-extend'
    });
  }

  // ==================== eInvoice APIs ====================

  /**
   * Generate eInvoice
   * @param {Object} invoiceData - Invoice data
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  async generateEInvoice(invoiceData, options = {}) {
    const opts = this._mergeOptions(options);

    // Auto-generate idempotency key from document number if not provided
    if (!opts.idempotencyKey && invoiceData.DocDtls?.No) {
      opts.idempotencyKey = `einvoice-${invoiceData.DocDtls.No}`;
    }

    return makeRequest('POST', '/api/gateway/einvoice/generate', invoiceData, {
      ...opts,
      circuitBreakerName: 'einvoice-generate'
    });
  }

  /**
   * Cancel eInvoice
   * @param {string} irn - Invoice Reference Number
   * @param {string} cancelReason - Cancellation reason code
   * @param {string} cancelRemarks - Cancellation remarks
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  async cancelEInvoice(irn, cancelReason, cancelRemarks, options = {}) {
    const opts = this._mergeOptions(options);

    // Auto-generate idempotency key
    if (!opts.idempotencyKey) {
      opts.idempotencyKey = `einvoice-cancel-${irn}`;
    }

    return makeRequest('POST', '/api/gateway/einvoice/cancel', {
      irn,
      cancelReason,
      cancelRemarks
    }, {
      ...opts,
      circuitBreakerName: 'einvoice-cancel'
    });
  }

  /**
   * Get eInvoice by IRN
   * @param {string} irn - Invoice Reference Number
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  async getEInvoiceByIRN(irn, options = {}) {
    const opts = this._mergeOptions(options);
    return makeRequest('GET', `/api/gateway/einvoice/irn/${encodeURIComponent(irn)}`, null, {
      ...opts,
      circuitBreakerName: 'einvoice-get'
    });
  }

  /**
   * Get eInvoice by document details
   * @param {string} docType - Document type
   * @param {string} docNo - Document number
   * @param {string} docDate - Document date
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>}
   */
  async getEInvoiceByDocDetails(docType, docNo, docDate, options = {}) {
    const opts = this._mergeOptions(options);
    return makeRequest('GET', '/api/gateway/einvoice/details', {
      docType,
      docNo,
      docDate
    }, {
      ...opts,
      circuitBreakerName: 'einvoice-get'
    });
  }
}

// Create default client instance
const defaultClient = new CentralAPIClient();

// Export both the class and a default instance
module.exports = {
  CentralAPIClient,
  defaultClient,

  // Convenience methods using default client
  validateVehicle: (vehicleNumber, options) => defaultClient.validateVehicle(vehicleNumber, options),
  validateDL: (dlNumber, options) => defaultClient.validateDL(dlNumber, options),
  getVehicle: (vehicleNumber, options) => defaultClient.getVehicle(vehicleNumber, options),
  getDriver: (dlNumber, options) => defaultClient.getDriver(dlNumber, options),
  generateEwayBill: (ewayData, options) => defaultClient.generateEwayBill(ewayData, options),
  cancelEwayBill: (ewayBillNo, cancelReason, cancelRemarks, options) =>
    defaultClient.cancelEwayBill(ewayBillNo, cancelReason, cancelRemarks, options),
  extendEwayBill: (extendData, options) => defaultClient.extendEwayBill(extendData, options),
  generateEInvoice: (invoiceData, options) => defaultClient.generateEInvoice(invoiceData, options),
  cancelEInvoice: (irn, cancelReason, cancelRemarks, options) =>
    defaultClient.cancelEInvoice(irn, cancelReason, cancelRemarks, options),
  getEInvoiceByIRN: (irn, options) => defaultClient.getEInvoiceByIRN(irn, options),
  getEInvoiceByDocDetails: (docType, docNo, docDate, options) =>
    defaultClient.getEInvoiceByDocDetails(docType, docNo, docDate, options),

  // Utility exports
  makeRequest,
  buildHeaders,
  getClientConfig,
};
