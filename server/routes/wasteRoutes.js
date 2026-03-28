const express = require('express');
const router  = express.Router();
const { createReport, checkDuplicate, upvoteReport, getMyReports } = require('../controllers/wasteController');
const { protect } = require('../middleware/auth');

router.post('/report',              protect, createReport);
router.get('/check-duplicate',      protect, checkDuplicate);
router.post('/upvote/:id',          protect, upvoteReport);
router.get('/my-reports',           protect, getMyReports);

module.exports = router;
