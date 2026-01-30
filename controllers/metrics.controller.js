const { apiUsage, sequelize } = require('../models');
const logger = require('../helpers/logger');
const createHttpError = require('http-errors');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Get API usage metrics
 */
exports.getMetrics = async (req, res, next) => {
  try {
    const { dispatcherId, apiType, startDate, endDate } = req.query;

    const where = {};
    
    if (dispatcherId) {
      where.dispatcherId = dispatcherId;
    }
    
    if (apiType) {
      where.apiType = apiType;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const metrics = await apiUsage.findAll({
      where,
      attributes: [
        'apiType',
        'dispatcherId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCalls'],
        [sequelize.fn('AVG', sequelize.col('responseTime')), 'avgResponseTime'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "success" THEN 1 ELSE 0 END')), 'successCount'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "error" THEN 1 ELSE 0 END')), 'errorCount']
      ],
      group: ['apiType', 'dispatcherId'],
      raw: true
    });

    logger.info('Metrics retrieved', { count: metrics.length });

    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Get metrics error', { error: error.message });
    next(error);
  }
};

/**
 * Get monthly VAHAN API usage (successful calls only)
 * Returns count of successful VAHAN API calls grouped by month
 */
exports.getMonthlyVahanUsage = async (req, res, next) => {
  try {
    const { year, dispatcherId } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const where = {
      apiType: 'VAHAN',
      status: 'success',
      createdAt: {
        [Op.gte]: new Date(`${targetYear}-01-01`),
        [Op.lt]: new Date(`${targetYear + 1}-01-01`)
      }
    };

    if (dispatcherId) {
      where.dispatcherId = dispatcherId;
    }

    // Group by month - using MySQL DATE_FORMAT
    const monthlyUsage = await apiUsage.findAll({
      where,
      attributes: [
        [fn('DATE_FORMAT', col('createdAt'), '%Y-%m'), 'month'],
        [fn('COUNT', col('id')), 'successfulCalls'],
        [fn('AVG', col('responseTime')), 'avgResponseTime'],
        'endpoint'
      ],
      group: [literal("DATE_FORMAT(createdAt, '%Y-%m')"), 'endpoint'],
      order: [[literal("DATE_FORMAT(createdAt, '%Y-%m')"), 'ASC']],
      raw: true
    });

    // Also get total summary
    const totalSummary = await apiUsage.findOne({
      where,
      attributes: [
        [fn('COUNT', col('id')), 'totalSuccessfulCalls'],
        [fn('AVG', col('responseTime')), 'avgResponseTime']
      ],
      raw: true
    });

    logger.info('Monthly VAHAN usage retrieved', {
      year: targetYear,
      monthCount: monthlyUsage.length
    });

    return res.json({
      success: true,
      data: {
        year: targetYear,
        monthly: monthlyUsage,
        summary: {
          totalSuccessfulCalls: parseInt(totalSummary.totalSuccessfulCalls) || 0,
          avgResponseTime: Math.round(totalSummary.avgResponseTime) || 0
        }
      }
    });
  } catch (error) {
    logger.error('Get monthly VAHAN usage error', { error: error.message });
    next(error);
  }
};

/**
 * Get detailed VAHAN API usage breakdown by endpoint
 */
exports.getVahanUsageByEndpoint = async (req, res, next) => {
  try {
    const { startDate, endDate, dispatcherId } = req.query;

    const where = {
      apiType: 'VAHAN',
      status: 'success'
    };

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (dispatcherId) {
      where.dispatcherId = dispatcherId;
    }

    const usageByEndpoint = await apiUsage.findAll({
      where,
      attributes: [
        'endpoint',
        [fn('COUNT', col('id')), 'callCount'],
        [fn('AVG', col('responseTime')), 'avgResponseTime'],
        [fn('MIN', col('createdAt')), 'firstCall'],
        [fn('MAX', col('createdAt')), 'lastCall']
      ],
      group: ['endpoint'],
      raw: true
    });

    logger.info('VAHAN usage by endpoint retrieved', {
      endpointCount: usageByEndpoint.length
    });

    return res.json({
      success: true,
      data: usageByEndpoint
    });
  } catch (error) {
    logger.error('Get VAHAN usage by endpoint error', { error: error.message });
    next(error);
  }
};
