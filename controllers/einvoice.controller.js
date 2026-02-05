const createHttpError = require('http-errors');
const logger = require('../helpers/logger');
const einvoiceService = require('../services/api-gateway/einvoice.service');
const { trackApiCall, API_TYPES } = require('../services/apiStatsService');

/**
 * Generate eInvoice
 */
exports.generateEInvoice = async (req, res, next) => {
  try {
    const { invoiceData } = req.body;

    if (!invoiceData) {
      throw new createHttpError.BadRequest('invoiceData is required');
    }

    const result = await einvoiceService.generateEInvoice(invoiceData);

    // Track successful API call
    const mineId = req.dispatcher?.mineId;
    const orgId = req.dispatcher?.orgId;
    await trackApiCall(mineId, orgId, API_TYPES.EINVOICE_GENERATE, true);

    return res.sendResponse(result, 'eInvoice generated successfully');
  } catch (error) {
    // Track failed API call
    const mineId = req.dispatcher?.mineId;
    const orgId = req.dispatcher?.orgId;
    await trackApiCall(mineId, orgId, API_TYPES.EINVOICE_GENERATE, false);

    logger.error('Generate eInvoice error', {
      service: 'einvoice-controller',
      error: error.message
    });
    next(error);
  }
};

/**
 * Cancel eInvoice
 */
exports.cancelEInvoice = async (req, res, next) => {
  try {
    const { irn, cancelReason, cancelRemarks } = req.body;

    if (!irn || !cancelReason || !cancelRemarks) {
      throw new createHttpError.BadRequest('irn, cancelReason, and cancelRemarks are required');
    }

    const result = await einvoiceService.cancelEInvoice(irn, cancelReason, cancelRemarks);

    // Track successful API call
    const mineId = req.dispatcher?.mineId;
    const orgId = req.dispatcher?.orgId;
    await trackApiCall(mineId, orgId, API_TYPES.EINVOICE_CANCEL, true);

    return res.sendResponse(result, 'eInvoice cancelled successfully');
  } catch (error) {
    // Track failed API call
    const mineId = req.dispatcher?.mineId;
    const orgId = req.dispatcher?.orgId;
    await trackApiCall(mineId, orgId, API_TYPES.EINVOICE_CANCEL, false);

    logger.error('Cancel eInvoice error', {
      service: 'einvoice-controller',
      error: error.message
    });
    next(error);
  }
};

/**
 * Get eInvoice by IRN
 */
exports.getEInvoiceByIRN = async (req, res, next) => {
  try {
    const { irn } = req.params;

    if (!irn) {
      throw new createHttpError.BadRequest('irn is required');
    }

    const result = await einvoiceService.getEInvoiceByIRN(irn);

    // Track successful API call
    const mineId = req.dispatcher?.mineId;
    const orgId = req.dispatcher?.orgId;
    await trackApiCall(mineId, orgId, API_TYPES.EINVOICE_GET_IRN, true);

    return res.sendResponse(result, 'eInvoice retrieved successfully');
  } catch (error) {
    // Track failed API call
    const mineId = req.dispatcher?.mineId;
    const orgId = req.dispatcher?.orgId;
    await trackApiCall(mineId, orgId, API_TYPES.EINVOICE_GET_IRN, false);

    logger.error('Get eInvoice by IRN error', {
      service: 'einvoice-controller',
      error: error.message
    });
    next(error);
  }
};

/**
 * Get eInvoice by document details
 */
exports.getEInvoiceByDocDetails = async (req, res, next) => {
  try {
    const { docType, docNo, docDate } = req.query;

    if (!docType || !docNo || !docDate) {
      throw new createHttpError.BadRequest('docType, docNo, and docDate are required');
    }

    const result = await einvoiceService.getEInvoiceByDocDetails(docType, docNo, docDate);

    // Track successful API call
    const mineId = req.dispatcher?.mineId;
    const orgId = req.dispatcher?.orgId;
    await trackApiCall(mineId, orgId, API_TYPES.EINVOICE_GET_DETAILS, true);

    return res.sendResponse(result, 'eInvoice retrieved successfully');
  } catch (error) {
    // Track failed API call
    const mineId = req.dispatcher?.mineId;
    const orgId = req.dispatcher?.orgId;
    await trackApiCall(mineId, orgId, API_TYPES.EINVOICE_GET_DETAILS, false);

    logger.error('Get eInvoice by doc details error', {
      service: 'einvoice-controller',
      error: error.message
    });
    next(error);
  }
};
