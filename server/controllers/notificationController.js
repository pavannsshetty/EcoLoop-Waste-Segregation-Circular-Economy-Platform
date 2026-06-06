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
    const { title, description, type, priority, targetAudience, targetVillage, isEvent, eventDetails, status, scheduledFor } = req.body;
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
      senderId: req.admin?.id || req.user?.id,
      status: status || 'Active',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    });

    if (notification.status === 'Active') {
      if (targetAudience === 'All') {
        emitToAll('notification', notification);
      } else {
        emitToAll('notification_broadcast', notification);
      }
    }

    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Admin: Get Broadcast History
const adminGetBroadcasts = async (req, res) => {
  try {
    const { search, status, type, audience } = req.query;
    const query = { userId: null };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (status && status !== 'All') query.status = status;
    if (type && type !== 'All') query.type = type;
    if (audience && audience !== 'All') query.targetAudience = audience;

    const broadcasts = await Notification.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json(broadcasts);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const adminUpdateNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Not found' });

    const { title, description, type, priority, targetAudience, targetVillage, isEvent, eventDetails, status, scheduledFor } = req.body;
    notification.title = title || notification.title;
    notification.description = description || notification.description;
    notification.message = description || notification.message;
    notification.type = type || notification.type;
    notification.priority = priority || notification.priority;
    notification.targetAudience = targetAudience || notification.targetAudience;
    notification.targetVillage = targetVillage || notification.targetVillage;
    notification.isEvent = typeof isEvent === 'boolean' ? isEvent : notification.isEvent;
    notification.eventDetails = eventDetails || notification.eventDetails;
    notification.status = status || notification.status;
    notification.scheduledFor = scheduledFor ? new Date(scheduledFor) : notification.scheduledFor;

    await notification.save();

    if (notification.status === 'Active') {
      if (notification.targetAudience === 'All') {
        emitToAll('notification', notification);
      } else {
        emitToAll('notification_broadcast', notification);
      }
    }

    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// User: Get relevant notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('role village');
    const userRole = user?.role;
    const userVillage = user?.village || '';

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
    const user = await User.findById(userId).select('role village');
    const userRole = user?.role;
    const userVillage = user?.village || '';
    const audienceRole = userRole === 'citizen' ? 'Citizens' : userRole === 'collector' ? 'Collectors' : 'Green Champions';

    await Notification.updateMany(
      { userId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    await Notification.updateMany(
      {
        deletedBy: { $ne: userId },
        readBy: { $ne: userId },
        $or: [
          { targetAudience: 'All' },
          { targetAudience: audienceRole },
          { $and: [{ targetAudience: 'Specific Community' }, { targetVillage: userVillage }] }
        ]
      },
      { $addToSet: { readBy: userId } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error in markAllRead:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
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

// Admin: Delete Broadcast (hard delete)
const adminDeleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Broadcast not found' });
    await notification.deleteOne();
    res.json({ success: true, message: 'Broadcast deleted permanently.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

module.exports = { 
  createNotification, 
  getNotifications, 
  markRead, 
  markAllRead, 
  getUnreadCount, 
  adminCreateNotification,
  adminGetBroadcasts,
  adminUpdateNotification,
  adminDeleteNotification,
  deleteNotification
};
