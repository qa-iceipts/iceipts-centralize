const axios = require('axios');
const config = require('../../config/gateway.config');
const logger = require('../../helpers/logger');

/**
 * eWay Bill API Client
 * Factory to get the correct provider client (NIC or Whitebooks)
 */
class EwayClient {
  /**
   * Get the appropriate eWay Bill client based on provider
   */
  getClient(isMasterEway = false) {
    if (isMasterEway) {
      // NIC eWay Bill
      return {
        url: config.externalAPIs.eway.nic.url,
        credentials: config.externalAPIs.eway.nic,
        provider: 'NIC'
      };
    } else {
      // Whitebooks eWay Bill
      return {
        url: config.externalAPIs.eway.whitebooks.url,
        credentials: config.externalAPIs.eway.whitebooks,
        provider: 'WHITEBOOKS'
      };
    }
  }

  /**
   * Make request to eWay Bill API
   */
  async makeRequest(endpoint, method, data, isMasterEway = false) {
    const client = this.getClient(isMasterEway);
    
    logger.info(`Making ${client.provider} eWay Bill API request`, {
      endpoint,
      method
    });

    try {
      const response = await axios({
        method,
        url: `${client.url}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: client.credentials.timeout
      });

      return response.data;
    } catch (error) {
      logger.error(`${client.provider} eWay Bill API error`, {
        endpoint,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new EwayClient();
