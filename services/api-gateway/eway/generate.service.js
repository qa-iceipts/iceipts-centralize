const axios = require('axios');
const crypto = require('crypto');
const forge = require('node-forge');
const config = require('../../../config/gateway.config');
const logger = require('../../../helpers/logger');
const createHttpError = require('http-errors');
const moment = require('moment-timezone');

/**
 * NIC eWay Bill Generation Service
 */

// Load keys from environment variables via config
let privateKey, publicKey;
try {
  privateKey = config.externalAPIs.eway.nic.privateKey;
  publicKey = config.externalAPIs.eway.nic.publicKey;

  // Check if keys are available
  if (!privateKey) {
    throw new Error('EWAY_PRIVATE_KEY environment variable not set. See DEPLOYMENT.md for key setup instructions.');
  }
  if (!publicKey) {
    throw new Error('EWAY_PUBLIC_KEY environment variable not set. See DEPLOYMENT.md for key setup instructions.');
  }

  // Replace escaped newlines with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  publicKey = publicKey.replace(/\\n/g, '\n');

  logger.info('NIC eWay Bill keys loaded successfully from environment variables');
} catch (error) {
  logger.error('Failed to load NIC eWay Bill keys', { error: error.message });
  logger.error('eWay Bill functionality will not work until keys are properly set in environment variables');
  // Don't throw - allow app to start but eWay operations will fail gracefully
}

/**
 * Generate SEK (Session Encryption Key)
 */
function generateSEK() {
  return crypto.randomBytes(16); // 128-bit AES key
}

/**
 * Encrypt SEK with RSA public key
 */
function encryptSEK(sek) {
  try {
    if (!publicKey) {
      throw new Error('eWay Bill public key not loaded. Check server logs for key loading errors.');
    }
    const publicKeyObj = forge.pki.publicKeyFromPem(publicKey);
    const encrypted = publicKeyObj.encrypt(sek.toString('hex'), 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create()
      }
    });
    return forge.util.encode64(encrypted);
  } catch (error) {
    logger.error('SEK encryption failed', { error: error.message });
    throw error;
  }
}

/**
 * Encrypt data with AES-256-ECB
 */
function encryptData(data, sek) {
  const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.concat([sek, sek]), '');
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

/**
 * Generate authentication token
 */
async function generateAuthToken() {
  try {
    const credentials = config.externalAPIs.eway.nic;
    
    const authPayload = {
      UserName: credentials.username,
      Password: credentials.password,
      AppKey: credentials.aspId
    };

    const sek = generateSEK();
    const encryptedSEK = encryptSEK(sek);
    const encryptedData = encryptData(authPayload, sek);

    const response = await axios.post(
      `${credentials.url}authenticate`,
      {
        Data: encryptedData
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'SEK': encryptedSEK,
          'Appkey': credentials.aspId
        }
      }
    );

    if (response.data.status == 1) {
      return response.data.data.AuthToken;
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    logger.error('NIC eWay Bill authentication failed', { error: error.message });
    throw error;
  }
}

/**
 * Generate eWay Bill (NIC)
 */
async function generateEwayBill(ewayData) {
    logger.info('Generating NIC eWay Bill', {
      docNo: ewayData.docNo,
      vehicleNo: ewayData.vehicleNo
    });

    const credentials = config.externalAPIs.eway.nic;
    const authToken = await generateAuthToken();

    // Transform payload for NIC (remove Whitebooks-only fields)
    const nicPayload = {
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
      totalValue: ewayData.totalValue,
      cgstValue: ewayData.cgstValue || 0,
      sgstValue: ewayData.sgstValue || 0,
      igstValue: ewayData.igstValue || 0,
      cessValue: ewayData.cessValue || 0,
      cessNonAdvolValue: ewayData.cessNonAdvolValue || 0,
      totInvValue: ewayData.totInvValue,
      transporterId: ewayData.transporterId || "",
      transporterName: ewayData.transporterName || "",
      transDocNo: ewayData.transDocNo || "",
      transMode: ewayData.transMode || "1",
      transDistance: ewayData.transDistance || "0",
      transDocDate: ewayData.transDocDate || moment().format('DD/MM/YYYY'),
      vehicleNo: ewayData.vehicleNo,
      vehicleType: ewayData.vehicleType || "R",
      itemList: ewayData.itemList
    };

    logger.info('NIC eWay Bill payload prepared', { docNo: nicPayload.docNo });

    const sek = generateSEK();
    const encryptedSEK = encryptSEK(sek);
    const encryptedData = encryptData(nicPayload, sek);

    const ewayResponse = await axios.post(
      `${credentials.url}genewaybill`,
      {
        Data: encryptedData
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'SEK': encryptedSEK,
          'Appkey': credentials.aspId,
          'AuthToken': authToken,
          'username': credentials.username,
          'gstin': credentials.gstin
        }
      }
    );

    // Check for errors
    if (ewayResponse.data.status == 0) {
      let errorMessage;
      let errorCodes = 'UNKNOWN';
      try {
        errorMessage = Buffer.from(ewayResponse.data.error, 'base64').toString('utf-8');
        const parsedError = JSON.parse(errorMessage);
        if (parsedError && parsedError.errorCodes) {
          errorCodes = parsedError.errorCodes;
        }
      } catch (e) {
        errorMessage = typeof ewayResponse.data.error === 'string'
          ? ewayResponse.data.error
          : JSON.stringify(ewayResponse.data.error);
      }

      logger.error('NIC eWay API returned error', {
        service: 'eway-generate',
        rawError: ewayResponse.data.error,
        decodedError: errorMessage,
        errorCodes
      });

      throw new createHttpError[406](`NIC eWay Bill generation failed: ${errorMessage}`, {
        errorCodes,
        errorDetails: ewayResponse.data.error
      });
    }

    logger.info('NIC eWay Bill generated successfully', {
      docNo: ewayData.docNo
    });

    return ewayResponse.data;
}

module.exports = {
  generateEwayBill
};
