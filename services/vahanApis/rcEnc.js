"use strict";
const crypto = require("crypto");
const forge = require("node-forge");
const { getAuthToken } = require("./auth.js");
const { encDataFuciton } = require("./dec.js");
const axios = require("axios");
const moment = require("moment-timezone");
const db = require("../../models");

// Get public key from environment variable based on environment
let publicKeyString;
if (process.env.VAHANENV == "PROD") {
  publicKeyString = process.env.VAHAN_PROD_PUBLIC_KEY;
} else {
  publicKeyString = process.env.VAHAN_UAT_PUBLIC_KEY;
}

// Check if key is available
if (!publicKeyString) {
  console.error(`[VAHAN API] CRITICAL: Public key not found in environment variables`);
  console.error(`[VAHAN API] Environment: ${process.env.VAHANENV || 'UAT'}`);
  console.error(`[VAHAN API] Please ensure VAHAN_UAT_PUBLIC_KEY or VAHAN_PROD_PUBLIC_KEY is set in .env`);
  throw new Error(`VAHAN public key environment variable not set`);
}

// Replace escaped newlines with actual newlines
publicKeyString = publicKeyString.replace(/\\n/g, '\n');

const publicKey = forge.pki.publicKeyFromPem(publicKeyString);
function getRandomBytes(length) {
  return crypto.randomBytes(length);
}

function getAESKeyFromPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 65536, 32, "sha256");
}

function encrypt(plainText, plainSymmetricKey) {
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(12);
  const aesKeyFromPassword = getAESKeyFromPassword(
    Buffer.from(plainSymmetricKey),
    salt
  );

  const cipher = crypto.createCipheriv("aes-256-gcm", aesKeyFromPassword, iv);
  const cipherText = Buffer.concat([
    cipher.update(JSON.stringify(plainText), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const cipherTextWithIvSalt = Buffer.concat([iv, salt, cipherText, tag]);
  return cipherTextWithIvSalt.toString("base64");
}

function calculateHmacSHA256(plainSymmetricKeyReceived, encryptedData) {
  const hasher = crypto.createHmac(
    "sha256",
    Buffer.from(plainSymmetricKeyReceived)
  );
  const hash = hasher.update(encryptedData).digest("base64");
  return hash;
}

/**
 * Safely get nested property from object
 * @param {Object} obj - The object to get property from
 * @param {string} path - Dot-separated path to property
 * @param {*} defaultValue - Default value if property doesn't exist
 */
function safeGet(obj, path, defaultValue = null) {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = result[key];
    }
    return result !== undefined && result !== null && result !== '' ? result : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Save vehicle data to staticVehicleData table
 * Handles missing fields and response structure changes gracefully
 */
async function saveVehicleData(decryptedResponse) {
  try {
    // Parse response if it's a string
    let parsedData;
    if (typeof decryptedResponse === 'string') {
      try {
        parsedData = JSON.parse(decryptedResponse);
      } catch (parseError) {
        console.log('[VAHAN] Failed to parse response as JSON, skipping save');
        return null;
      }
    } else {
      parsedData = decryptedResponse;
    }

    // Check if result exists
    const result = safeGet(parsedData, 'result');
    if (!result) {
      console.log('[VAHAN] No result object in response, skipping save');
      return null;
    }

    // Get vehicle number - required field
    const vehicleNo = safeGet(result, 'regNo') || safeGet(result, 'vehicleNumber');
    if (!vehicleNo) {
      console.log('[VAHAN] No vehicle number in response, skipping save');
      return null;
    }

    // Extract address info safely
    const splitAddress = safeGet(result, 'splitPresentAddress') || safeGet(result, 'splitPermanentAddress') || {};

    // Get state - handle array format [[\"MAHARASHTRA\",\"MH\"]]
    let state = null;
    const stateData = safeGet(splitAddress, 'state');
    if (Array.isArray(stateData) && stateData.length > 0) {
      state = Array.isArray(stateData[0]) ? stateData[0][0] : stateData[0];
    }

    // Get city - handle array format
    let city = null;
    const cityData = safeGet(splitAddress, 'city');
    if (Array.isArray(cityData) && cityData.length > 0) {
      city = cityData[0];
    }

    // Prepare data for saving
    const vehicleData = {
      // Basic info
      truckNo: vehicleNo,
      truckOwner: safeGet(result, 'owner'),
      address: safeGet(result, 'presentAddress') || safeGet(result, 'permanentAddress'),
      pincode: safeGet(splitAddress, 'pincode'),
      state: state,
      city: city,
      type: safeGet(result, 'type'),
      phoneNumber: safeGet(result, 'mobileNumber'),

      // Vehicle identification
      chassis: safeGet(result, 'chassis'),
      engine: safeGet(result, 'engine'),

      // Vehicle details
      vehicleManufacturerName: safeGet(result, 'vehicleManufacturerName'),
      model: safeGet(result, 'model'),
      vehicleColour: safeGet(result, 'vehicleColour'),
      normsType: safeGet(result, 'normsType'),
      bodyType: safeGet(result, 'bodyType'),
      vehicleClass: safeGet(result, 'class'),
      vehicleCategory: safeGet(result, 'vehicleCategory'),

      // Weight and capacity
      grossVehicleWeight: safeGet(result, 'grossVehicleWeight'),
      unladenWeight: safeGet(result, 'unladenWeight'),
      vehicleSeatCapacity: safeGet(result, 'vehicleSeatCapacity'),

      // Owner details
      ownerCount: safeGet(result, 'ownerCount'),

      // Status info
      status: safeGet(result, 'status'),
      blacklistStatus: safeGet(result, 'blacklistStatus'),

      // Insurance details
      vehicleInsuranceCompanyName: safeGet(result, 'vehicleInsuranceCompanyName'),
      vehicleInsurancePolicyNumber: safeGet(result, 'vehicleInsurancePolicyNumber'),
      vehicleInsuranceUpto: safeGet(result, 'vehicleInsuranceUpto'),

      // Registration info
      rtoCode: safeGet(result, 'rtoCode'),
      regAuthority: safeGet(result, 'regAuthority'),
      regDate: safeGet(result, 'regDate'),
      isCommercial: safeGet(result, 'isCommercial'),

      // Validity dates
      rcBook: !!safeGet(result, 'rcExpiryDate'),
      fitnessCertificate: !!safeGet(result, 'fitnessValidUpto'),
      puccValidUpto: safeGet(result, 'puccUpto'),
      rcExpiryDate: safeGet(result, 'rcExpiryDate'),
      permitValidUpto: safeGet(result, 'permitValidUpto'),
      vehicleTaxUpto: safeGet(result, 'vehicleTaxUpto'),
      fitnessValidUpto: safeGet(result, 'fitnessValidUpto'),

      // Full JSON data
      fullDataJson: result,
    };

    // Check if vehicle already exists
    const existingVehicle = await db.staticVehicleData.findOne({
      where: { truckNo: vehicleNo }
    });

    if (existingVehicle) {
      // Update existing record
      await existingVehicle.update(vehicleData);
      console.log(`[VAHAN] Updated vehicle data for: ${vehicleNo}`);
      return existingVehicle;
    } else {
      // Create new record
      const newVehicle = await db.staticVehicleData.create(vehicleData);
      console.log(`[VAHAN] Saved new vehicle data for: ${vehicleNo}`);
      return newVehicle;
    }
  } catch (error) {
    // Log error but don't throw - we don't want to break the API response
    console.error('[VAHAN] Error saving vehicle data:', error.message);
    return null;
  }
}

async function sendReq(encryptedData, result, keyENC1) {
  const timestamp = getTimestamp();
  console.log("This is TimeStamped: ", timestamp);
  const requestId = crypto.randomUUID();
  let token = await getAuthToken();
  console.log("KEYENC1: ", keyENC1);
  let bodyDATA = {
    data: encryptedData,
    version: "1.0.0",
    symmetricKey: keyENC1,
    hash: result,
    timestamp,
    requestId,
  };
  console.log("bodyDATAbodyDATA", bodyDATA);
  function getTimestamp() {
    const istTime = moment.tz("Asia/Kolkata");

    // Format the timestamp as required: YYYY-MM-DDTHH:mm:ss.SSS
    return istTime.format("YYYY-MM-DDTHH:mm:ss.SSS");
  }
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: process.env.VAHANURLAPI + "/protean/vehicle-detailed-advanced",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.VAHANAPIKEY,
      Authorization: "Bearer " + token.access_token,
    },
    data: bodyDATA,
  };

  try {
    const response = await axios.request(config);
    console.log("Response:", response.data);
    let responseData = await encDataFuciton(
      response.data.symmetricKey,
      response.data.data,
      response.data.hash
    );
    console.log("encDataFuciton response:", responseData);
    return responseData;
  } catch (error) {
    console.error("Error:", error);
    if (error.response) {
      let responseData = await encDataFuciton(
        error.response.data.symmetricKey,
        error.response.data.data,
        error.response.data.hash
      );
      console.log("encDataFuciton error response:", responseData);
      return responseData;
    }
  }
}

async function sendRes(req, res, next) {
  // return async (req, res, next) => {
  try {
    const plainText = req.body; // Adjust as needed to match your request format
    console.log("This is Plain text: ", plainText);

    var sskey = process.env.VAHANSSKEY;
    var sskeyBytes = Buffer.from(sskey, "utf8");
    const publicKey = forge.pki.publicKeyFromPem(publicKeyString);
    const bytes = forge.util.encodeUtf8(sskey);

    const encData = publicKey.encrypt(sskeyBytes, "RSA-OAEP", {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    });
    const encryptedHex = forge.util.bytesToHex(encData);

    console.log(
      "encryptedKey : ",
      Buffer.from(encryptedHex, "hex").toString("base64")
    );

    let keyENC1 = Buffer.from(encryptedHex, "hex").toString("base64");
    const plainSymmetricKey = sskey;
    const encryptedData = encrypt(plainText, plainSymmetricKey);
    console.log("encryptedData : " + encryptedData);

    const plainSymmetricKeyReceived = sskey;
    const result = calculateHmacSHA256(
      plainSymmetricKeyReceived,
      JSON.stringify(plainText)
    );
    console.log("hash : " + result);

    // const plainSymmetricKey = "1234567890123456"; // Adjust key as needed
    // const encryptedData = encrypt(plainText, plainSymmetricKey);
    // const hash = calculateHmacSHA256(plainSymmetricKey, encryptedData);

    const response = await sendReq(encryptedData, result, keyENC1); // Get the actual response from sendReq
    console.log("Response:", response); // Log the response for debugging

    // Save vehicle data to database if response is successful
    if (response) {
      await saveVehicleData(response);
    }

    res.sendResponse({ decryptedData: response }); // Send decrypted data to Postman
  } catch (error) {
    next(error);
  }
}

module.exports = sendRes;
