const express = require('express');
const router = express.Router();
const { PromiseHandler } = require('../middleware/error.handler');
const { einvoiceRateLimiter } = require('../middleware/api-rate-limiter');
const { authenticateDispatcher } = require('../middleware/dispatcher.auth');
const einvoiceController = require('../controllers/einvoice.controller');

// Apply eInvoice rate limiter to all routes
router.use(einvoiceRateLimiter);

// Apply dispatcher authentication
router.use(authenticateDispatcher);

// eInvoice routes
router.post('/generate', PromiseHandler(einvoiceController.generateEInvoice));
router.post('/cancel', PromiseHandler(einvoiceController.cancelEInvoice));
router.get('/irn/:irn', PromiseHandler(einvoiceController.getEInvoiceByIRN));
router.get('/details', PromiseHandler(einvoiceController.getEInvoiceByDocDetails));

module.exports = router;
