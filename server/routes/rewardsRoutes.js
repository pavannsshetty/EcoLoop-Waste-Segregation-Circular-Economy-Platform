const express = require('express');
const router  = express.Router();
const { getRewards } = require('../controllers/rewardsController');
const { protect }   = require('../middleware/auth');

router.get('/', protect, getRewards);

module.exports = router;
