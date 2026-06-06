const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { createReport, validateWasteImage, checkDuplicate, upvoteReport, updateReport, deleteReport, getNearbyReports, getMyReports, escalateReport, citizenVerify, collectorVerify, requestClarification, resubmitReport, checkDuplicateEnhanced, supportReport, getReportVerification, checkHomePickupDuplicate } = require('../controllers/wasteController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/uploadMiddleware');

// Collector auth middleware
const collectorAuth = async (req, res, next) => {
  try {
    const Collector = require('../models/Collector');
    const collector = await Collector.findById(req.user.id);
    if (!collector) return res.status(403).json({ message: 'Collector access only.' });
    if (collector.status === 'Inactive') return res.status(403).json({ message: 'Your account is inactive.' });
    req.collector = collector;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Collector access only.', error: err.message });
  }
};

// Memory storage multer — used only for AI image validation (no Cloudinary upload needed)
const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/validate-image',              protect, memUpload.single('image'), validateWasteImage);
router.post('/report',                      protect, upload.single('image'), createReport);
router.get('/check-duplicate',              protect, checkDuplicate);
router.get('/check-duplicate-enhanced',     protect, checkDuplicateEnhanced);
router.get('/check-home-pickup-duplicate',  protect, checkHomePickupDuplicate);
router.post('/upvote/:id',                  protect, upvoteReport);
router.put('/report/:id',                   protect, upload.single('image'), updateReport);
router.delete('/report/:id',                protect, deleteReport);
router.get('/nearby',                       protect, getNearbyReports);
router.get('/my-reports',                   protect, getMyReports);
router.post('/report/:id/escalate',         protect, escalateReport);
router.post('/report/:id/verify',           protect, citizenVerify);

// Collector verification routes
router.put('/report/:id/collector-verify',          protect, collectorAuth, collectorVerify);
router.put('/report/:id/request-clarification',     protect, collectorAuth, requestClarification);

// Citizen resubmit after clarification
router.put('/report/:id/resubmit',                  protect, upload.single('image'), resubmitReport);

// Support existing report
router.post('/report/:id/support',                  protect, supportReport);

// Get verification details
router.get('/report/:id/verification',              protect, getReportVerification);

module.exports = router;
