const axios = require('axios');
const config = require('../../config/gateway.config');
const logger = require('../../helpers/logger');
const createHttpError = require('http-errors');

/**
 * eInvoice API Service (Whitebooks)
 */

/**
 * Authenticate with Whitebooks eInvoice API
 */
async function authenticate() {
  try {
    const credentials = config.externalAPIs.einvoice.whitebooks;
    
    const response = await axios.get(
      `${credentials.url}/irnapi/v1.03/authenticate`,
      {
        params: {
          email: credentials.email,
          username: credentials.username,
          password: credentials.password
        },
        headers: {
          ip_address: credentials.ipAddress,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          gstin: credentials.gstin,
          Accept: 'application/json'
        },
        timeout: credentials.timeout
      }
    );

    if (response.data.status_cd != 1) {
      throw new Error('Whitebooks eInvoice authentication failed: ' + response.data.status_desc);
    }

    logger.info('Whitebooks eInvoice authentication successful');
    return response.data.data.AuthToken;
  } catch (error) {
    logger.error('Whitebooks eInvoice authentication failed', { error: error.message });
    throw new createHttpError.Unauthorized('Failed to authenticate with Whitebooks eInvoice API');
  }
}

/**
 * Generate eInvoice
 */
async function generateEInvoice(invoiceData) {
  try {
    logger.info('Generating eInvoice', { docNo: invoiceData.DocDtls?.No });

    const credentials = config.externalAPIs.einvoice.whitebooks;
    const authToken = await authenticate();

    const response = await axios.post(
      `${credentials.url}/irnapi/genirn`,
      invoiceData,
      {
        params: {
          email: credentials.email
        },
        headers: {
          ip_address: credentials.ipAddress,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          gstin: credentials.gstin,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        timeout: credentials.timeout
      }
    );

    if (response.data.status_cd != 1) {
      throw new createHttpError.BadRequest(
        'eInvoice generation failed: ' + (response.data.error?.message || 'Unknown error')
      );
    }

    logger.info('eInvoice generated successfully', { irn: response.data.data?.Irn });
    return response.data;
  } catch (error) {
    logger.error('eInvoice generation failed', { error: error.message });
    throw error;
  }
}

/**
 * Cancel eInvoice
 */
async function cancelEInvoice(irn, cancelReason, cancelRemarks) {
  try {
    logger.info('Canceling eInvoice', { irn });

    const credentials = config.externalAPIs.einvoice.whitebooks;
    const authToken = await authenticate();

    const payload = {
      Irn: irn,
      CnlRsn: cancelReason,
      CnlRem: cancelRemarks
    };

    const response = await axios.post(
      `${credentials.url}/irnapi/cancelirn`,
      payload,
      {
        params: {
          email: credentials.email
        },
        headers: {
          ip_address: credentials.ipAddress,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          gstin: credentials.gstin,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        timeout: credentials.timeout
      }
    );

    if (response.data.status_cd != 1) {
      throw new createHttpError.BadRequest(
        'eInvoice cancellation failed: ' + (response.data.error?.message || 'Unknown error')
      );
    }

    logger.info('eInvoice cancelled successfully', { irn });
    return response.data;
  } catch (error) {
    logger.error('eInvoice cancellation failed', { error: error.message, irn });
    throw error;
  }
}

/**
 * Get eInvoice by IRN
 */
async function getEInvoiceByIRN(irn) {
  try {
    logger.info('Getting eInvoice by IRN', { irn });

    const credentials = config.externalAPIs.einvoice.whitebooks;
    const authToken = await authenticate();

    const response = await axios.get(
      `${credentials.url}/irnapi/getirn`,
      {
        params: {
          email: credentials.email,
          irn: irn
        },
        headers: {
          ip_address: credentials.ipAddress,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          gstin: credentials.gstin,
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        timeout: credentials.timeout
      }
    );

    if (response.data.status_cd != 1) {
      throw new createHttpError.NotFound('eInvoice not found');
    }

    return response.data;
  } catch (error) {
    logger.error('Get eInvoice by IRN failed', { error: error.message, irn });
    throw error;
  }
}

/**
 * Get eInvoice by document details
 */
async function getEInvoiceByDocDetails(docType, docNo, docDate) {
  try {
    logger.info('Getting eInvoice by document details', { docType, docNo, docDate });

    const credentials = config.externalAPIs.einvoice.whitebooks;
    const authToken = await authenticate();

    const response = await axios.get(
      `${credentials.url}/irnapi/getdetails`,
      {
        params: {
          email: credentials.email,
          doctype: docType,
          docno: docNo,
          docdate: docDate
        },
        headers: {
          ip_address: credentials.ipAddress,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          gstin: credentials.gstin,
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        timeout: credentials.timeout
      }
    );

    if (response.data.status_cd != 1) {
      throw new createHttpError.NotFound('eInvoice not found');
    }

    return response.data;
  } catch (error) {
    logger.error('Get eInvoice by document details failed', { error: error.message });
    throw error;
  }
}

module.exports = {
  authenticate,
  generateEInvoice,
  cancelEInvoice,
  getEInvoiceByIRN,
  getEInvoiceByDocDetails
};
