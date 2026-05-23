const Notification = require('../models/Notification');
const { emitToUser, emitToAll } = require('../socket');
const User = require('../models/User');

// Create a notification (Standard & Targeted)
const createNotification = async (userId, title, message, type = 'System', reportId = null) => {
  try {
    const notification = await Notification.create({ 
      userId, 
      title, 
      message, 
      description: message, 
      type, 
      reportId,
      targetAudience: userId ? 'User' : 'All'
    });
    
    if (userId) {
      emitToUser(userId.toString(), 'notification', {
        ...notification.toObject(),
        unreadCount: await getUnreadCountInternal(userId)
      });
    } else {
      emitToAll('notification', notification);
    }
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

// Admin: Create Broadcast Notification
const adminCreateNotification = async (req, res) => {
  try {
    const { title, description, type, priority, targetAudience, targetVillage, isEvent, eventDetails } = req.body;
    
    const notification = await Notification.create({
      title,
      description,
      message: description,
      type,
      priority,
      targetAudience,
      targetVillage,
      isEvent,
      eventDetails,
      senderId: req.user.id,
      status: 'Active'
    });

    // Real-time delivery based on targeting
    if (targetAudience === 'All') {
      emitToAll('notification', notification);
    } else {
      // For specific roles or villages, we could iterate or use socket rooms
      // Simplified: Emit to all, client-side filters or just emit to all since it's a small app
      emitToAll('notification_broadcast', notification); 
    }

    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// User: Get relevant notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role; // Assuming role is in req.user
    const userVillage = req.user.village;

    // Find notifications that:
    // 1. Are specifically for this user
    // 2. Are for "All"
    // 3. Are for their role
    // 4. Are for their village
    // AND not deleted by them
    const query = {
      $and: [
        { deletedBy: { $ne: userId } },
        { 
          $or: [
            { userId: userId },
            { targetAudience: 'All' },
            { targetAudience: userRole === 'citizen' ? 'Citizens' : userRole === 'collector' ? 'Collectors' : 'Green Champions' },
            { $and: [{ targetAudience: 'Specific Community' }, { targetVillage: userVillage }] }
          ]
        }
      ]
    };

    const notifications = await Notification.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(50);

    // Transform for UI (isRead mapping)
    const result = notifications.map(n => {
      const obj = n.toObject();
      obj.isRead = n.userId ? n.isRead : n.readBy.includes(userId);
      return obj;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const markRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Not found' });

    if (notification.userId) {
      notification.isRead = true;
    } else {
      if (!notification.readBy.includes(userId)) {
        notification.readBy.push(userId);
      }
    }
    await notification.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    // Logic for marking all as read is tricky for global ones. 
    // Usually we just add userId to readBy for all currently visible ones.
    const notifications = await Notification.find({ 
      $or: [
        { userId: userId, isRead: false },
        { targetAudience: { $ne: 'User' }, readBy: { $ne: userId } }
      ]
    });

    for (let n of notifications) {
      if (n.userId) n.isRead = true;
      else n.readBy.push(userId);
      await n.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const getUnreadCountInternal = async (userId) => {
  // Rough estimate helper
  const count = await Notification.countDocuments({
    $or: [
      { userId: userId, isRead: false },
      { targetAudience: { $ne: 'User' }, readBy: { $ne: userId } }
    ]
  });
  return count;
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await getUnreadCountInternal(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Not found' });

    if (notification.userId) {
      await notification.deleteOne();
    } else {
      notification.deletedBy.push(userId);
      await notification.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { 
  createNotification, 
  getNotifications, 
  markRead, 
  markAllRead, 
  getUnreadCount, 
  adminCreateNotification,
  deleteNotification
};
