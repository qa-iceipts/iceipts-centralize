const express = require('express');
const router = express.Router();
const { PromiseHandler } = require('../middleware/error.handler');
const { optionalDispatcherAuth } = require('../middleware/dispatcher.auth');
const vahanController = require('../controllers/vahan.controller');
const ewayController = require('../controllers/eway.controller');
const einvoiceController = require('../controllers/einvoice.controller');

// Apply optional dispatcher auth (logs if headers present, but doesn't require them)
router.use(optionalDispatcherAuth);

// VAHAN test routes - no authentication required
router.get('/vahan/vehicle/:vehicleNumber', PromiseHandler(vahanController.getVehicleFromDB));
router.get('/vahan/driver/:dlNumber', PromiseHandler(vahanController.getDriverFromDB));
router.post('/vahan/validate-vehicle', PromiseHandler(vahanController.validateVehicleRC));
router.post('/vahan/validate-dl', PromiseHandler(vahanController.validateDL));
router.post('/vahan/save-vehicle', PromiseHandler(vahanController.saveVehicleData));
router.post('/vahan/save-driver', PromiseHandler(vahanController.saveDriverData));

// eWay Bill test routes - no authentication required
router.post('/eway/generate', PromiseHandler(ewayController.generateEwayBill));
router.post('/eway/cancel', PromiseHandler(ewayController.cancelEwayBill));
router.post('/eway/extend', PromiseHandler(ewayController.extendEwayBill));

// eInvoice test routes - no authentication required
router.post('/einvoice/generate', PromiseHandler(einvoiceController.generateEInvoice));
router.post('/einvoice/cancel', PromiseHandler(einvoiceController.cancelEInvoice));
router.get('/einvoice/irn/:irn', PromiseHandler(einvoiceController.getEInvoiceByIRN));
router.get('/einvoice/details', PromiseHandler(einvoiceController.getEInvoiceByDocDetails));

module.exports = router;
