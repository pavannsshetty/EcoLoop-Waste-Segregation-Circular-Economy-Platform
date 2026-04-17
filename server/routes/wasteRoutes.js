const express = require('express');
const router  = express.Router();
const { createReport, checkDuplicate, upvoteReport, updateReport, deleteReport, getNearbyReports, getMyReports, escalateReport, citizenVerify } = require('../controllers/wasteController');
const { protect } = require('../middleware/auth');

router.post('/report',              protect, createReport);
router.get('/check-duplicate',      protect, checkDuplicate);
router.post('/upvote/:id',          protect, upvoteReport);
router.put('/report/:id',           protect, updateReport);
router.delete('/report/:id',        protect, deleteReport);
router.get('/nearby',               protect, getNearbyReports);
router.get('/my-reports',           protect, getMyReports);
router.post('/report/:id/escalate', protect, escalateReport);
router.post('/report/:id/verify',   protect, citizenVerify);

module.exports = router;
