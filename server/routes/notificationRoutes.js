const express = require('express');
const router  = express.Router();
const { 
  getNotifications, 
  markRead, 
  markAllRead, 
  getUnreadCount, 
  adminCreateNotification,
  deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const { adminProtect } = require('../middleware/adminAuth');

router.get('/',              protect, getNotifications);
router.get('/unread-count',  protect, getUnreadCount);
router.put('/read/:id',      protect, markRead);
router.put('/read-all',      protect, markAllRead);
router.delete('/:id',        protect, deleteNotification);

// Admin Routes
router.post('/admin',        protect, adminProtect, adminCreateNotification);

module.exports = router;
