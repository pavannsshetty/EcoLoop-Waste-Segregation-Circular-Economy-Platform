# Real-Time Notification System - Implementation Checklist

## ✅ Completed Components

### Backend Infrastructure
- [x] **Socket.io Setup** - Enhanced with popup notification support
  - File: `server/socket.js`
  - New functions: `emitPopupNotification()`, `emitPopupNotificationBulk()`, `broadcastPopupNotification()`

- [x] **Notification Utility** - Comprehensive notification factory
  - File: `server/utils/notificationUtil.js`
  - 13+ notification functions for different event types
  - Automatic duplicate prevention (5-minute window)
  - Direct socket emission + database storage

- [x] **Database Model** - Notification schema already exists
  - File: `server/models/Notification.js`
  - Supports: userId, type, title, description, isRead, timestamp, etc.

### Frontend Components
- [x] **PopupNotification** - Real-time popup display
  - File (Client): `client/src/shared/components/PopupNotification.jsx`
  - File (Admin): `admin/src/components/PopupNotification.jsx`
  - Features: Auto-dismiss, sound alert, dark/light mode, responsive

- [x] **NotificationQueue** - Queue management for multiple notifications
  - File (Client): `client/src/shared/components/NotificationQueue.jsx`
  - File (Admin): `admin/src/components/NotificationQueue.jsx`
  - Shows one notification at a time in sequence

- [x] **Layout Integration** - Components added to all layouts
  - [x] CollectorLayout - `client/src/shared/layouts/CollectorLayout.jsx`
  - [x] CitizenLayout - `client/src/shared/layouts/CitizenLayout.jsx`
  - [x] GreenChampionLayout - `client/src/shared/layouts/GreenChampionLayout.jsx`
  - [x] AdminLayout - `admin/src/layouts/AdminLayout.jsx`

### Audio Assets
- [x] Sound file exists
  - Path: `admin/src/assets/sound-popup.mp3`
  - Auto-plays at 30% volume with notification

## 📋 Integration Points to Complete

### High Priority (Core Workflows)

#### 1. Waste Report Management
**File:** `server/controllers/wasteController.js`
**Status:** ✅ IMPORT ADDED
**Next Steps:**
```javascript
// When collector accepts report (already in collectorRoutes.js line ~188)
await notifyPublicWasteReport(collectorId, report);
```

#### 2. Scrap Collection
**File:** `server/controllers/scrapController.js`
**Status:** ✅ INTEGRATED
**Completed:**
- assignCollector() - Notifies collector of new assignment
- updateScrapStatus() - Notifies user of status changes

#### 3. Home Pickup Requests
**File:** `server/controllers/wasteController.js` (likely citizen/home pickup endpoints)
**Status:** ⏳ PENDING
**Implementation needed:**
```javascript
const { notifyHomePickupRequest } = require('../utils/notificationUtil');

// When home pickup is assigned to collector
await notifyHomePickupRequest(collectorId, pickupRequest);
```

#### 4. Eco Shopping Orders
**File:** `server/controllers/ecoShoppingController.js`
**Status:** ⏳ PENDING
**Implementation needed:**
```javascript
const { notifyEcoShoppingOrder, notifyStatusUpdate } = require('../utils/notificationUtil');

// When order is placed
await notifyEcoShoppingOrder(userId, order);

// When order status changes
await notifyStatusUpdate(userId, 'order', orderId, 'Shipped');
```

### Medium Priority (Secondary Workflows)

#### 5. Green Champion Requests
**File:** `server/controllers/greenChampionActionController.js` or similar
**Status:** ⏳ PENDING
**Implementation needed:**
```javascript
const { notifyGreenChampionRequest } = require('../utils/notificationUtil');

// When GC request is assigned
await notifyGreenChampionRequest(gcId, { 
  requestId, 
  message: `New task: ${taskType}` 
});
```

#### 6. Approval Requests
**File:** `server/controllers/adminController.js`
**Status:** ⏳ PENDING
**Implementation needed:**
```javascript
const { notifyApprovalRequest } = require('../utils/notificationUtil');

// When approval is needed
await notifyApprovalRequest(adminId, { 
  requestId, 
  message: 'New request waiting for approval' 
});
```

#### 7. Reward Events
**File:** `server/controllers/rewardsController.js`
**Status:** ⏳ PENDING
**Implementation needed:**
```javascript
const { notifyRewardEarned } = require('../utils/notificationUtil');

// When reward is earned
await notifyRewardEarned(userId, points, 'Challenge Completed');
```

### Low Priority (Broadcast/Admin Features)

#### 8. Broadcast Messages
**File:** `server/controllers/notificationController.js` (adminCreateNotification)
**Status:** ⏳ PENDING
**Current:** Uses old emitToAll()
**Upgrade to:** `broadcastPopupNotification()`

#### 9. Community Activities
**File:** `server/controllers/communityController.js` (if exists)
**Status:** ⏳ PENDING
**Implementation needed for:**
- New community events
- User joined community
- Community milestone reached

#### 10. Awareness Campaigns
**File:** Similar to community
**Status:** ⏳ PENDING

## 🚀 Integration Pattern (Template)

Use this pattern for each integration:

```javascript
// 1. Import notification utility
const { notify<EventType>, notifyStatusUpdate } = require('../utils/notificationUtil');

// 2. In the relevant function, after entity is created/modified:

try {
  // Your business logic...
  const entity = await Entity.create({...});
  
  // 3. Emit notification
  await notify<EventType>(targetUserId, entity);
  
  // Or for status updates:
  await notifyStatusUpdate(userId, 'entity_type', entityId, 'NewStatus');
  
  // 4. Return response
  res.json({ success: true, entity });
} catch (err) {
  console.error('Error:', err);
  res.status(500).json({ message: 'Server error' });
}
```

## 📊 Testing Guide

### Test 1: Collector Assignment Notification
```
Steps:
1. Log in as Citizen → Submit public waste report
2. Log in as Collector (same village) → Accept report
3. Observe: Popup appears on collector screen
4. Expected: Title "New Public Waste Report Assigned", description with details
5. Action: Click "Open" → Navigate to waste reports page
```

### Test 2: Status Update Notification
```
Steps:
1. Collector accepts a report (from Test 1)
2. Collector changes status to "In Progress"
3. Observe: Citizen receives notification
4. Expected: Title "Report Status Updated", message shows "In Progress"
5. Verify: Unread count increases in notification bell
```

### Test 3: Sound Alert
```
Steps:
1. Perform any action that triggers notification
2. Listen: Audio should play (30% volume)
3. Expected: notification sound heard
4. If not: Check browser volume, check file path, check browser console
```

### Test 4: Multiple Notifications
```
Steps:
1. Submit 3 waste reports quickly from 3 citizens
2. Observe: Collector receives 3 notifications sequentially
3. Expected: 
   - First popup appears
   - After dismissing → second popup appears
   - After dismissing → third popup appears
4. Verify: All in notification center
```

### Test 5: Duplicate Prevention
```
Steps:
1. Collector assigns same report twice within 5 minutes (if possible)
2. Expected: Only one notification (duplicate is prevented)
3. After 5 minutes:
4. Assign again → Notification appears (window passed)
```

### Test 6: Dark/Light Mode
```
Steps:
1. Toggle dark mode
2. Trigger notification
3. Expected: Notification colors adapt to theme
4. Toggle light mode
5. Trigger another notification
6. Expected: Colors adapt again
```

### Test 7: Mobile Responsiveness
```
Steps:
1. Open on mobile browser
2. Trigger notification
3. Expected: Popup appears at bottom-right
4. Dimensions: full width on small screens
5. Action buttons: "Open" and "Dismiss" visible
```

### Test 8: Notification Center
```
Steps:
1. Click notification bell
2. Expected: Show all notifications with unread count
3. Click on notification
4. Expected: Navigate to related page
5. Verify: Marked as read in center
```

## 🔧 Troubleshooting Checklist

### Issue: Notifications not appearing
- [ ] Check Socket.io connection: `socket.connected === true`
- [ ] Verify join event: `socket.emit('join', userId)`
- [ ] Check API endpoint returns data
- [ ] Look for JS errors in console
- [ ] Verify notification database entries exist

### Issue: Sound not playing
- [ ] Check browser volume
- [ ] Check file exists: `/sound-popup.mp3`
- [ ] Test audio manually: `new Audio('/sound-popup.mp3').play()`
- [ ] Check browser permissions
- [ ] Check browser console for audio errors

### Issue: Notifications showing old data
- [ ] Clear browser cache
- [ ] Check database for old records
- [ ] Verify Socket.io latest connection
- [ ] Restart browser and server

### Issue: Duplicate notifications appearing
- [ ] Check duplicate prevention logic
- [ ] Verify 5-minute window in `notificationUtil.js`
- [ ] Check database for duplicate entries
- [ ] Look at controller logic for multiple calls

## 📝 Files Modified/Created

### Created
- ✅ `server/utils/notificationUtil.js` - 430+ lines
- ✅ `client/src/shared/components/PopupNotification.jsx`
- ✅ `client/src/shared/components/NotificationQueue.jsx`
- ✅ `admin/src/components/PopupNotification.jsx`
- ✅ `admin/src/components/NotificationQueue.jsx`
- ✅ `NOTIFICATION_SYSTEM_GUIDE.md`

### Modified
- ✅ `server/socket.js` - Added 6 new functions
- ✅ `server/controllers/notificationController.js` - Exported getUnreadCountInternal
- ✅ `server/controllers/wasteController.js` - Added import
- ✅ `server/controllers/scrapController.js` - Full integration
- ✅ `client/src/shared/layouts/CollectorLayout.jsx` - Added NotificationQueue
- ✅ `client/src/shared/layouts/CitizenLayout.jsx` - Added NotificationQueue  
- ✅ `client/src/shared/layouts/GreenChampionLayout.jsx` - Added NotificationQueue
- ✅ `admin/src/layouts/AdminLayout.jsx` - Added NotificationQueue

## 🎯 Next Steps

1. **Immediate (Today)**
   - [ ] Test all 8 test scenarios above
   - [ ] Verify sound playing on all devices
   - [ ] Check database entries

2. **Short Term (This Week)**
   - [ ] Complete integration for Home Pickup
   - [ ] Complete integration for Eco Shopping
   - [ ] Complete integration for Green Champion
   - [ ] Complete integration for Approvals

3. **Medium Term (Next Week)**
   - [ ] Complete integration for Rewards
   - [ ] Complete integration for Broadcast
   - [ ] Complete integration for Community
   - [ ] Add notification preferences
   - [ ] Add email/SMS for critical notifications

4. **Long Term**
   - [ ] Mobile push notifications
   - [ ] Notification analytics
   - [ ] Template customization
   - [ ] Multi-language support

## 💡 Features Implemented

✅ Real-time popup notifications with Socket.io
✅ Notification center with read/unread status
✅ Sound alert with adjustable volume
✅ Auto-dismiss after 8 seconds
✅ Manual dismiss option
✅ Action links to navigate to related page
✅ Dark/light mode support
✅ Mobile responsive design
✅ Duplicate prevention (5-minute window)
✅ Queue management (show one at a time)
✅ Database persistence
✅ Unread count badge
✅ Multiple notification types with icons
✅ Priority levels (Low, Medium, High, Critical)

## 📞 Support

For issues or questions, refer to:
- `NOTIFICATION_SYSTEM_GUIDE.md` - Detailed integration guide
- `server/utils/notificationUtil.js` - Function documentation
- This checklist - Overview and status

