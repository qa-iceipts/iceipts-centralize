"use strict";
const crypto = require("crypto");
const forge = require("node-forge");
const { getAuthToken } = require("./auth.js");
const { encDataFuciton } = require("./dec.js");
const axios = require("axios");
const moment = require("moment-timezone");

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

    res.sendResponse({ decryptedData: response }); // Send decrypted data to Postman
  } catch (error) {
    next(error);
  }
}

module.exports = sendRes;
