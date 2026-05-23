const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { getRewardsProfile } = require('../controllers/rewardsController');

router.get('/profile', protect, getRewardsProfile);

module.exports = router;
