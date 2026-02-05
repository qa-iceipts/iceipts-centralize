const express = require('express');
const router = express.Router();
const { PromiseHandler } = require('../middleware/error.handler');
const { vahanRateLimiter } = require('../middleware/api-rate-limiter');
const { authenticateDispatcher } = require('../middleware/dispatcher.auth');
const vahanController = require('../controllers/vahan.controller');
const sendResVehicle = require('../services/vahanApis/rcEnc');
const sendResDL = require('../services/vahanApis/enc');

// Apply VAHAN rate limiter to all routes
router.use(vahanRateLimiter);

// Apply dispatcher authentication
router.use(authenticateDispatcher);

// Local database lookup routes
router.get('/vehicle/:vehicleNumber', PromiseHandler(vahanController.getVehicleFromDB));
router.get('/driver/:dlNumber', PromiseHandler(vahanController.getDriverFromDB));

// VAHAN API validation routes
router.post('/validate-vehicle', sendResVehicle);
router.post('/validate-dl', sendResDL);

// Save data to local database
router.post('/save-vehicle', PromiseHandler(vahanController.saveVehicleData));
router.post('/save-driver', PromiseHandler(vahanController.saveDriverData));

module.exports = router;
