const generateService = require('../services/api-gateway/eway/generate.service');
const whitebooksGenerateService = require('../services/api-gateway/eway/whitebooks-generate.service');
const cancelService = require('../services/api-gateway/eway/cancel.service');
const extendService = require('../services/api-gateway/eway/extend.service');
const logger = require('../helpers/logger');
const createHttpError = require('http-errors');

/**
 * Generate eWay Bill
 * Supports both NIC eWay (with isMasterEway=true) and Whitebooks eWay (with isMasterEway=false or not provided)
 */
exports.generateEwayBill = async (req, res, next) => {
  try {
    const { ewayData, dispatcherId, mineId, isMasterEway } = req.body;
    if (!ewayData) {
      throw new createHttpError.BadRequest('ewayData is required');
    }

    let result;

    // If isMasterEway is false or not provided, use Whitebooks API
    // If isMasterEway is true, use NIC eWay API (ASP with encryption)
    if (!isMasterEway) {
      // Whitebooks eWay Bill (default)
      result = await whitebooksGenerateService.generateEwayBill({
        ewayData,
        dispatcherId: dispatcherId || req.dispatcher?.id,
        mineId: mineId || req.dispatcher?.mineId
      });
    } else {
      // NIC eWay Bill (ASP with encryption)
      result = await generateService.generateEwayBill({
        ewayData,
        dispatcherId: dispatcherId || req.dispatcher?.id,
        mineId: mineId || req.dispatcher?.mineId
      });
    }

    res.status(200).json({
      success: true,
      message: 'eWay Bill generated successfully',
      provider: isMasterEway ? 'NIC' : 'Whitebooks',
      ...result
    });
  } catch (error) {
    logger.error('eWay Bill generation controller error', {
      service: 'eway-controller',
      error: error.message,
      isMasterEway: req.body.isMasterEway
    });
    next(error);
  }
};

/**
 * Cancel eWay Bill
 * Supports both NIC eWay and Whitebooks eWay
 */
exports.cancelEwayBill = async (req, res, next) => {
  try {
    const { ewayBillNo, cancelReason, cancelRemarks, dispatcherId, mineId, isMasterEway } = req.body;

    if (!ewayBillNo || !cancelReason) {
      throw new createHttpError.BadRequest('ewayBillNo and cancelReason are required');
    }

    let result;

    if (!isMasterEway) {
      // Whitebooks eWay Bill cancellation
      result = await whitebooksGenerateService.cancelEwayBill({
        ewayBillNo,
        cancelReason,
        cancelRemarks,
        dispatcherId: dispatcherId || req.dispatcher?.id,
        mineId: mineId || req.dispatcher?.mineId
      });
    } else {
      // NIC eWay Bill cancellation
      result = await cancelService.cancelEwayBill({
        ewayBillNo,
        cancelReason,
        cancelRemarks,
        dispatcherId: dispatcherId || req.dispatcher?.id,
        mineId: mineId || req.dispatcher?.mineId
      });
    }

    res.status(200).json({
      success: true,
      message: 'eWay Bill cancelled successfully',
      provider: isMasterEway ? 'NIC' : 'Whitebooks',
      ...result
    });
  } catch (error) {
    logger.error('eWay Bill cancellation controller error', {
      service: 'eway-controller',
      error: error.message,
      isMasterEway: req.body.isMasterEway
    });
    next(error);
  }
};

/**
 * Extend eWay Bill
 */
exports.extendEwayBill = async (req, res, next) => {
  try {
    const { ewayBillNo, extensionData, dispatcherId, mineId } = req.body;

    if (!ewayBillNo || !extensionData) {
      throw new createHttpError.BadRequest('ewayBillNo and extensionData are required');
    }

    const result = await extendService.extendEwayBill({
      ewayBillNo,
      extensionData,
      dispatcherId: dispatcherId || req.dispatcher?.id,
      mineId: mineId || req.dispatcher?.mineId
    });

    res.status(200).json({
      success: true,
      message: 'eWay Bill extended successfully',
      ...result
    });
  } catch (error) {
    logger.error('eWay Bill extension controller error', {
      service: 'eway-controller',
      error: error.message
    });
    next(error);
  }
};
