const axios = require('axios');
const config = require('../../../config/gateway.config');
const logger = require('../../../helpers/logger');
const createHttpError = require('http-errors');

/**
 * Cancel eWay Bill Service (Whitebooks)
 */

/**
 * Cancel eWay Bill
 */
async function cancelEwayBill(ewayBillNo, cancelRsnCode, cancelRmrk) {
  try {
    logger.info('Canceling eWay Bill', { ewayBillNo });

    const credentials = config.externalAPIs.eway.whitebooks;
    
    // Authenticate first
    const whitebooksGenerate = require('./whitebooks-generate.service');
    const authToken = await whitebooksGenerate.authenticate();

    const payload = {
      ewbNo: parseInt(ewayBillNo),
      cancelRsnCode: parseInt(cancelRsnCode),
      cancelRmrk: cancelRmrk
    };

    const response = await axios.post(
      `${credentials.url}/ewayapi/canewb`,
      payload,
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

    if (response.data.status_cd != 1) {
      throw new createHttpError.BadRequest(
        'eWay Bill cancellation failed: ' + (response.data.error?.message || 'Unknown error')
      );
    }

    logger.info('eWay Bill cancelled successfully', { ewayBillNo });
    return response.data;
  } catch (error) {
    logger.error('eWay Bill cancellation failed', {
      error: error.message,
      ewayBillNo
    });
    throw error;
  }
}

module.exports = {
  cancelEwayBill
};
