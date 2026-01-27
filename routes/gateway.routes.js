const express = require('express');
const router = express.Router();

// Mount sub-routes
router.use('/vahan', require('./vahan.routes'));
router.use('/eway', require('./eway.routes'));
router.use('/einvoice', require('./einvoice.routes'));

module.exports = router;
