const createHttpError = require('http-errors');
const logger = require('../helpers/logger');
const db = require('../models');

/**
 * Middleware to authenticate dispatcher using custom headers
 * Required headers:
 * - X-Dispatcher-ID
 * - X-Mine-ID
 * - X-Org-ID
 */
async function authenticateDispatcher(req, res, next) {
  try {
    const dispatcherId = req.headers['x-dispatcher-id'];
    const mineId = req.headers['x-mine-id'];
    const orgId = req.headers['x-org-id'];

    if (!dispatcherId || !mineId || !orgId) {
      throw new createHttpError.Unauthorized(
        'Missing required dispatcher identity headers (X-Dispatcher-ID, X-Mine-ID, X-Org-ID)'
      );
    }

    // Optional: Validate dispatcher in database
    // Uncomment if you want to enforce database validation
    /*
    const dispatcher = await db.dispatcher.findOne({
      where: {
        dispatcherId,
        mineId,
        orgId,
        isActive: true
      }
    });

    if (!dispatcher) {
      throw new createHttpError.Forbidden('Invalid or inactive dispatcher');
    }

    req.dispatcher = dispatcher;
    */

    // For now, just attach the dispatcher info to request
    req.dispatcher = {
      dispatcherId,
      mineId,
      orgId
    };

    logger.info('Dispatcher authenticated', {
      dispatcherId,
      mineId,
      orgId,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('Dispatcher authentication failed', {
      error: error.message,
      headers: req.headers
    });
    next(error);
  }
}

/**
 * Optional middleware - only logs dispatcher info if headers are present
 */
function optionalDispatcherAuth(req, res, next) {
  const dispatcherId = req.headers['x-dispatcher-id'];
  const mineId = req.headers['x-mine-id'];
  const orgId = req.headers['x-org-id'];

  if (dispatcherId && mineId && orgId) {
    req.dispatcher = {
      dispatcherId,
      mineId,
      orgId
    };
    logger.info('Optional dispatcher info captured', {
      dispatcherId,
      mineId,
      orgId
    });
  }

  next();
}

module.exports = {
  authenticateDispatcher,
  optionalDispatcherAuth
};
