const express = require('express');
const router = express.Router();
const { PromiseHandler } = require('../middleware/error.handler');
const { ewayRateLimiter } = require('../middleware/api-rate-limiter');
const { authenticateDispatcher } = require('../middleware/dispatcher.auth');
const ewayController = require('../controllers/eway.controller');

// Apply eWay Bill rate limiter to all routes
router.use(ewayRateLimiter);

// Apply dispatcher authentication
router.use(authenticateDispatcher);

// eWay Bill routes
router.post('/generate', PromiseHandler(ewayController.generateEwayBill));
router.post('/cancel', PromiseHandler(ewayController.cancelEwayBill));
router.post('/extend', PromiseHandler(ewayController.extendEwayBill));

module.exports = router;
