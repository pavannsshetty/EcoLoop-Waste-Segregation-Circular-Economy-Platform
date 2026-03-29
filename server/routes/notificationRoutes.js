const express = require('express');
const router  = express.Router();
const { getNotifications, markRead, markAllRead, getUnreadCount } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/',              protect, getNotifications);
router.get('/unread-count',  protect, getUnreadCount);
router.put('/read/:id',      protect, markRead);
router.put('/read-all',      protect, markAllRead);

module.exports = router;
