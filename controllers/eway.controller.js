const createHttpError = require('http-errors');
const logger = require('../helpers/logger');
const Joi = require('joi');
const nicGenerate = require('../services/api-gateway/eway/generate.service');
const whitebooksGenerate = require('../services/api-gateway/eway/whitebooks-generate.service');
const cancelService = require('../services/api-gateway/eway/cancel.service');
const extendService = require('../services/api-gateway/eway/extend.service');

/**
 * eWay Bill validation schema
 */
const ewayBillSchema = Joi.object({
  supplyType: Joi.string().required(),
  docType: Joi.string().required(),
  docNo: Joi.string().required(),
  docDate: Joi.string().required(),
  fromGstin: Joi.string().required(),
  toGstin: Joi.string().required(),
  totalValue: Joi.number().required(),
  totInvValue: Joi.number().required(),
  vehicleNo: Joi.string().required(),
  itemList: Joi.array().min(1).required()
}).unknown(true);

/**
 * Generate eWay Bill
 */
exports.generateEwayBill = async (req, res, next) => {
  try {
    const { ewayData, isMasterEway } = req.body;

    if (!ewayData) {
      throw new createHttpError.BadRequest('ewayData is required');
    }

    // Validate ewayData
    const { error } = ewayBillSchema.validate(ewayData);
    if (error) {
      throw new createHttpError.BadRequest(`JSON validation failed: ${error.message}`);
    }

    logger.info('Generating eWay Bill', {
      docNo: ewayData.docNo,
      provider: isMasterEway ? 'NIC' : 'Whitebooks',
      dispatcher: req.dispatcher?.dispatcherId
    });

    let result;
    if (isMasterEway) {
      result = await nicGenerate.generateEwayBill(ewayData);
    } else {
      result = await whitebooksGenerate.generateEwayBill(ewayData);
    }

    return res.sendResponse(result, 'eWay Bill generated successfully');
  } catch (error) {
    logger.error('Generate eWay Bill error', {
      service: 'eway-controller',
      error: error.message
    });
    next(error);
  }
};

/**
 * Cancel eWay Bill
 */
exports.cancelEwayBill = async (req, res, next) => {
  try {
    const { ewayBillNo, cancelRsnCode, cancelRmrk } = req.body;

    if (!ewayBillNo || !cancelRsnCode || !cancelRmrk) {
      throw new createHttpError.BadRequest('ewayBillNo, cancelRsnCode, and cancelRmrk are required');
    }

    const result = await cancelService.cancelEwayBill(ewayBillNo, cancelRsnCode, cancelRmrk);
    
    return res.sendResponse(result, 'eWay Bill cancelled successfully');
  } catch (error) {
    logger.error('Cancel eWay Bill error', {
      service: 'eway-controller',
      error: error.message
    });
    next(error);
  }
};

/**
 * Extend eWay Bill validity
 */
exports.extendEwayBill = async (req, res, next) => {
  try {
    const extendData = req.body;

    if (!extendData.ewbNo) {
      throw new createHttpError.BadRequest('ewbNo is required');
    }

    const result = await extendService.extendEwayBill(extendData);
    
    return res.sendResponse(result, 'eWay Bill validity extended successfully');
  } catch (error) {
    logger.error('Extend eWay Bill error', {
      service: 'eway-controller',
      error: error.message
    });
    next(error);
  }
};
