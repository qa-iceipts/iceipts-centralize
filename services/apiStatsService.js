const db = require('../models');

/**
 * API Types for tracking
 */
const API_TYPES = {
  // VAHAN APIs
  VAHAN_VEHICLE: 'vahan_vehicle',
  VAHAN_DL: 'vahan_dl',
  // eWay APIs
  EWAY_GENERATE: 'eway_generate',
  EWAY_CANCEL: 'eway_cancel',
  EWAY_EXTEND: 'eway_extend',
  // eInvoice APIs
  EINVOICE_GENERATE: 'einvoice_generate',
  EINVOICE_CANCEL: 'einvoice_cancel',
  EINVOICE_GET_IRN: 'einvoice_get_irn',
  EINVOICE_GET_DETAILS: 'einvoice_get_details',
};

/**
 * Track an API call
 * @param {string} mineId - The mine ID
 * @param {string} orgId - The organization ID (optional)
 * @param {string} apiType - Type of API call (use API_TYPES constants)
 * @param {boolean} success - Whether the API call was successful
 */
async function trackApiCall(mineId, orgId, apiType, success = true) {
  try {
    if (!mineId) {
      console.log('[API Stats] No mineId provided, skipping tracking');
      return null;
    }

    const now = new Date();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    const year = now.getFullYear();

    // Find or create the stats record
    const [stats, created] = await db.apiCallStats.findOrCreate({
      where: {
        mineId,
        apiType,
        month,
        year
      },
      defaults: {
        mineId,
        orgId,
        apiType,
        month,
        year,
        count: 0,
        successCount: 0,
        failureCount: 0
      }
    });

    // Increment counters
    await stats.increment('count');
    if (success) {
      await stats.increment('successCount');
    } else {
      await stats.increment('failureCount');
    }

    console.log(`[API Stats] Tracked ${apiType} call for mine ${mineId} (success: ${success})`);
    return stats;
  } catch (error) {
    // Don't throw - stats tracking should not break the main flow
    console.error('[API Stats] Error tracking API call:', error.message);
    return null;
  }
}

/**
 * Get API stats for a mine
 * @param {string} mineId - The mine ID
 * @param {number} month - Month (optional, defaults to current month)
 * @param {number} year - Year (optional, defaults to current year)
 */
async function getStatsForMine(mineId, month = null, year = null) {
  try {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const stats = await db.apiCallStats.findAll({
      where: {
        mineId,
        month: targetMonth,
        year: targetYear
      },
      order: [['apiType', 'ASC']]
    });

    return stats;
  } catch (error) {
    console.error('[API Stats] Error getting stats:', error.message);
    return [];
  }
}

/**
 * Get all API stats (for admin/reporting)
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 */
async function getAllStats(month = null, year = null) {
  try {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const stats = await db.apiCallStats.findAll({
      where: {
        month: targetMonth,
        year: targetYear
      },
      order: [['mineId', 'ASC'], ['apiType', 'ASC']]
    });

    return stats;
  } catch (error) {
    console.error('[API Stats] Error getting all stats:', error.message);
    return [];
  }
}

/**
 * Get summary stats grouped by mine
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 */
async function getStatsSummaryByMine(month = null, year = null) {
  try {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const stats = await db.apiCallStats.findAll({
      where: {
        month: targetMonth,
        year: targetYear
      },
      attributes: [
        'mineId',
        [db.Sequelize.fn('SUM', db.Sequelize.col('count')), 'totalCalls'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('successCount')), 'totalSuccess'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('failureCount')), 'totalFailure']
      ],
      group: ['mineId'],
      order: [[db.Sequelize.fn('SUM', db.Sequelize.col('count')), 'DESC']]
    });

    return stats;
  } catch (error) {
    console.error('[API Stats] Error getting summary:', error.message);
    return [];
  }
}

module.exports = {
  API_TYPES,
  trackApiCall,
  getStatsForMine,
  getAllStats,
  getStatsSummaryByMine
};
