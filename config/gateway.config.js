require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 8080,
    env: process.env.NODE_ENV || 'development'
  },

  externalAPIs: {
    vahan: {
      baseURL: process.env.VAHAN_API_URL || 'https://vahan.parivahan.gov.in',
      clientId: process.env.VAHAN_CLIENT_ID,
      clientSecret: process.env.VAHAN_CLIENT_SECRET,
      timeout: parseInt(process.env.VAHAN_TIMEOUT) || 30000,
      publicKeyPath: process.env.VAHAN_PUBLIC_KEY_PATH || './keys/vahan/public.pem',
      privateKeyPath: process.env.VAHAN_PRIVATE_KEY_PATH || './keys/vahan/private.pem'
    },
    
    eway: {
      nic: {
        url: process.env.NIC_EWAY_API_URL || 'https://ewaybillapi.nic.in/ewb/',
        username: process.env.NIC_EWAY_USERNAME,
        password: process.env.NIC_EWAY_PASSWORD,
        aspId: process.env.NIC_ASP_ID,
        gstin: process.env.NIC_GSTIN,
        privateKeyPath: process.env.NIC_PRIVATE_KEY_PATH || './keys/eway/private.pem',
        publicKeyPath: process.env.NIC_PUBLIC_KEY_PATH || './keys/eway/public.pem',
        timeout: parseInt(process.env.NIC_EWAY_TIMEOUT) || 30000
      },
      whitebooks: {
        url: process.env.WHITEBOOKS_EWAY_API_URL || 'https://apitest.whitebooks.co.in',
        email: process.env.WHITEBOOKS_EMAIL,
        username: process.env.WHITEBOOKS_USERNAME,
        password: process.env.WHITEBOOKS_PASSWORD,
        ipAddress: process.env.WHITEBOOKS_IP_ADDRESS,
        clientId: process.env.WHITEBOOKS_CLIENT_ID,
        clientSecret: process.env.WHITEBOOKS_CLIENT_SECRET,
        gstin: process.env.WHITEBOOKS_GSTIN,
        timeout: parseInt(process.env.WHITEBOOKS_EWAY_TIMEOUT) || 30000
      }
    },

    einvoice: {
      whitebooks: {
        url: process.env.WHITEBOOKS_EINVOICE_API_URL || 'https://apitest.whitebooks.co.in',
        email: process.env.WHITEBOOKS_EMAIL,
        username: process.env.WHITEBOOKS_EINVOICE_USERNAME,
        password: process.env.WHITEBOOKS_EINVOICE_PASSWORD,
        ipAddress: process.env.WHITEBOOKS_IP_ADDRESS,
        clientId: process.env.WHITEBOOKS_CLIENT_ID,
        clientSecret: process.env.WHITEBOOKS_CLIENT_SECRET,
        gstin: process.env.WHITEBOOKS_GSTIN,
        timeout: parseInt(process.env.WHITEBOOKS_EINVOICE_TIMEOUT) || 30000
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
