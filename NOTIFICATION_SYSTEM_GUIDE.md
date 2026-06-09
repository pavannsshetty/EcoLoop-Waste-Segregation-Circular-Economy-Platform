# EcoLoop Real-Time Notification System Integration Guide

## Overview
The notification system has been implemented with real-time socket.io integration for the EcoLoop platform. This guide explains how to use it across different modules.

## Backend Setup

### 1. Import the Notification Utility
```javascript
const { 
  notifyPublicWasteReport,
  notifyHomePickupRequest,
  notifyScrapCollection,
  notifyCollectorAssignment,
  notifyGreenChampionRequest,
  notifyApprovalRequest,
  notifyEcoShoppingOrder,
  notifyStatusUpdate,
  notifyRewardEarned,
  NOTIFICATION_TYPES
} = require('../utils/notificationUtil');
```

### 2. Notification Types Available
```javascript
NOTIFICATION_TYPES.PUBLIC_WASTE_REPORT       // New public waste report
NOTIFICATION_TYPES.HOME_PICKUP_REQUEST       // Home pickup request
NOTIFICATION_TYPES.SCRAP_COLLECTION          // Scrap collection request
NOTIFICATION_TYPES.COLLECTOR_ASSIGNMENT      // Collector assigned to task
NOTIFICATION_TYPES.GREEN_CHAMPION_REQUEST    // Green champion request
NOTIFICATION_TYPES.APPROVAL_REQUEST          // Approval needed
NOTIFICATION_TYPES.ECO_SHOPPING_ORDER        // Order placed
NOTIFICATION_TYPES.ECO_PRODUCT_PURCHASE      // Product purchased
NOTIFICATION_TYPES.COMMUNITY_ACTIVITY        // Community event
NOTIFICATION_TYPES.REWARD_EVENT              // Reward event
NOTIFICATION_TYPES.BROADCAST_MESSAGE         // Admin broadcast
NOTIFICATION_TYPES.REPORT_STATUS_UPDATE      // Report status changed
NOTIFICATION_TYPES.PICKUP_STATUS_UPDATE      // Pickup status changed
NOTIFICATION_TYPES.SCRAP_STATUS_UPDATE       // Scrap status changed
NOTIFICATION_TYPES.ORDER_STATUS_UPDATE       // Order status changed
NOTIFICATION_TYPES.VERIFICATION_REQUIRED     // Verification needed
NOTIFICATION_TYPES.REPORT_APPROVED           // Report approved
NOTIFICATION_TYPES.REPORT_REJECTED           // Report rejected
NOTIFICATION_TYPES.REWARD_EARNED             // Reward earned
NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED      // Achievement unlocked
```

### 3. Using Notification Functions

#### Notify Public Waste Report (When collector is assigned)
```javascript
const { notifyPublicWasteReport } = require('../utils/notificationUtil');

// In collectorRoutes.js or where collector accepts a task
await notifyPublicWasteReport(collectorId, wasteReport);
```

**What it does:**
- Creates a notification for the assigned collector
- Emits real-time popup notification
- Stores in database
- Automatically prevents duplicates within 5 minutes

#### Notify Home Pickup Request
```javascript
const { notifyHomePickupRequest } = require('../utils/notificationUtil');

// When home pickup is submitted/assigned
await notifyHomePickupRequest(collectorId, pickupRequest);
```

#### Notify Status Updates
```javascript
const { notifyStatusUpdate } = require('../utils/notificationUtil');

// When report/pickup/scrap/order status changes
await notifyStatusUpdate(
  userId,           // User to notify
  'report',         // Type: report, pickup, scrap, order
  reportId,         // Entity ID
  'In Progress'     // New status
);
```

#### Notify Rewards
```javascript
const { notifyRewardEarned } = require('../utils/notificationUtil');

// When user earns rewards
await notifyRewardEarned(
  userId,
  points,           // Points earned
  'Report Submitted' // Reason
);
```

### 4. Frontend Socket Events

The frontend automatically listens for:
- `popup_notification` - Real-time popup notifications
- `notification` - Center notifications

These are handled by the `NotificationQueue` component in all layouts.

## Frontend Setup

### 1. NotificationQueue Component
The NotificationQueue is already integrated into all layouts:
- `CollectorLayout`
- `CitizenLayout`
- `GreenChampionLayout`
- `AdminLayout`

### 2. Audio Setup
Sound notifications use: `/sound-popup.mp3` (already in assets)

The sound plays automatically when a popup notification appears.

### 3. Notification Icons
Icons are automatically mapped by type:
```javascript
public_waste_report       → Bell icon (green)
home_pickup_request       → Home icon (blue)
scrap_collection          → Recycle icon (emerald)
collector_assignment      → Check icon (teal)
green_champion_request    → Sparkles icon (purple)
approval_request          → Exclamation icon (orange)
eco_shopping_order        → Shopping cart (indigo)
reward_earned             → Trophy icon (yellow)
```

## Controller Integration Examples

### Waste Controller
```javascript
// In wasteController.js - when collector accepts a report
const { notifyPublicWasteReport } = require('../utils/notificationUtil');

try {
  const locked = await WasteReport.findByIdAndUpdate(
    req.params.id,
    { assignedCollector: cid, status: 'Assigned', isLocked: true, lockedAt: new Date() },
    { new: true }
  );
  
  if (locked) {
    // Notify the collector
    await notifyPublicWasteReport(cid, locked);
  }
} catch (err) {
  console.error(err);
}
```

### Scrap Controller
```javascript
// In scrapController.js
const { notifyScrapCollection, notifyStatusUpdate } = require('../utils/notificationUtil');

// When scrap request is assigned
await notifyScrapCollection(collectorId, scrapRequest);

// When status changes
await notifyStatusUpdate(userId, 'scrap', requestId, newStatus);
```

### Eco Shopping Controller
```javascript
// In ecoShoppingController.js
const { notifyEcoShoppingOrder, notifyStatusUpdate } = require('../utils/notificationUtil');

// When order is placed
await notifyEcoShoppingOrder(userId, order);

// When order status changes
await notifyStatusUpdate(userId, 'order', orderId, 'Shipped');
```

### Green Champion Controller
```javascript
// In greenChampionController.js
const { notifyGreenChampionRequest, notifyStatusUpdate } = require('../utils/notificationUtil');

// When GC request is assigned
await notifyGreenChampionRequest(gcId, { requestId, message: '...' });

// When task is completed
await notifyStatusUpdate(gcId, 'gc_task', taskId, 'Completed');
```

### Admin Controller
```javascript
// In adminController.js
const { notifyApprovalRequest } = require('../utils/notificationUtil');

// When approval is needed
await notifyApprovalRequest(adminId, { 
  requestId, 
  message: 'New request waiting for approval' 
});
```

## Database Structure

Notifications are stored in MongoDB with:
```javascript
{
  userId: ObjectId,           // User receiving notification
  title: String,              // Notification title
  description: String,        // Notification message
  type: String,               // Notification type
  priority: String,           // Low, Medium, High, Critical
  reportId: ObjectId,         // Related entity (optional)
  isRead: Boolean,            // Read status
  createdAt: Date,
  updatedAt: Date,
  // For broadcast notifications
  targetAudience: String,     // All, Citizens, Collectors, Green Champions
  targetVillage: String,      // Specific village (optional)
  senderId: ObjectId,         // Admin ID (optional)
  readBy: [ObjectId],         // Array of users who read
  deletedBy: [ObjectId]       // Array of users who deleted
}
```

## API Endpoints

### Get Notifications
```
GET /api/notifications
Headers: Authorization: Bearer {token}
Response: Array of notifications
```

### Get Unread Count
```
GET /api/notifications/unread-count
Headers: Authorization: Bearer {token}
Response: { count: number }
```

### Mark as Read
```
PUT /api/notifications/read/:id
Headers: Authorization: Bearer {token}
Response: { success: true }
```

### Mark All as Read
```
PUT /api/notifications/read-all
Headers: Authorization: Bearer {token}
Response: { success: true }
```

### Delete Notification
```
DELETE /api/notifications/:id
Headers: Authorization: Bearer {token}
Response: { success: true }
```

## Socket Events

### Server → Client
```javascript
socket.emit('popup_notification', {
  _id: 'notification_id',
  title: 'New Report',
  description: 'You have a new waste report',
  type: 'public_waste_report',
  actionUrl: '/collector/waste-reports'
});

socket.emit('notification', {
  // Full notification object
});
```

### Client → Server
```javascript
// Join user room
socket.emit('join', userId);
```

## Features

✅ **Real-time Delivery** - Socket.io ensures instant notification delivery
✅ **Popup Notifications** - Non-intrusive notifications with auto-dismiss
✅ **Notification Center** - View all notifications in one place
✅ **Sound Alerts** - Audio notification with adjustable volume
✅ **Read/Unread Status** - Track which notifications user has seen
✅ **Duplicate Prevention** - Prevents spam notifications within 5-minute window
✅ **Multiple Device Support** - Works on desktop, tablet, and mobile
✅ **Dark/Light Mode** - Notifications adapt to theme
✅ **Action Links** - Click "Open" to navigate to related page
✅ **Database Storage** - All notifications stored for history
✅ **Unread Counter** - Badge shows unread notification count

## Testing the System

### 1. Test Collector Assignment Notification
1. Log in as citizen
2. Submit a public waste report
3. Log in as collector from same village
4. Accept the report
5. You should see a popup notification

### 2. Test Status Update Notification
1. As collector, change report status
2. As citizen, you'll see status update notification

### 3. Test Sound Alert
1. Trigger any notification
2. You should hear the notification sound
3. Adjust browser volume if needed

## Troubleshooting

### Notifications not appearing?
1. Check Socket.io connection: `console.log(socket.connected)`
2. Verify user is joined to room: `socket.emit('join', userId)`
3. Check browser console for errors
4. Verify API endpoints return data

### Sound not playing?
1. Check browser permissions for audio
2. Verify `/sound-popup.mp3` file exists
3. Check browser console for audio errors
4. Try playing audio in console: `new Audio('/sound-popup.mp3').play()`

### Duplicate notifications?
This is intentional - the system prevents duplicates within 5 minutes per user/type/entity combination.

## Future Enhancements

- Email/SMS notifications for critical events
- Notification preferences (disable certain types)
- Scheduled notifications
- Notification templates
- Analytics on notification engagement
- Push notifications for mobile apps

