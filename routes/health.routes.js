const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// Health check route (no authentication required)
router.get('/', healthController.healthCheck);

module.exports = router;
