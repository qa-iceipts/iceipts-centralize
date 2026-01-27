const axios = require('axios');
const config = require('../../config/gateway.config');
const logger = require('../../helpers/logger');
const createHttpError = require('http-errors');

/**
 * VAHAN API Client
 * Handles all VAHAN API interactions
 */
class VahanClient {
  constructor() {
    this.baseURL = config.externalAPIs.vahan.baseURL;
    this.timeout = config.externalAPIs.vahan.timeout;
    this.clientId = config.externalAPIs.vahan.clientId;
    this.clientSecret = config.externalAPIs.vahan.clientSecret;
  }

  /**
   * Get OAuth token
   */
  async getToken() {
    try {
      // Implementation for VAHAN OAuth token
      // This is a placeholder - implement actual VAHAN OAuth flow
      logger.info('Getting VAHAN OAuth token');
      
      // For now, return a mock token
      // TODO: Implement actual VAHAN token generation
      return 'vahan_token_placeholder';
    } catch (error) {
      logger.error('Failed to get VAHAN token', { error: error.message });
      throw new createHttpError.Unauthorized('Failed to authenticate with VAHAN API');
    }
  }

  /**
   * Make authenticated request to VAHAN API
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const token = await this.getToken();
      
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'client_id': this.clientId,
          'client_secret': this.clientSecret
        },
        data,
        timeout: this.timeout
      });

      return response.data;
    } catch (error) {
      logger.error('VAHAN API request failed', {
        endpoint,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new VahanClient();
