const express = require('express');
const router  = express.Router();
const { 
  createScrapRequest, 
  getUserScrapRequests, 
  getCollectorScrapTasks, 
  assignCollector, 
  updateScrapStatus,
  getUserStats
} = require('../controllers/scrapController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/uploadMiddleware');

router.post('/create',      protect, upload.single('image'), createScrapRequest);
router.get('/user/stats',   protect, getUserStats);
router.get('/user/:userId', protect, getUserScrapRequests);
router.get('/collector',    protect, getCollectorScrapTasks);
router.put('/assign/:id',   protect, assignCollector);
router.put('/update-status/:id', protect, updateScrapStatus);

module.exports = router;
