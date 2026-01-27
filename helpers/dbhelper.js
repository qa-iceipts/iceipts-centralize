const db = require('../models');
const logger = require('./logger');

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await db.sequelize.authenticate();
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Unable to connect to database', { error: error.message });
    return false;
  }
}

/**
 * Sync database models
 */
async function syncDatabase(force = false) {
  try {
    await db.sequelize.sync({ force });
    // await db.staticVehicleData.sync({ alter: true })
    logger.info(`Database synced successfully ${force ? '(forced)' : ''}`);
    return true;
  } catch (error) {
    logger.error('Database sync failed', { error: error.message });
    return false;
  }
}

/**
 * Close database connection
 */
async function closeConnection() {
  try {
    await db.sequelize.close();
    logger.info('Database connection closed');
    return true;
  } catch (error) {
    logger.error('Error closing database connection', { error: error.message });
    return false;
  }
}

/**
 * Log API usage
 */
async function logAPIUsage(dispatcherId, apiType, endpoint, status, responseTime) {
  try {
    await db.apiUsage.create({
      dispatcherId,
      apiType,
      endpoint,
      status,
      responseTime
    });
  } catch (error) {
    logger.error('Failed to log API usage', { error: error.message });
  }
}

module.exports = {
  testConnection,
  syncDatabase,
  closeConnection,
  logAPIUsage
};
