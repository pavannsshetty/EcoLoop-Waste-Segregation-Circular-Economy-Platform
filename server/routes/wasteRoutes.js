const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { createReport, validateWasteImage, checkDuplicate, upvoteReport, updateReport, deleteReport, getNearbyReports, getMyReports, escalateReport, citizenVerify } = require('../controllers/wasteController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/uploadMiddleware');

// Memory storage multer — used only for AI image validation (no Cloudinary upload needed)
const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/validate-image',      protect, memUpload.single('image'), validateWasteImage);
router.post('/report',              protect, upload.single('image'), createReport);
router.get('/check-duplicate',      protect, checkDuplicate);
router.post('/upvote/:id',          protect, upvoteReport);
router.put('/report/:id',           protect, upload.single('image'), updateReport);
router.delete('/report/:id',        protect, deleteReport);
router.get('/nearby',               protect, getNearbyReports);
router.get('/my-reports',           protect, getMyReports);
router.post('/report/:id/escalate', protect, escalateReport);
router.post('/report/:id/verify',   protect, citizenVerify);

module.exports = router;
