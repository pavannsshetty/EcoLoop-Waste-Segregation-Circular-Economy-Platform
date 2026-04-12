const express = require('express');
const router  = express.Router();
const { adminLogin, addCollector, getNextCollectorId, getDashboardStats } = require('../controllers/adminController');
const { adminProtect } = require('../middleware/adminAuth');

router.post('/login',           adminLogin);
router.get('/next-collector-id', adminProtect, getNextCollectorId);
router.post('/add-collector',   adminProtect, addCollector);
router.get('/dashboard',        adminProtect, getDashboardStats);

module.exports = router;
