const { testConnection } = require('../helpers/dbhelper');
const logger = require('../helpers/logger');

/**
 * Health check endpoint
 */
exports.healthCheck = async (req, res) => {
  try {
    const dbStatus = await testConnection();
    
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'Central Gateway Service',
      database: dbStatus ? 'Connected' : 'Disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    logger.info('Health check performed', { status: health.status });
    
    return res.json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    return res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};
