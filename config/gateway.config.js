require('dotenv').config();

module.exports = {
  server: {
    port: parseInt(process.env.PORT) || 5000,
    env: process.env.NODE_ENV || 'test'
  },

  externalAPIs: {
    vahan: {
      baseURL: process.env.VAHAN_URL_API || 'https://uat.risewithprotean.io/api/v1',
      url: process.env.VAHAN_URL || 'https://uat.risewithprotean.io/v1',
      apiKey: process.env.VAHANAPIKEY,
      secretKey: process.env.VAHAN_SECRET_KEY,
      ssKey: process.env.VAHAN_SSKEY,
      env: process.env.VAHANENV || 'UAT',
      timeout: 30000,
      publicKeyPath: './keys/vahan/public.pem',
      privateKeyPath: './keys/vahan/private.pem'
    },

    eway: {
      nic: {
        url: process.env.EWAY_API_URL || 'https://test.proteangsp.co.in/gus/ewb/ewaybillapi',
        username: process.env.EWAY_USERNAME,
        password: process.env.EWAY_PASSWORD,
        aspId: process.env.ASP_ID,
        gstin: process.env.EWAY_GSTIN,
        txnId: process.env.EWAY_TXN_ID,
        passphrase: process.env.EWAY_PASSPHRASE,
        env: process.env.EWAYENV || 'UAT',
        privateKeyPath: './keys/eway/private.pem',
        publicKeyPath: './keys/eway/public.pem',
        timeout: 30000
      },
      
      whitebooks: {
        url: process.env.EWAY_WHITEBOOKS_URL || 'https://apisandbox.whitebooks.in/ewaybillapi/v1.03',
        email: process.env.EWAY_WHITEBOOKS_EMAIL,
        username: process.env.EWAY_WHITEBOOKS_USERNAME,
        password: process.env.EWAY_WHITEBOOKS_PASSWORD,
        ipAddress: process.env.EWAY_WHITEBOOKS_IP,
        clientId: process.env.EWAY_WHITEBOOKS_CLIENT_ID,
        clientSecret: process.env.EWAY_WHITEBOOKS_CLIENT_SECRET,
        gstin: process.env.EWAY_WHITEBOOKS_GSTIN,
        env: process.env.EWAY_WHITEBOOKS_ENV || 'sandbox',
        timeout: 30000
      }
    },

    einvoice: {
      whitebooks: {
        url: 'https://apisandbox.whitebooks.in',
        email: process.env.EINVOICE_EMAIL,
        username: process.env.EINVOICE_USERNAME,
        password: process.env.EINVOICE_PASSWORD,
        ipAddress: process.env.EINVOICE_IP_ADDRESS,
        clientId: process.env.EINVOICE_CLIENT_ID,
        clientSecret: process.env.EINVOICE_CLIENT_SECRET,
        gstin: process.env.EINVOICE_GSTIN,
        env: process.env.EINVOICE_ENV || 'sandbox',
        timeout: 30000
      }
    }
  },

  rateLimits: {
    vahan: {
      windowMs: 60 * 1000, // 1 minute
      max: 100
    },
    eway: {
      windowMs: 60 * 1000,
      max: 200
    },
    einvoice: {
      windowMs: 60 * 1000,
      max: 150
    },
    global: {
      windowMs: 60 * 1000,
      max: 500
    }
  },

  circuitBreaker: {
    timeout: 30000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  }
};
