const express = require('express');
const router = express.Router();
const { PromiseHandler } = require('../middleware/error.handler');
const metricsController = require('../controllers/metrics.controller');

// Metrics route (consider adding authentication in production)
router.get('/', PromiseHandler(metricsController.getMetrics));

// Monthly VAHAN API usage (successful calls only)
// GET /api/metrics/vahan/monthly?year=2026&dispatcherId=xyz
router.get('/vahan/monthly', PromiseHandler(metricsController.getMonthlyVahanUsage));

// VAHAN API usage by endpoint breakdown
// GET /api/metrics/vahan/endpoints?startDate=2026-01-01&endDate=2026-01-31
router.get('/vahan/endpoints', PromiseHandler(metricsController.getVahanUsageByEndpoint));

module.exports = router;
