const axios = require('axios');
const config = require('../../config/gateway.config');
const logger = require('../../helpers/logger');
const createHttpError = require('http-errors');

/**
 * eInvoice API Service (Whitebooks) - Singleton Pattern with Token Management
 */
class EInvoiceService {
  constructor() {
    this.credentials = config.externalAPIs.einvoice.whitebooks;
    this.authToken = null;
    this.tokenExpiry = null;
    // STABILITY FIX: Mutex to prevent concurrent token refresh calls
    this._refreshPromise = null;

    logger.info('eInvoice service initialized', {
      url: this.credentials.url,
      gstin: this.credentials.gstin
    });
  }

  /**
   * Build headers for API requests (matching transport server pattern)
   */
  _buildHeaders(includeAuthToken = false) {
    const headers = {
      'accept': '*/*',
      'ip_address': this.credentials.ipAddress,
      'client_id': this.credentials.clientId,
      'client_secret': this.credentials.clientSecret,
      'username': this.credentials.username,
      'password': this.credentials.password,
      'gstin': this.credentials.gstin
    };

    if (includeAuthToken && this.authToken) {
      headers['auth-token'] = this.authToken;
    }

    return headers;
  }

  /**
   * Build query parameters for authentication requests
   * NOTE: Whitebooks /authenticate endpoint REQUIRES credentials in query params
   * This is an API limitation that cannot be changed
   */
  _buildAuthQueryParams() {
    return {
      email: this.credentials.email,
      username: this.credentials.username,
      password: this.credentials.password
    };
  }

  /**
   * Build query parameters for regular API requests (non-auth)
   * Only includes email and auth-token (credentials not needed after auth)
   */
  _buildQueryParams(includeAuthToken = false) {
    const params = {
      email: this.credentials.email
    };

    if (includeAuthToken && this.authToken) {
      params['auth-token'] = this.authToken;
    }

    return params;
  }

  /**
   * Check if current auth token is valid and not expired
   */
  isTokenValid() {
    if (!this.authToken || !this.tokenExpiry) {
      return false;
    }
    return new Date() < this.tokenExpiry;
  }

  /**
   * Authenticate with Whitebooks eInvoice API
   */
  async authenticate() {
    try {
      logger.info('Authenticating with Whitebooks eInvoice API');

      // NOTE: Whitebooks /authenticate endpoint REQUIRES credentials in query params
      const response = await axios({
        method: 'GET',
        url: `${this.credentials.url}/einvoice/authenticate`,
        headers: this._buildHeaders(false),
        params: this._buildAuthQueryParams(),  // Auth endpoint needs full credentials
        timeout: this.credentials.timeout
      });

      if (response.data?.data?.AuthToken) {
        this.authToken = response.data.data.AuthToken;
        this.tokenExpiry = new Date(response.data.data.TokenExpiry);

        logger.info('Whitebooks eInvoice authentication successful', {
          expiresAt: this.tokenExpiry
        });

        return {
          success: true,
          authToken: this.authToken,
          expiresAt: this.tokenExpiry
        };
      }

      throw new createHttpError.ServiceUnavailable(
        'eInvoice authentication failed: Invalid response structure'
      );
    } catch (error) {
      logger.error('eInvoice authentication error', {
        error: error.message,
        response: error.response?.data
      });
      throw new createHttpError.ServiceUnavailable(
        `eInvoice authentication failed: ${error.message}`
      );
    }
  }

  /**
   * Ensure service is authenticated before making API calls
   * STABILITY FIX: Uses mutex pattern to prevent concurrent refresh
   * When multiple requests arrive with expired token, only one auth call is made
   */
  async ensureAuthenticated() {
    if (this.isTokenValid()) {
      return;  // Token is valid, no refresh needed
    }

    // If refresh is already in progress, wait for it instead of starting another
    if (this._refreshPromise) {
      await this._refreshPromise;
      return;
    }

    // Start refresh and store the promise so concurrent callers can wait
    try {
      this._refreshPromise = this.authenticate();
      await this._refreshPromise;
    } finally {
      // Clear the promise so future calls can trigger refresh if needed
      this._refreshPromise = null;
    }
  }
}

// Singleton instance
let serviceInstance = null;

function getServiceInstance() {
  if (!serviceInstance) {
    serviceInstance = new EInvoiceService();
  }
  return serviceInstance;
}

/**
 * Generate eInvoice
 */
async function generateEInvoice(invoiceData) {
  try {
    const service = getServiceInstance();
    await service.ensureAuthenticated();

    const response = await axios.post(
      `${service.credentials.url}/einvoice/type/GENERATE/version/V1_03`,
      invoiceData,
      {
        headers: {
          ...service._buildHeaders(true),
          'Content-Type': 'application/json'
        },
        params: {
          email: service.credentials.email,
          'auth-token': service.authToken
        },
        timeout: service.credentials.timeout
      }
    );

    if (response.data.status_cd != 1) {
      const errorMessage = response.data.error?.message || response.data.status_desc || 'Unknown error';
      throw new createHttpError.BadRequest(`eInvoice generation failed: ${errorMessage}`);
    }

    logger.info('eInvoice generated successfully', { irn: response.data.data?.Irn });
    return response.data;
  } catch (error) {
    logger.error('Generate eInvoice error', {
      error: error.message,
      response: error.response?.data
    });
    throw error;
  }
}

/**
 * Cancel eInvoice
 */
async function cancelEInvoice(irn, cancelReason, cancelRemarks) {
  try {
    const service = getServiceInstance();
    await service.ensureAuthenticated();

    logger.info('Canceling eInvoice', { irn });

    const payload = {
      Irn: irn,
      CnlRsn: cancelReason,
      CnlRem: cancelRemarks
    };

    const response = await axios.post(
      `${service.credentials.url}/einvoice/type/CANCEL/version/V1_03`,
      payload,
      {
        headers: {
          ...service._buildHeaders(true),
          'Content-Type': 'application/json'
        },
        params: {
          email: service.credentials.email,
          'auth-token': service.authToken
        },
        timeout: service.credentials.timeout
      }
    );

    if (response.data.status_cd != 1) {
      const errorMessage = response.data.error?.message || response.data.status_desc || 'Unknown error';
      throw new createHttpError.BadRequest(`eInvoice cancellation failed: ${errorMessage}`);
    }

    logger.info('eInvoice cancelled successfully', { irn });
    return response.data;
  } catch (error) {
    logger.error('Cancel eInvoice error', {
      error: error.message,
      requestPayload: { Irn: irn, CnlRsn: cancelReason, CnlRem: cancelRemarks },
      response: error.response?.data,
      fullResponse: error.response?.data ? JSON.stringify(error.response.data) : null
    });
    throw error;
  }
}

/**
 * Get eInvoice by IRN
 */
async function getEInvoiceByIRN(irn) {
  try {
    const service = getServiceInstance();
    await service.ensureAuthenticated();

    logger.info('Getting eInvoice by IRN', { irn });

    const response = await axios.get(
      `${service.credentials.url}/einvoice/type/GETIRN/version/V1_03`,
      {
        headers: service._buildHeaders(true),
        params: {
          param1: irn,
          email: service.credentials.email,
          'auth-token': service.authToken
        },
        timeout: service.credentials.timeout
      }
    );

    if (response.data.status_cd != 1) {
      const errorMessage = response.data.error?.message || response.data.status_desc || 'eInvoice not found';
      throw new createHttpError.NotFound(errorMessage);
    }

    logger.info('eInvoice retrieved successfully by IRN', { irn });
    return response.data;
  } catch (error) {
    logger.error('Get eInvoice by IRN failed', {
      error: error.message,
      irn,
      response: error.response?.data
    });
    throw error;
  }
}

/**
 * Get eInvoice by document details
 */
async function getEInvoiceByDocDetails(docType, docNo, docDate) {
  try {
    const service = getServiceInstance();
    await service.ensureAuthenticated();

    logger.info('Getting eInvoice by document details', { docType, docNo, docDate });

    const response = await axios.get(
      `${service.credentials.url}/einvoice/type/GETIRNBYDOCDETAILS/version/V1_03`,
      {
        headers: {
          ...service._buildHeaders(true),
          docnum: docNo,
          docdate: docDate
        },
        params: {
          param1: docType,
          email: service.credentials.email,
          'auth-token': service.authToken
        },
        timeout: service.credentials.timeout
      }
    );

    if (response.data.status_cd != 1) {
      const errorMessage = response.data.error?.message || response.data.status_desc || 'eInvoice not found';
      throw new createHttpError.NotFound(errorMessage);
    }

    logger.info('eInvoice retrieved successfully by document details', { docType, docNo, docDate });
    return response.data;
  } catch (error) {
    logger.error('Get eInvoice by document details failed', {
      error: error.message,
      docType,
      docNo,
      docDate,
      response: error.response?.data
    });
    throw error;
  }
}

module.exports = {
  getServiceInstance,
  generateEInvoice,
  cancelEInvoice,
  getEInvoiceByIRN,
  getEInvoiceByDocDetails
};
