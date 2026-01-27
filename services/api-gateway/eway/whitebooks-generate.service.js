const axios = require('axios');
const config = require('../../../config/gateway.config');
const logger = require('../../../helpers/logger');
const createHttpError = require('http-errors');

/**
 * Whitebooks eWay Bill Generation Service
 */

/**
 * Authenticate with Whitebooks
 */
async function authenticate() {
  try {
    const credentials = config.externalAPIs.eway.whitebooks;
    
    const response = await axios.get(
      `${credentials.url}/ewaybillapi/v1.03/authenticate`,
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
      throw new Error('Whitebooks authentication failed: ' + response.data.status_desc);
    }

    logger.info('Whitebooks authentication successful');
    return response.data.data.AuthToken;
  } catch (error) {
    logger.error('Whitebooks authentication failed', { error: error.message });
    throw new createHttpError.Unauthorized('Failed to authenticate with Whitebooks');
  }
}

/**
 * Generate eWay Bill (Whitebooks)
 */
async function generateEwayBill(ewayData) {
  try {
    logger.info('Generating Whitebooks eWay Bill', {
      docNo: ewayData.docNo,
      vehicleNo: ewayData.vehicleNo
    });

    const credentials = config.externalAPIs.eway.whitebooks;
    const authToken = await authenticate();

    // Prepare payload for Whitebooks
    const ewayPayload = {
      supplyType: ewayData.supplyType,
      subSupplyType: ewayData.subSupplyType,
      subSupplyDesc: ewayData.subSupplyDesc || "",
      docType: ewayData.docType,
      docNo: ewayData.docNo,
      docDate: ewayData.docDate,
      fromGstin: ewayData.fromGstin,
      fromTrdName: ewayData.fromTrdName,
      fromAddr1: ewayData.fromAddr1,
      fromAddr2: ewayData.fromAddr2 || "",
      fromPlace: ewayData.fromPlace,
      fromPincode: ewayData.fromPincode,
      actFromStateCode: ewayData.actFromStateCode,
      fromStateCode: ewayData.fromStateCode,
      toGstin: ewayData.toGstin,
      toTrdName: ewayData.toTrdName,
      toAddr1: ewayData.toAddr1,
      toAddr2: ewayData.toAddr2 || "",
      toPlace: ewayData.toPlace,
      toPincode: ewayData.toPincode,
      actToStateCode: ewayData.actToStateCode,
      toStateCode: ewayData.toStateCode,
      transactionType: ewayData.transactionType,
      dispatchFromGSTIN: ewayData.dispatchFromGSTIN || ewayData.fromGstin,
      dispatchFromTradeName: ewayData.dispatchFromTradeName || ewayData.fromTrdName,
      shipToGSTIN: ewayData.shipToGSTIN || ewayData.toGstin,
      shipToTradeName: ewayData.shipToTradeName || ewayData.toTrdName,
      totalValue: ewayData.totalValue,
      cgstValue: ewayData.cgstValue || 0,
      sgstValue: ewayData.sgstValue || 0,
      igstValue: ewayData.igstValue || 0,
      cessValue: ewayData.cessValue || 0,
      cessNonAdvolValue: ewayData.cessNonAdvolValue || 0,
      totInvValue: ewayData.totInvValue,
      transporterName: ewayData.transporterName || "",
      transDocNo: ewayData.transDocNo || "",
      transMode: ewayData.transMode || "1",
      transDistance: ewayData.transDistance || "0",
      transDocDate: ewayData.transDocDate || ewayData.docDate,
      vehicleNo: ewayData.vehicleNo,
      vehicleType: ewayData.vehicleType || "R",
      itemList: ewayData.itemList
    };

    logger.info('Whitebooks eWay Bill payload prepared', { docNo: ewayPayload.docNo });

    const response = await axios.post(
      `${credentials.url}/ewayapi/genewaybill`,
      ewayPayload,
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
      const errorDetails = response.data?.error || { message: 'eWay Bill generation failed' };
      const errorMessage = errorDetails.message || 'eWay Bill generation failed';
      const errorCodes = errorDetails.errorCodes || 'UNKNOWN';

      logger.error('Whitebooks eWay API returned error', {
        service: 'eway-whitebooks',
        rawError: response.data,
        errorMessage,
        errorCodes
      });

      throw new createHttpError[422](`Whitebooks eWay Bill generation failed: ${errorMessage}. Error Code: ${errorCodes}`, {
        errorCodes,
        errorDetails
      });
    }

    logger.info('Whitebooks eWay Bill generated successfully', {
      docNo: ewayData.docNo,
      ewayBillNo: response.data.data?.ewayBillNo
    });

    return response.data;
  } catch (error) {
    logger.error('Whitebooks eWay Bill generation failed', {
      error: error.message,
      docNo: ewayData.docNo
    });
    throw error;
  }
}

module.exports = {
  authenticate,
  generateEwayBill
};
