const logger = require('../../../helpers/logger');
const vahanClient = require('../vahan.client');
const { apiUsage } = require('../../../models');

/**
 * RC (Vehicle Registration Certificate) Validation Service
 */

async function validateRC(vehicleNumber, dispatcherId = 'system') {
  const startTime = Date.now();
  let status = 'error';
  let responseData = null;

  try {
    logger.info('Validating vehicle RC', { vehicleNumber });

    const response = await vahanClient.makeRequest('/rc/validate', 'POST', {
      vehicleNumber
    });

    status = 'success';
    responseData = response;
    logger.info('RC validation successful', { vehicleNumber });
    return response;
  } catch (error) {
    logger.error('RC validation failed', { error: error.message, vehicleNumber });
    responseData = { error: error.message };
    throw error;
  } finally {
    const responseTime = Date.now() - startTime;

    // Track API usage
    try {
      await apiUsage.create({
        dispatcherId,
        apiType: 'VAHAN',
        endpoint: '/rc/validate',
        status,
        responseTime,
        requestData: JSON.stringify({ vehicleNumber }),
        responseData: JSON.stringify(responseData)
      });
    } catch (logError) {
      logger.error('Failed to log API usage', { error: logError.message });
    }
  }
}

module.exports = {
  validateRC
};
