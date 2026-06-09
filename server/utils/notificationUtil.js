const Notification = require('../models/Notification');
const { emitToUser, emitToAll, emitPopupNotification, emitPopupNotificationBulk, broadcastPopupNotification } = require('../socket');

/**
 * Notification types and their metadata
 */
const NOTIFICATION_TYPES = {
  PUBLIC_WASTE_REPORT: 'public_waste_report',
  HOME_PICKUP_REQUEST: 'home_pickup_request',
  SCRAP_COLLECTION: 'scrap_collection',
  COLLECTOR_ASSIGNMENT: 'collector_assignment',
  GREEN_CHAMPION_REQUEST: 'green_champion_request',
  APPROVAL_REQUEST: 'approval_request',
  ECO_SHOPPING_ORDER: 'eco_shopping_order',
  ECO_PRODUCT_PURCHASE: 'eco_product_purchase',
  COMMUNITY_ACTIVITY: 'community_activity',
  REWARD_EVENT: 'reward_event',
  BROADCAST_MESSAGE: 'broadcast_message',
  REPORT_STATUS_UPDATE: 'report_status_update',
  PICKUP_STATUS_UPDATE: 'pickup_status_update',
  SCRAP_STATUS_UPDATE: 'scrap_status_update',
  ORDER_STATUS_UPDATE: 'order_status_update',
  VERIFICATION_REQUIRED: 'verification_required',
  REPORT_APPROVED: 'report_approved',
  REPORT_REJECTED: 'report_rejected',
  REWARD_EARNED: 'reward_earned',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
};

/**
 * Notification actions and their URLs
 */
const ACTION_URLS = {
  PUBLIC_WASTE_REPORT: '/collector/waste-reports',
  HOME_PICKUP_REQUEST: '/collector/pickup-requests',
  SCRAP_COLLECTION: '/collector/scrap-requests',
  COLLECTOR_ASSIGNMENT: '/collector/my-assignments',
  GREEN_CHAMPION_REQUEST: '/green-champion/requests',
  APPROVAL_REQUEST: '/admin/approvals',
  ECO_SHOPPING_ORDER: '/citizen/orders',
  ECO_PRODUCT_PURCHASE: '/citizen/purchases',
  COMMUNITY_ACTIVITY: '/community/activities',
  REWARD_EVENT: '/rewards',
};

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Unread count
 */
const getUnreadCountForUser = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      userId: userId,
      isRead: false,
    });
    return count;
  } catch (err) {
    console.error('[notificationUtil] Error getting unread count:', err.message);
    return 0;
  }
};

/**
 * Create and store a notification, emit to user
 * @param {string} userId - User ID to receive notification
 * @param {string} type - Notification type
 * @param {object} data - Notification data
 * @param {string} data.title - Notification title
 * @param {string} data.message - Notification message/description
 * @param {string} data.reportId - Related report/request ID
 * @param {string} data.citizenName - Citizen/User name
 * @param {string} data.location - Location/Area
 * @param {string} data.priority - Priority level (Low, Medium, High, Critical)
 * @returns {Promise<object>} - Created notification document
 */
const createUserNotification = async (userId, type, data = {}) => {
  try {
    if (!userId || !type) {
      console.error('[notificationUtil] Missing userId or type', { userId, type });
      return null;
    }

    const notification = await Notification.create({
      userId: userId,
      title: data.title || 'EcoLoop Notification',
      description: data.message || data.description || '',
      message: data.message || data.description || '',
      type: type,
      priority: data.priority || 'Medium',
      targetAudience: 'User',
      reportId: data.reportId || null,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Emit real-time notification
    emitToUser(userId.toString(), 'notification', {
      ...notification.toObject(),
      unreadCount: await getUnreadCountForUser(userId),
    });

    // Also emit as popup notification
    emitPopupNotification(userId.toString(), {
      ...notification.toObject(),
      actionUrl: ACTION_URLS[type] || '/notifications',
    });

    return notification;
  } catch (err) {
    console.error('[notificationUtil] Error creating user notification:', err.message);
    return null;
  }
};

/**
 * Create and broadcast a notification to multiple users
 * @param {array} userIds - Array of user IDs
 * @param {string} type - Notification type
 * @param {object} data - Notification data
 * @returns {Promise<array>} - Created notification documents
 */
const createBulkNotification = async (userIds, type, data = {}) => {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];

    const notifications = await Notification.insertMany(
      userIds.map(uid => ({
        userId: uid,
        title: data.title || 'EcoLoop Notification',
        description: data.message || data.description || '',
        message: data.message || data.description || '',
        type: type,
        priority: data.priority || 'Medium',
        targetAudience: 'User',
        reportId: data.reportId || null,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );

    // Emit to each user
    for (const notification of notifications) {
      emitToUser(notification.userId.toString(), 'notification', notification.toObject());
      emitPopupNotification(notification.userId.toString(), {
        ...notification.toObject(),
        actionUrl: ACTION_URLS[type] || '/notifications',
      });
    }

    return notifications;
  } catch (err) {
    console.error('[notificationUtil] Error creating bulk notifications:', err.message);
    return [];
  }
};

/**
 * Create a broadcast notification (admin)
 * @param {object} data - Notification data
 * @returns {Promise<object>} - Created notification document
 */
const createBroadcastNotification = async (data = {}) => {
  try {
    const notification = await Notification.create({
      title: data.title || 'EcoLoop Announcement',
      description: data.message || data.description || '',
      message: data.message || data.description || '',
      type: data.type || NOTIFICATION_TYPES.BROADCAST_MESSAGE,
      priority: data.priority || 'Medium',
      targetAudience: data.targetAudience || 'All',
      targetVillage: data.targetVillage || null,
      isEvent: data.isEvent || false,
      eventDetails: data.eventDetails || {},
      senderId: data.senderId || null,
      status: data.status || 'Active',
      scheduledFor: data.scheduledFor || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Emit to all users
    broadcastPopupNotification({
      ...notification.toObject(),
      actionUrl: '/notifications',
    });

    return notification;
  } catch (err) {
    console.error('[notificationUtil] Error creating broadcast notification:', err.message);
    return null;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<object>} - Updated notification
 */
const markNotificationAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true, updatedAt: new Date() },
      { new: true }
    );
    return notification;
  } catch (err) {
    console.error('[notificationUtil] Error marking notification as read:', err.message);
    return null;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Update result
 */
const markAllNotificationsAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { userId: userId, isRead: false },
      { isRead: true, updatedAt: new Date() }
    );
    return result;
  } catch (err) {
    console.error('[notificationUtil] Error marking all notifications as read:', err.message);
    return null;
  }
};

/**
 * Prevent duplicate notifications
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} reportId - Related report/request ID
 * @param {number} minutesWindow - Time window in minutes (default 5)
 * @returns {Promise<boolean>} - True if duplicate exists
 */
const checkDuplicateNotification = async (userId, type, reportId, minutesWindow = 5) => {
  try {
    const timeWindow = new Date(Date.now() - minutesWindow * 60 * 1000);
    const duplicate = await Notification.findOne({
      userId: userId,
      type: type,
      reportId: reportId,
      createdAt: { $gte: timeWindow },
    });
    return !!duplicate;
  } catch (err) {
    console.error('[notificationUtil] Error checking duplicate:', err.message);
    return false;
  }
};

/**
 * Send notification for public waste report submission
 * @param {string} collectorId - Collector ID
 * @param {object} report - Waste report data
 */
const notifyPublicWasteReport = async (collectorId, report) => {
  try {
    const isDuplicate = await checkDuplicateNotification(
      collectorId,
      NOTIFICATION_TYPES.PUBLIC_WASTE_REPORT,
      report._id
    );
    if (isDuplicate) return null;

    return await createUserNotification(collectorId, NOTIFICATION_TYPES.PUBLIC_WASTE_REPORT, {
      title: 'New Public Waste Report Assigned',
      message: `New waste report assigned: ${report.reportType || 'Waste'} at ${report.area || 'Unknown Location'}`,
      reportId: report._id,
      citizenName: report.submittedBy?.name || 'Unknown Citizen',
      location: report.area || report.latitude + ', ' + report.longitude,
      priority: report.severity || 'Medium',
    });
  } catch (err) {
    console.error('[notificationUtil] Error notifying public waste report:', err.message);
    return null;
  }
};

/**
 * Send notification for home pickup request
 * @param {string} collectorId - Collector ID
 * @param {object} pickup - Pickup request data
 */
const notifyHomePickupRequest = async (collectorId, pickup) => {
  try {
    const isDuplicate = await checkDuplicateNotification(
      collectorId,
      NOTIFICATION_TYPES.HOME_PICKUP_REQUEST,
      pickup._id
    );
    if (isDuplicate) return null;

    return await createUserNotification(collectorId, NOTIFICATION_TYPES.HOME_PICKUP_REQUEST, {
      title: 'New Home Pickup Request',
      message: `Pickup request for ${pickup.wasteType || 'waste'} at ${pickup.address || 'Unknown Address'}`,
      reportId: pickup._id,
      citizenName: pickup.userId?.name || 'Unknown Citizen',
      location: pickup.address || pickup.latitude + ', ' + pickup.longitude,
      priority: 'High',
    });
  } catch (err) {
    console.error('[notificationUtil] Error notifying home pickup request:', err.message);
    return null;
  }
};

/**
 * Send notification for scrap collection request
 * @param {string} collectorId - Collector ID
 * @param {object} scrapRequest - Scrap request data
 */
const notifyScrapCollection = async (collectorId, scrapRequest) => {
  try {
    const isDuplicate = await checkDuplicateNotification(
      collectorId,
      NOTIFICATION_TYPES.SCRAP_COLLECTION,
      scrapRequest._id
    );
    if (isDuplicate) return null;

    return await createUserNotification(collectorId, NOTIFICATION_TYPES.SCRAP_COLLECTION, {
      title: 'New Scrap Collection Request',
      message: `Scrap request for ${scrapRequest.scrapType || 'scrap'} collection at ${scrapRequest.location || 'Unknown Location'}`,
      reportId: scrapRequest._id,
      citizenName: scrapRequest.userId?.name || 'Unknown Citizen',
      location: scrapRequest.location || scrapRequest.latitude + ', ' + scrapRequest.longitude,
      priority: 'Medium',
    });
  } catch (err) {
    console.error('[notificationUtil] Error notifying scrap collection:', err.message);
    return null;
  }
};

/**
 * Send notification for collector assignment
 * @param {string} collectorId - Collector ID
 * @param {object} data - Assignment data
 */
const notifyCollectorAssignment = async (collectorId, data = {}) => {
  try {
    const isDuplicate = await checkDuplicateNotification(
      collectorId,
      NOTIFICATION_TYPES.COLLECTOR_ASSIGNMENT,
      data.reportId,
      10
    );
    if (isDuplicate) return null;

    return await createUserNotification(collectorId, NOTIFICATION_TYPES.COLLECTOR_ASSIGNMENT, {
      title: 'New Task Assignment',
      message: data.message || `You have been assigned a new task: ${data.taskType || 'Task'}`,
      reportId: data.reportId,
      location: data.location || 'Unknown Location',
      priority: data.priority || 'High',
    });
  } catch (err) {
    console.error('[notificationUtil] Error notifying collector assignment:', err.message);
    return null;
  }
};

/**
 * Send notification for green champion request
 * @param {string} gcId - Green Champion ID
 * @param {object} data - Request data
 */
const notifyGreenChampionRequest = async (gcId, data = {}) => {
  try {
    const isDuplicate = await checkDuplicateNotification(
      gcId,
      NOTIFICATION_TYPES.GREEN_CHAMPION_REQUEST,
      data.requestId,
      10
    );
    if (isDuplicate) return null;

    return await createUserNotification(gcId, NOTIFICATION_TYPES.GREEN_CHAMPION_REQUEST, {
      title: 'New Green Champion Request',
      message: data.message || 'You have a new request waiting for action.',
      reportId: data.requestId,
      priority: 'High',
    });
  } catch (err) {
    console.error('[notificationUtil] Error notifying green champion request:', err.message);
    return null;
  }
};

/**
 * Send notification for approval request
 * @param {string} userId - User ID (admin/approver)
 * @param {object} data - Request data
 */
const notifyApprovalRequest = async (userId, data = {}) => {
  try {
    const isDuplicate = await checkDuplicateNotification(
      userId,
      NOTIFICATION_TYPES.APPROVAL_REQUEST,
      data.requestId,
      10
    );
    if (isDuplicate) return null;

    return await createUserNotification(userId, NOTIFICATION_TYPES.APPROVAL_REQUEST, {
      title: 'Approval Request Pending',
      message: data.message || 'A new approval request requires your attention.',
      reportId: data.requestId,
      priority: 'High',
    });
  } catch (err) {
    console.error('[notificationUtil] Error notifying approval request:', err.message);
    return null;
  }
};

/**
 * Send notification for eco shopping order
 * @param {string} userId - User ID
 * @param {object} order - Order data
 */
const notifyEcoShoppingOrder = async (userId, order) => {
  try {
    const isDuplicate = await checkDuplicateNotification(
      userId,
      NOTIFICATION_TYPES.ECO_SHOPPING_ORDER,
      order._id,
      5
    );
    if (isDuplicate) return null;

    return await createUserNotification(userId, NOTIFICATION_TYPES.ECO_SHOPPING_ORDER, {
      title: 'Order Placed Successfully',
      message: `Your eco-shopping order #${order.orderId || order._id.toString().slice(-6)} has been placed.`,
      reportId: order._id,
      priority: 'Medium',
    });
  } catch (err) {
    console.error('[notificationUtil] Error notifying eco shopping order:', err.message);
    return null;
  }
};

/**
 * Send notification for status update
 * @param {string} userId - User ID
 * @param {string} type - Update type (report, pickup, scrap, order)
 * @param {string} id - Entity ID
 * @param {string} status - New status
 */
const notifyStatusUpdate = async (userId, type, id, status) => {
  try {
    const typeMap = {
      report: NOTIFICATION_TYPES.REPORT_STATUS_UPDATE,
      pickup: NOTIFICATION_TYPES.PICKUP_STATUS_UPDATE,
      scrap: NOTIFICATION_TYPES.SCRAP_STATUS_UPDATE,
      order: NOTIFICATION_TYPES.ORDER_STATUS_UPDATE,
    };

    const titleMap = {
      report: 'Report Status Updated',
      pickup: 'Pickup Request Status Updated',
      scrap: 'Scrap Request Status Updated',
      order: 'Order Status Updated',
    };

    const isDuplicate = await checkDuplicateNotification(userId, typeMap[type], id, 5);
    if (isDuplicate) return null;

    return await createUserNotification(userId, typeMap[type], {
      title: titleMap[type],
      message: `Your ${type} status has been updated to: ${status}`,
      reportId: id,
      priority: status === 'Resolved' || status === 'Delivered' ? 'Low' : 'Medium',
    });
  } catch (err) {
    console.error('[notificationUtil] Error notifying status update:', err.message);
    return null;
  }
};

/**
 * Send reward earned notification
 * @param {string} userId - User ID
 * @param {number} points - Points earned
 * @param {string} reason - Reason for reward
 */
const notifyRewardEarned = async (userId, points, reason) => {
  try {
    return await createUserNotification(userId, NOTIFICATION_TYPES.REWARD_EARNED, {
      title: 'Reward Earned',
      message: `You earned ${points} eco-points for: ${reason}`,
      priority: 'Medium',
    });
  } catch (err) {
    console.error('[notificationUtil] Error notifying reward earned:', err.message);
    return null;
  }
};

module.exports = {
  NOTIFICATION_TYPES,
  ACTION_URLS,
  createUserNotification,
  createBulkNotification,
  createBroadcastNotification,
  getUnreadCountForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkDuplicateNotification,
  notifyPublicWasteReport,
  notifyHomePickupRequest,
  notifyScrapCollection,
  notifyCollectorAssignment,
  notifyGreenChampionRequest,
  notifyApprovalRequest,
  notifyEcoShoppingOrder,
  notifyStatusUpdate,
  notifyRewardEarned,
};
