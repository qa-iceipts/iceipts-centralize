const express = require('express');
const router = express.Router();
const { PromiseHandler } = require('../middleware/error.handler');
const metricsController = require('../controllers/metrics.controller');

// Metrics route (consider adding authentication in production)
router.get('/', PromiseHandler(metricsController.getMetrics));

module.exports = router;
