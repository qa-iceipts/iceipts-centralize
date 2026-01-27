const createHttpError = require('http-errors');
const logger = require('../helpers/logger');
const einvoiceService = require('../services/api-gateway/einvoice.service');

/**
 * Generate eInvoice
 */
exports.generateEInvoice = async (req, res, next) => {
  try {
    const { invoiceData } = req.body;

    if (!invoiceData) {
      throw new createHttpError.BadRequest('invoiceData is required');
    }

    logger.info('Generating eInvoice', {
      docNo: invoiceData.DocDtls?.No,
      dispatcher: req.dispatcher?.dispatcherId
    });

    const result = await einvoiceService.generateEInvoice(invoiceData);
    
    return res.sendResponse(result, 'eInvoice generated successfully');
  } catch (error) {
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
    
    return res.sendResponse(result, 'eInvoice cancelled successfully');
  } catch (error) {
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
    
    return res.sendResponse(result, 'eInvoice retrieved successfully');
  } catch (error) {
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
    
    return res.sendResponse(result, 'eInvoice retrieved successfully');
  } catch (error) {
    logger.error('Get eInvoice by doc details error', {
      service: 'einvoice-controller',
      error: error.message
    });
    next(error);
  }
};
