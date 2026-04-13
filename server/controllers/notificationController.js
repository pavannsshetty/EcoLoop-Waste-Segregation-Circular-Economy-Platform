const Notification = require('../models/Notification');
const { emitToUser } = require('../socket');

const createNotification = async (userId, title, message, type = 'report', reportId = null) => {
  try {
    const notification = await Notification.create({ userId, title, message, type, reportId });
    // Emit real-time event
    emitToUser(userId.toString(), 'notification', notification);
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const markRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

module.exports = { createNotification, getNotifications, markRead, markAllRead, getUnreadCount };
