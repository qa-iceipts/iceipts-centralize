const axios = require('axios');
const logger = require('../../helpers/logger');
const createHttpError = require('http-errors');

/**
 * Generic proxy service for making HTTP requests to external APIs
 */
class ProxyService {
  constructor(baseURL, timeout = 30000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Making API request', {
          url: config.url,
          method: config.method
        });
        return config;
      },
      (error) => {
        logger.error('Request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('API response received', {
          url: response.config.url,
          status: response.status
        });
        return response;
      },
      (error) => {
        logger.error('Response error', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make GET request
   */
  async get(url, config = {}) {
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Make POST request
   */
  async post(url, data, config = {}) {
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Make PUT request
   */
  async put(url, data, config = {}) {
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Make DELETE request
   */
  async delete(url, config = {}) {
    try {
      const response = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error
      throw new createHttpError[error.response.status](
        error.response.data?.message || error.message
      );
    } else if (error.request) {
      // No response received
      throw new createHttpError.ServiceUnavailable(
        'No response from external API'
      );
    } else {
      // Request setup error
      throw new createHttpError.InternalServerError(error.message);
    }
  }
}

module.exports = ProxyService;
