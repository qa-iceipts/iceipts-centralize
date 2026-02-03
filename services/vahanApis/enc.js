"use strict";
const crypto = require("crypto");
const forge = require("node-forge");
const { getAuthToken } = require("./auth.js");
const { encDataFuciton } = require("./dec.js");
const axios = require("axios");
const moment = require("moment-timezone");
const path = require("path");
const fs = require("fs");
const db = require("../../models");

var publicKeyPath = path.join(__dirname, "UATpublic.pem");
if (process.env.VAHANENV == "PROD") {
  publicKeyPath = path.resolve(__dirname, "PRODpublic.pem");
}

const publicKeyString = fs.readFileSync(publicKeyPath, "utf8");

// const publicKeyString = `-----BEGIN PUBLIC KEY-----
// MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2qRdDtt6qc4UMI+5V0y0
// ZkWuusnPO/OC92nNjBVQB0Lcv8NrzHZEEh3yfKybz9BJCExciSzUNfEJkC6fy3Zr
// waJfvpZ2PsKU87vUyZjzyw1ZYWLHKf+7azLEFtByxTYfbm4gxA8VAj9uEcyNKqPZ
// 6r5JK92K6ig3RRsGL0i+Htowj0T0YBVOz83JpsfG6SUZYe6VP6X9FppgbhpxDG3o
// C4veHcad6N+FmTo8y1MPtgb5ZfuNgr8z/Nmg/mDH9Lq/NQ5V8empx/uWPwVvr+zU
// 2qk8N9fs/A/XbQM2GzD5HiDyIZl7C1wPsCp/+9gZEJeql8fORGxfmKuhCzt4UEx9
// LwIDAQAB
// -----END PUBLIC KEY-----`;

// Protean public key
// const publicKeyString = `-----BEGIN PUBLIC KEY-----
// MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAooa+nRkfsXfQDj86TBo2
// SkCrCLwz+uYSE+f1qapTOridKDUqL/C07/gkrzG9r7W/hf84IxevoD1Pu1VSaeTR
// b60PLZcMniAIqtFqValZz0HqAK/qRHMGUaK0AN97gN3CetbMKxGip3iEw3Ehwr0r
// sPtPJ/2ivDWXZAN/faNfcbqEUUUQeDgNmore+4JfKigLojRH3Ol89CGMLbD7G78i
// JAujmezSl3y84qkZ1TpKfWjTGZenGDWG3owQE0eQHA14zWVZQcFlciQBBwMoUgQH
// JCzIIZw1KGOhOb2xk+g7RZw961cSqq0eRyhFIMwE/U664ilN2r8SFvInRAWfUQey
// cwIDAQAB
// -----END PUBLIC KEY-----
// `;


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

async function sendReq(encryptedData, result,keyENC1) {
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
  console.log("bodyDATAbodyDATA",bodyDATA)
  function getTimestamp() {
    const istTime = moment.tz("Asia/Kolkata");

    // Format the timestamp as required: YYYY-MM-DDTHH:mm:ss.SSS
    return istTime.format("YYYY-MM-DDTHH:mm:ss.SSS");
  }
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: process.env.VAHANURLAPI + "/retail/dl",
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

    // let responseData = await encDataFuciton(
    //   bodyDATA.symmetricKey,
    //   bodyDATA.data,
    //   bodyDATA.hash
    // );
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

    const response = await sendReq(encryptedData, result,keyENC1); // Get the actual response from sendReq
    console.log("Response:", response); // Log the response for debugging
    let dlData = JSON.parse(response);
    if (dlData.result && dlData.result.img) {
      let dobFormatted = moment(dlData.result.dob, 'DD-MM-YYYY').format('YYYY-MM-DD');
      let img = dlData.result.img;
      let driverDataAdd = await db.drivers.findOne({
        where: {
          dlNumber: dlData.result.dlNumber,
        },
      });
      if (!driverDataAdd) {
        await db.drivers.create({
          dlNumber: dlData.result.dlNumber,
          dob: dobFormatted,
          fullName: dlData.result.name,
          driverImage: "data:image/jpeg;base64,"+ img,
        });
      }
      // Increase counter for dl number
      let dlNumberCount = await db.vahanApiStats.findOne({
        where: {
          month: moment().month() + 1,
          year: moment().year(),
        },
      });
      if (dlNumberCount) {
        await dlNumberCount.increment("dlNumberCount");
      } else {
        await db.vahanApiStats.create({
          month: moment().month() + 1,
          year: moment().year(),
          dlNumberCount: 1,
          vehicleEntryCount: 0,
        });
      }
    }
    res.sendResponse({ decryptedData: response }); // Send decrypted data to Postman
  } catch (error) {
    next(error);
  }
}

module.exports = sendRes;
