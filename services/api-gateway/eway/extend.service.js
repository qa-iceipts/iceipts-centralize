const axios = require('axios');
const config = require('../../../config/gateway.config');
const logger = require('../../../helpers/logger');
const createHttpError = require('http-errors');

/**
 * Extend eWay Bill Validity Service (Whitebooks)
 */

/**
 * Extend eWay Bill validity
 */
async function extendEwayBill(extendData) {
  try {
    logger.info('Extending eWay Bill validity', { ewayBillNo: extendData.ewbNo });

    const credentials = config.externalAPIs.eway.whitebooks;
    
    // Authenticate first
    const whitebooksGenerate = require('./whitebooks-generate.service');
    const authToken = await whitebooksGenerate.authenticate();

    const response = await axios.post(
      `${credentials.url}/ewayapi/extendvalidity`,
      extendData,
      {
        params: {
          email: credentials.email
        },
        headers: {
          ip_address: credentials.ipAddress,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          gstin: credentials.gstin,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        timeout: credentials.timeout
      }
    );

    if (response.data.status_cd != 1 && response.data.status != 1) {
      throw new createHttpError.BadRequest(
        'eWay Bill extension failed: ' + (response.data.error?.message || 'Unknown error')
      );
    }

    logger.info('eWay Bill validity extended successfully', { ewayBillNo: extendData.ewbNo });
    return response.data;
  } catch (error) {
    logger.error('eWay Bill extension failed', {
      error: error.message,
      ewayBillNo: extendData.ewbNo
    });
    throw error;
  }
}

module.exports = {
  extendEwayBill
};
