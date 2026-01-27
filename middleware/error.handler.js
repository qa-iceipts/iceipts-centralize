const logger = require('../helpers/logger');
const createHttpError = require('http-errors');

/**
 * Handle known HTTP errors
 */
const handleKnownExceptions = (err, res) => {
  logger.error('Known Exception', {
    error: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    errorCodes: err.errorCodes,
    errorDetails: err.errorDetails
  });

  res.status(err.statusCode || 500).json({
    success: false,
    status: err.statusCode || 500,
    error_message: err.message,
    expose: err.expose,
    errorCodes: err.errorCodes,
    errorDetails: err.errorDetails
  });
};

/**
 * Handle unknown/unexpected errors
 */
const handleUnknownExceptions = (err, res) => {
  logger.error('Unknown Exception', {
    error: err.message,
    stack: err.stack,
    errorCodes: err.errorCodes,
    errorDetails: err.errorDetails
  });

  res.status(500).json({
    success: false,
    status: 500,
    error_message: 'Internal Server Error',
    expose: false,
    errorCodes: err.errorCodes || 'UNKNOWN',
    errorDetails: err.errorDetails
  });
};

/**
 * Main error handler middleware
 */
const handleError = (err, req, res, next) => {
  // Handle axios errors
  if (err.isAxiosError && err.response) {
    logger.error('Axios Error', {
      status: err.response.status,
      data: err.response.data
    });
    return res.status(err.response.status || 500).json({
      success: false,
      status: err.response.status || 500,
      error_message: err.response.data?.message || err.message,
      external_api_error: true,
      errorCodes: err.response.data?.errorCodes || 'UNKNOWN',
      errorDetails: err.response.data
    });
  }

  // Handle Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    logger.error('Validation Error', { errors: err.errors });
    return res.status(400).json({
      success: false,
      status: 400,
      error_message: 'Validation Error',
      errors: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }

  if (err.name === 'SequelizeDatabaseError') {
    logger.error('Database Error', { error: err.message });
    return res.status(500).json({
      success: false,
      status: 500,
      error_message: 'Database Error'
    });
  }

  // Handle known HTTP errors (from http-errors package)
  if (createHttpError.isHttpError(err)) {
    return handleKnownExceptions(err, res);
  }

  // Handle all other errors
  return handleUnknownExceptions(err, res);
};

/**
 * 404 handler
 */
const handle404 = (req, res, next) => {
  const error = createHttpError.NotFound('Route not found');
  next(error);
};

/**
 * Promise handler wrapper
 */
const PromiseHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  handleError,
  handle404,
  PromiseHandler,
  notFoundHandler: handle404,
  globalErrorHandler: handleError
};
