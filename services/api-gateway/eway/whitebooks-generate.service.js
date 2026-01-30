const axios = require('axios');
const createHttpError = require('http-errors');
const config = require('../../../config/gateway.config');
const logger = require('../../../helpers/logger');

class WhitebooksEwayService {
  constructor() {
    this.ewayConfig = config.externalAPIs.eway;
    this.authToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate with Whitebooks eWay API
   * @returns {Object} Authentication result with token
   */
  async authenticate() {
    try {
      const ewayConfig = config.externalAPIs.eway.whitebooks;
      
      logger.info('Authenticating with Whitebooks eWay API', {
        service: 'eway-whitebooks'
      });

      const authUrl = `${ewayConfig.url}/authenticate?email=${ewayConfig.email}&username=${ewayConfig.username}&password=${ewayConfig.password}`;

      const response = await axios.get(authUrl, {
        headers: {
          'ip_address': ewayConfig.ipAddress,
          'client_id': ewayConfig.clientId,
          'client_secret': ewayConfig.clientSecret,
          'gstin': ewayConfig.gstin,
          'Accept': 'application/json',
        },
        timeout: ewayConfig.timeout
      });

      if (response.data.status_cd != 1) {
        throw new Error('Whitebooks eWay authentication failed');
      }

      this.authToken = response.data.data?.auth_token;
      // Set token expiry (typically 6 hours)
      this.tokenExpiry = Date.now() + (6 * 60 * 60 * 1000);

      logger.info('Whitebooks eWay authentication successful', {
        service: 'eway-whitebooks'
      });

      return response.data;
    } catch (error) {
      logger.error('Whitebooks eWay authentication failed', {
        service: 'eway-whitebooks',
        error: error.message
      });
      throw new Error(`Whitebooks eWay authentication failed: ${error.message}`);
    }
  }

  /**
   * Check if token is valid
   */
  isTokenValid() {
    if (!this.authToken || !this.tokenExpiry) {
      return false;
    }
    return Date.now() < this.tokenExpiry;
  }

  /**
   * Ensure authentication
   */
  async ensureAuthenticated() {
    if (!this.isTokenValid()) {
      await this.authenticate();
    }
  }

  /**
   * Generate eWay Bill using Whitebooks API
   * @param {Object} params - eWay Bill generation parameters
   * @param {Object} params.ewayData - Complete eWay Bill data payload
   * @param {String} params.dispatcherId - ID of dispatcher making request
   * @param {String} params.mineId - ID of mine
   * @returns {Object} eWay Bill generation result
   */
  async generateEwayBill({ ewayData, dispatcherId, mineId }) {
    const startTime = Date.now();
    const ewayConfig = config.externalAPIs.eway.whitebooks;

    try {
      logger.info('Generating Whitebooks eWay Bill', {
        service: 'eway-whitebooks',
        dispatcherId,
        mineId,
        docNo: ewayData.docNo
      });

      // Ensure authenticated
      await this.ensureAuthenticated();

      // Prepare eWay Bill data
      const ewayPayload = {
        supplyType: ewayData.supplyType || 'O',
        subSupplyType: ewayData.subSupplyType,
        subSupplyDesc: ewayData.subSupplyDesc || '',
        docType: ewayData.docType || 'CHL',
        docNo: ewayData.docNo,
        docDate: ewayData.docDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '/'),
        fromGstin: ewayData.fromGstin || ewayConfig.gstin,
        fromTrdName: ewayData.fromTrdName,
        fromAddr1: ewayData.fromAddr1,
        fromAddr2: ewayData.fromAddr2 || '',
        fromPlace: ewayData.fromPlace,
        actFromStateCode: ewayData.actFromStateCode,
        fromPincode: ewayData.fromPincode,
        fromStateCode: ewayData.fromStateCode,
        toGstin: ewayData.toGstin,
        toTrdName: ewayData.toTrdName,
        toAddr1: ewayData.toAddr1,
        toAddr2: ewayData.toAddr2 || '',
        toPlace: ewayData.toPlace,
        toPincode: ewayData.toPincode,
        actToStateCode: ewayData.actToStateCode,
        toStateCode: ewayData.toStateCode,
        transactionType: ewayData.transactionType,
        dispatchFromGSTIN: ewayData.dispatchFromGSTIN || ewayConfig.gstin,
        dispatchFromTradeName: ewayData.dispatchFromTradeName,
        shipToGSTIN: ewayData.shipToGSTIN,
        shipToTradeName: ewayData.shipToTradeName,
        totalValue: parseFloat(ewayData.totalValue),
        sgstRate: parseFloat(ewayData.sgstRate || 0),
        cgstRate: parseFloat(ewayData.cgstRate || 0),
        igstRate: parseFloat(ewayData.igstRate || 0),
        cgstValue: parseFloat(ewayData.cgstValue || 0),
        sgstValue: parseFloat(ewayData.sgstValue || 0),
        igstValue: parseFloat(ewayData.igstValue || 0),
        cessValue: parseFloat(ewayData.cessValue || 0),
        cessNonAdvolValue: parseFloat(ewayData.cessNonAdvolValue || 0),
        totInvValue: parseFloat(ewayData.totInvValue),
        transMode: ewayData.transMode || '1',
        transporterName: ewayData.transporterName || '',
        transDistance: ewayData.transDistance || '0',
        transDocNo: ewayData.transDocNo || '',
        transDocDate: ewayData.transDocDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '/'),
        vehicleNo: ewayData.vehicleNo,
        vehicleType: ewayData.vehicleType || 'R',
        itemList: ewayData.itemList
      };

      // Add transporterId if provided
      if (ewayData.transporterId) {
        ewayPayload.transporterId = ewayData.transporterId;
      }

      // Call Whitebooks API
      const response = await axios.post(
        `${ewayConfig.url}/ewayapi/genewaybill?email=${ewayConfig.email}`,
        ewayPayload,
        {
          headers: {
            'ip_address': ewayConfig.ipAddress,
            'client_id': ewayConfig.clientId,
            'client_secret': ewayConfig.clientSecret,
            'gstin': ewayConfig.gstin,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: ewayConfig.timeout
        }
      );

      // Check for errors in response
      if (response.data.status_cd != 1 || response.data.error || response.data.errorCodes) {
        const errorDetails = {
          message: response.data?.error?.message || 'eWay Bill generation failed',
          errorCodes: response.data?.errorCodes || response.data?.error?.errorCodes,
          error: response.data?.error,
          status_cd: response.data?.status_cd
        };
        
        logger.error('Whitebooks eWay API returned error', {
          service: 'eway-whitebooks',
          docNo: ewayData.docNo,
          errorDetails: errorDetails
        });
        
        // Create a detailed error message
        const errorMessage = errorDetails.errorCodes 
          ? `eWay Bill generation failed. Error Code: ${errorDetails.errorCodes}. ${errorDetails.message || ''}`
          : errorDetails.message;
        
        const error = new createHttpError[422](errorMessage);
        error.errorCodes = errorDetails.errorCodes;
        error.errorDetails = errorDetails;
        throw error;
      }

      const responseTime = Date.now() - startTime;

      logger.info('Whitebooks eWay Bill generated successfully', {
        service: 'eway-whitebooks',
        dispatcherId,
        mineId,
        docNo: ewayData.docNo,
        ewayBillNo: response.data.data?.ewayBillNo,
        responseTime
      });

      return {
        success: true,
        responseTime,
        data: response.data.data
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // If it's already an HTTP error with error details, just rethrow
      if (error.errorCodes || error.errorDetails) {
        throw error;
      }

      // Handle axios errors
      if (error.response?.data) {
        const apiError = error.response.data;
        const errorDetails = {
          message: apiError?.error?.message || apiError?.message || 'eWay Bill generation failed',
          errorCodes: apiError?.errorCodes || apiError?.error?.errorCodes,
          status_cd: apiError?.status_cd
        };

        logger.error('Whitebooks eWay Bill generation failed', {
          service: 'eway-whitebooks',
          dispatcherId,
          mineId,
          docNo: ewayData.docNo,
          errorDetails: errorDetails,
          responseTime
        });

        const errorMessage = errorDetails.errorCodes 
          ? `eWay Bill generation failed. Error Code: ${errorDetails.errorCodes}. ${errorDetails.message || ''}`
          : errorDetails.message;

        const httpError = new createHttpError[422](errorMessage);
        httpError.errorCodes = errorDetails.errorCodes;
        httpError.errorDetails = errorDetails;
        throw httpError;
      }

      // Generic error handling
      logger.error('Whitebooks eWay Bill generation failed', {
        service: 'eway-whitebooks',
        dispatcherId,
        mineId,
        docNo: ewayData.docNo,
        error: error.message,
        responseTime
      });

      throw new createHttpError[500](`eWay Bill generation failed: ${error.message}`);
    }
  }

  /**
   * Cancel eWay Bill using Whitebooks API
   * @param {Object} params - Cancellation parameters
   */
  async cancelEwayBill({ ewayBillNo, cancelReason, cancelRemarks, dispatcherId, mineId }) {
    const startTime = Date.now();
    const ewayConfig = config.externalAPIs.eway.whitebooks;

    try {
      await this.ensureAuthenticated();

      logger.info('Cancelling Whitebooks eWay Bill', {
        service: 'eway-whitebooks',
        dispatcherId,
        mineId,
        ewayBillNo
      });

      const cancelData = {
        ewbNo: parseInt(ewayBillNo),
        cancelRsnCode: parseInt(cancelReason),
        cancelRmrk: cancelRemarks || 'Cancelled'
      };

      const response = await axios.post(
        `${ewayConfig.url}/ewayapi/canewb?email=${ewayConfig.email}`,
        cancelData,
        {
          headers: {
            'ip_address': ewayConfig.ipAddress,
            'client_id': ewayConfig.clientId,
            'client_secret': ewayConfig.clientSecret,
            'gstin': ewayConfig.gstin,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: ewayConfig.timeout
        }
      );

      if (response.data.status_cd != 1) {
        const errorMessage = response.data?.error?.message || 'eWay Bill cancellation failed';
        throw new createHttpError[411](errorMessage);
      }

      const responseTime = Date.now() - startTime;

      logger.info('Whitebooks eWay Bill cancelled successfully', {
        service: 'eway-whitebooks',
        dispatcherId,
        mineId,
        ewayBillNo,
        responseTime
      });

      return {
        success: true,
        responseTime,
        data: response.data.data
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Whitebooks eWay Bill cancellation failed', {
        service: 'eway-whitebooks',
        dispatcherId,
        mineId,
        ewayBillNo,
        error: error.message,
        responseTime
      });

      throw new Error(`Whitebooks eWay Bill cancellation failed: ${error.message}`);
    }
  }
}

module.exports = new WhitebooksEwayService();
