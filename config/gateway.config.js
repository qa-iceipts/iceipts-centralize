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
      // Keys are now loaded from environment variables
      publicKey: process.env.VAHANENV === 'PROD' ? process.env.VAHAN_PROD_PUBLIC_KEY : process.env.VAHAN_UAT_PUBLIC_KEY,
      privateKey: process.env.VAHANENV === 'PROD' ? process.env.VAHAN_PROD_PRIVATE_KEY : process.env.VAHAN_UAT_PRIVATE_KEY
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
        // Keys are now loaded from environment variables
        privateKey: process.env.EWAY_PRIVATE_KEY,
        publicKey: process.env.EWAY_PUBLIC_KEY,
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
        url: process.env.EINVOICE_WHITEBOOKS_URL || 'https://apisandbox.whitebooks.in',
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
  },

  /**
   * FEATURE FLAGS
   * All flags default to OFF for safe gradual rollout
   * Enable via environment variables:
   *   USE_CENTRAL_GATEWAY=true
   *   ENABLE_RETRY=true
   *   etc.
   *
   * SAFETY: All new features are opt-in; existing behavior unchanged when flags are off
   */
  features: {
    // Central Gateway Configuration
    // When enabled, dispatcher can route requests through central API client
    useCentralGateway: process.env.USE_CENTRAL_GATEWAY === 'true',  // Default: OFF
    centralGatewayUrl: process.env.CENTRAL_GATEWAY_URL || 'http://localhost:5000',
    centralGatewayTimeout: parseInt(process.env.CENTRAL_GATEWAY_TIMEOUT) || 45000,

    // Fallback Configuration
    // When enabled, falls back to direct API calls if central gateway fails
    fallbackOnCentralFailure: process.env.FALLBACK_ON_CENTRAL_FAILURE !== 'false',  // Default: ON (safe)

    // Retry Configuration
    // When enabled, retries failed API calls with exponential backoff
    retryEnabled: process.env.ENABLE_RETRY === 'true',  // Default: OFF
    retryMaxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS) || 3,
    retryBaseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS) || 1000,

    // Circuit Breaker Configuration
    // When enabled, uses circuit breaker pattern for external API calls
    circuitBreakerEnabled: process.env.ENABLE_CIRCUIT_BREAKER === 'true',  // Default: OFF
    circuitBreakerFailureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD) || 5,
    circuitBreakerResetTimeout: parseInt(process.env.CB_RESET_TIMEOUT) || 30000,

    // Idempotency Configuration
    // When enabled, uses idempotency middleware for POST requests
    idempotencyEnabled: process.env.ENABLE_IDEMPOTENCY === 'true',  // Default: OFF
    idempotencyAutoGenerate: process.env.IDEMPOTENCY_AUTO_GENERATE === 'true',  // Default: OFF

    // PII Redaction
    // This is always ON for security - cannot be disabled via env var
    piiRedactionEnabled: true,  // ALWAYS ON

    // Token Refresh Mutex
    // This is always ON for stability - cannot be disabled via env var
    tokenMutexEnabled: true,  // ALWAYS ON
  }
};
