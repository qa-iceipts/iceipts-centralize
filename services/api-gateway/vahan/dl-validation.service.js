const logger = require('../../../helpers/logger');
const vahanClient = require('../vahan.client');
const { apiUsage } = require('../../../models');

/**
 * DL (Driving License) Validation Service
 */

async function validateDL(dlNumber, dispatcherId = 'system') {
  const startTime = Date.now();
  let status = 'error';
  let responseData = null;

  try {
    logger.info('Validating driving license', { dlNumber });

    const response = await vahanClient.makeRequest('/dl/validate', 'POST', {
      dlNumber
    });

    status = 'success';
    responseData = response;
    logger.info('DL validation successful', { dlNumber });
    return response;
  } catch (error) {
    logger.error('DL validation failed', { error: error.message, dlNumber });
    responseData = { error: error.message };
    throw error;
  } finally {
    const responseTime = Date.now() - startTime;

    // Track API usage
    try {
      await apiUsage.create({
        dispatcherId,
        apiType: 'VAHAN',
        endpoint: '/dl/validate',
        status,
        responseTime,
        requestData: JSON.stringify({ dlNumber }),
        responseData: JSON.stringify(responseData)
      });
    } catch (logError) {
      logger.error('Failed to log API usage', { error: logError.message });
    }
  }
}

module.exports = {
  validateDL
};
