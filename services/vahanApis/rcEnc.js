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
if (process.env.VAHANENV === "PROD") {
  publicKeyString = process.env.VAHAN_PROD_PUBLIC_KEY;
} else {
  publicKeyString = process.env.VAHAN_UAT_PUBLIC_KEY;
}

// Check if key is available
if (!publicKeyString) {
  console.error(`[VAHAN] Public key not found. Environment: ${process.env.VAHANENV || 'UAT'}`);
  throw new Error(`VAHAN public key not set in environment variables`);
}

// Replace escaped newlines with actual newlines
publicKeyString = publicKeyString.replace(/\\n/g, '\n');

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
    let parsedData;
    if (typeof decryptedResponse === 'string') {
      try {
        parsedData = JSON.parse(decryptedResponse);
      } catch (parseError) {
        console.log('[VAHAN RC] Failed to parse response as JSON, skipping save');
        return null;
      }
    } else {
      parsedData = decryptedResponse;
    }

    const result = safeGet(parsedData, 'result');
    if (!result) {
      console.log('[VAHAN RC] No result object in response, skipping save');
      return null;
    }

    // Get vehicle number - API uses regNo or vehicleNumber
    const vehicleNo = safeGet(result, 'regNo') || safeGet(result, 'vehicleNumber');
    if (!vehicleNo) {
      console.log('[VAHAN RC] No vehicle number in response, skipping save');
      return null;
    }

    // Handle nested array format like state: [["MAHARASHTRA","MH"]]
    const getNestedArrayValue = (arr, index = 0) => {
      if (Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0])) {
        return arr[0][index] || null;
      }
      if (Array.isArray(arr) && arr.length > 0) {
        return arr[index] || null;
      }
      return arr || null;
    };

    // Get state from splitPresentAddress or splitPermanentAddress
    const splitAddress = safeGet(result, 'splitPresentAddress') || safeGet(result, 'splitPermanentAddress') || {};
    const stateArray = safeGet(splitAddress, 'state');

    const vehicleData = {
      truckNo: vehicleNo,
      rcOwnerName: safeGet(result, 'owner'),
      rcFatherName: safeGet(result, 'ownerFatherName'),
      presentAddress: safeGet(result, 'presentAddress'),
      permanentAddress: safeGet(result, 'permanentAddress'),
      vehicleCategory: safeGet(result, 'vehicleCategory'),
      vehicleChassisNumber: safeGet(result, 'chassis'),
      vehicleEngineNumber: safeGet(result, 'engine'),
      makerDescription: safeGet(result, 'vehicleManufacturerName'),
      makerModel: safeGet(result, 'model'),
      vehicleColor: safeGet(result, 'vehicleColour'),
      fuelType: safeGet(result, 'type'),
      normsType: safeGet(result, 'normsType'),
      bodyType: safeGet(result, 'bodyType'),
      vehicleClass: safeGet(result, 'class'),
      grossVehicleWeight: safeGet(result, 'grossVehicleWeight'),
      unladenWeight: safeGet(result, 'unladenWeight'),
      vehicleSeatCapacity: safeGet(result, 'vehicleSeatCapacity'),
      ownerCount: safeGet(result, 'ownerCount'),
      rcFinancer: safeGet(result, 'rcFinancer'),
      rcInsuranceCompany: safeGet(result, 'vehicleInsuranceCompanyName'),
      rcInsurancePolicyNumber: safeGet(result, 'vehicleInsurancePolicyNumber'),
      rcInsuranceUpto: safeGet(result, 'vehicleInsuranceUpto'),
      rcRegistrationDate: safeGet(result, 'regDate'),
      rcFitnessUpto: safeGet(result, 'rcExpiryDate'),
      rcTaxUpto: safeGet(result, 'vehicleTaxUpto'),
      rcPucUpto: safeGet(result, 'puccUpto'),
      rcPermitNo: safeGet(result, 'permitNumber'),
      rcPermitType: safeGet(result, 'permitType'),
      rcPermitIssueDate: safeGet(result, 'permitIssueDate'),
      rcPermitValidFrom: safeGet(result, 'permitValidFrom'),
      rcPermitValidUpto: safeGet(result, 'permitValidUpto'),
      rcStatus: safeGet(result, 'status'),
      rcBlacklistStatus: safeGet(result, 'blacklistStatus'),
      rtoCode: safeGet(result, 'rtoCode'),
      rcRegAuthority: safeGet(result, 'regAuthority'),
      rcIsCommercial: safeGet(result, 'isCommercial'),
      rcNocDetails: safeGet(result, 'nocDetails'),
      stateName: getNestedArrayValue(stateArray, 0),
      fullDataJson: result,
    };

    const existingVehicle = await db.staticVehicleData.findOne({
      where: { truckNo: vehicleNo }
    });

    if (existingVehicle) {
      await existingVehicle.update(vehicleData);
      console.log(`[VAHAN RC] Updated vehicle data for: ${vehicleNo}`);
      return existingVehicle;
    } else {
      const newVehicle = await db.staticVehicleData.create(vehicleData);
      console.log(`[VAHAN RC] Saved new vehicle data for: ${vehicleNo}`);
      return newVehicle;
    }
  } catch (error) {
    console.error('[VAHAN RC] Error saving vehicle data:', error.message);
    return null;
  }
}

async function sendReq(encryptedData, result, keyENC1) {
  const timestamp = getTimestamp();
  const requestId = crypto.randomUUID();
  let token = await getAuthToken();
  let bodyDATA = {
    data: encryptedData,
    version: "1.0.0",
    symmetricKey: keyENC1,
    hash: result,
    timestamp,
    requestId,
  };
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
    let responseData = await encDataFuciton(
      response.data.symmetricKey,
      response.data.data,
      response.data.hash
    );
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
  try {
    const plainText = req.body; // Adjust as needed to match your request format

    var sskey = process.env.VAHANSSKEY;
    var sskeyBytes = Buffer.from(sskey, "utf8");
    const publicKey = forge.pki.publicKeyFromPem(publicKeyString);

    const encData = publicKey.encrypt(sskeyBytes, "RSA-OAEP", {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    });
    const encryptedHex = forge.util.bytesToHex(encData);

    let keyENC1 = Buffer.from(encryptedHex, "hex").toString("base64");
    const plainSymmetricKey = sskey;
    const encryptedData = encrypt(plainText, plainSymmetricKey);

    const plainSymmetricKeyReceived = sskey;
    const result = calculateHmacSHA256(
      plainSymmetricKeyReceived,
      JSON.stringify(plainText)
    );
    const response = await sendReq(encryptedData, result, keyENC1); // Get the actual response from sendReq

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
