# Real-Time Notification System - Code Examples

This file provides ready-to-use code snippets for integrating notifications into each controller.

## 1. Home Pickup Request Notifications

**Where to add:** In the route/controller where home pickups are submitted and assigned to collectors.

### Step 1: Add Import to your controller
```javascript
const { notifyHomePickupRequest, notifyStatusUpdate } = require('../utils/notificationUtil');
```

### Step 2: Notify when assigned to collector
```javascript
// In the function where collector accepts/is assigned a home pickup
const homePickupNotification = async (req, res) => {
  try {
    const { pickupId } = req.params;
    const collectorId = req.user.id;

    const pickup = await WasteReport.findById(pickupId);
    if (!pickup) return res.status(404).json({ message: 'Pickup not found' });
    if (pickup.reportType !== 'Home Pickup') {
      return res.status(400).json({ message: 'Not a home pickup request' });
    }

    pickup.assignedCollector = collectorId;
    pickup.status = 'Assigned';
    await pickup.save();

    // Notify collector about new assignment
    await notifyHomePickupRequest(collectorId, pickup);

    // Notify citizen that collector was assigned
    await notifyStatusUpdate(pickup.userId, 'pickup', pickup._id, 'Assigned');

    res.json({ message: 'Pickup assigned', pickup });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// When pickup status changes
const updatePickupStatus = async (req, res) => {
  try {
    const { pickupId } = req.params;
    const { status } = req.body;

    const pickup = await WasteReport.findById(pickupId);
    if (!pickup) return res.status(404).json({ message: 'Pickup not found' });

    pickup.status = status;
    await pickup.save();

    // Notify user of status update
    await notifyStatusUpdate(pickup.userId, 'pickup', pickup._id, status);

    res.json({ message: 'Status updated', pickup });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
```

---

## 2. Eco Shopping Order Notifications

**Where to add:** In `server/controllers/ecoShoppingController.js` or similar.

### Step 1: Add Import
```javascript
const { notifyEcoShoppingOrder, notifyStatusUpdate } = require('../utils/notificationUtil');
```

### Step 2: Notify on order placement
```javascript
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, deliveryAddress } = req.body;

    // Validate and create order
    const order = await Order.create({
      userId,
      items,
      deliveryAddress,
      status: 'Pending',
      totalAmount: calculateTotal(items),
      createdAt: new Date()
    });

    // Notify user that order was placed
    await notifyEcoShoppingOrder(userId, order);

    // Also notify admins/sellers
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await notifyEcoShoppingOrder(admin._id, order);
    }

    res.status(201).json({ message: 'Order placed', order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// When order status changes
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status, trackingNumber, updatedAt: new Date() },
      { new: true }
    );

    // Notify user of status change
    await notifyStatusUpdate(order.userId, 'order', order._id, status);

    res.json({ message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
```

---

## 3. Green Champion Notifications

**Where to add:** In `server/controllers/greenChampionActionController.js` or similar.

### Step 1: Add Import
```javascript
const { notifyGreenChampionRequest } = require('../utils/notificationUtil');
```

### Step 2: Notify on task assignment
```javascript
const assignGCTask = async (req, res) => {
  try {
    const { gcId, taskType, description, relatedId } = req.body;

    // Validate and create task assignment
    const gcTask = await GCTask.create({
      gcId,
      taskType, // e.g., 'awareness', 'verification', 'campaign'
      description,
      relatedId,
      status: 'Assigned',
      createdAt: new Date()
    });

    // Notify green champion
    await notifyGreenChampionRequest(gcId, {
      requestId: gcTask._id,
      message: `New ${taskType} task: ${description}`
    });

    res.status(201).json({ message: 'Task assigned', gcTask });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
```

---

## 4. Approval Request Notifications

**Where to add:** In `server/controllers/adminController.js` or approval-related controller.

### Step 1: Add Import
```javascript
const { notifyApprovalRequest } = require('../utils/notificationUtil');
```

### Step 2: Notify on approval needed
```javascript
const createApprovalRequest = async (req, res) => {
  try {
    const { requestType, entityId, description } = req.body;

    // Create approval request
    const approvalRequest = await ApprovalRequest.create({
      requestType,
      entityId,
      description,
      status: 'Pending',
      createdAt: new Date()
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await notifyApprovalRequest(admin._id, {
        requestId: approvalRequest._id,
        message: `New ${requestType} approval needed: ${description}`
      });
    }

    res.status(201).json({ message: 'Approval request created', approvalRequest });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
```

---

## 5. Reward Event Notifications

**Where to add:** In `server/controllers/rewardsController.js` or similar.

### Step 1: Add Import
```javascript
const { notifyRewardEarned } = require('../utils/notificationUtil');
```

### Step 2: Notify on reward earned
```javascript
const awardPoints = async (userId, points, reason, entityId) => {
  try {
    // Award points
    const history = await EcoPointHistory.create({
      userId,
      points,
      reason,
      entityId,
      type: 'credit',
      createdAt: new Date()
    });

    // Update user points
    await User.findByIdAndUpdate(
      userId,
      { $inc: { ecoPoints: points } }
    );

    // Notify user about reward
    await notifyRewardEarned(userId, points, reason);

    return history;
  } catch (err) {
    console.error('Error awarding points:', err);
  }
};
```

---

## 6. Community Activity Notifications

**Where to add:** In `server/controllers/communityController.js` or similar.

### Step 1: Add Import
```javascript
const { createUserNotification, createBulkNotification } = require('../utils/notificationUtil');
```

### Step 2: Notify on new community event
```javascript
const createCommunityEvent = async (req, res) => {
  try {
    const { name, description, date, location, villageName } = req.body;

    // Create community event
    const event = await CommunityActivity.create({
      name,
      description,
      date,
      location,
      village: villageName,
      createdAt: new Date()
    });

    // Find users in this village
    const villageUsers = await User.find({
      village: { $regex: new RegExp(villageName, 'i') }
    }).select('_id');

    const userIds = villageUsers.map(u => u._id);

    // Notify all users in village
    await createBulkNotification(userIds, 'community_activity', {
      title: `New Community Event: ${name}`,
      message: `${description} on ${new Date(date).toLocaleDateString()}`,
      priority: 'Medium'
    });

    res.status(201).json({ message: 'Event created', event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
```

---

## 7. Awareness Campaign Notifications

**Where to add:** In campaign-related controller.

### Step 1: Add Import
```javascript
const { createBroadcastNotification } = require('../utils/notificationUtil');
```

### Step 2: Launch campaign notifications
```javascript
const launchCampaign = async (req, res) => {
  try {
    const { title, message, targetAudience, village } = req.body;

    // Create campaign
    const campaign = await Campaign.create({
      title,
      message,
      targetAudience,
      targetVillage: village,
      status: 'Active',
      createdAt: new Date()
    });

    // Broadcast notification
    await createBroadcastNotification({
      title,
      message,
      type: 'community_activity',
      targetAudience,
      targetVillage: village,
      priority: 'High'
    });

    res.status(201).json({ message: 'Campaign launched', campaign });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
```

---

## 8. Broadcast/Admin Announcements

**Where to add:** In `server/controllers/adminController.js` notification creation.

### Step 1: Update existing notification creation
```javascript
// OLD:
const adminCreateNotification = async (req, res) => {
  // ... existing code ...
  if (notification.status === 'Active') {
    emitToAll('notification', notification);
  }
};

// NEW:
const { createBroadcastNotification } = require('../utils/notificationUtil');

const adminCreateNotification = async (req, res) => {
  try {
    const { title, description, type, priority, targetAudience, targetVillage } = req.body;

    // Use the comprehensive notification utility
    const notification = await createBroadcastNotification({
      title,
      message: description,
      type,
      priority,
      targetAudience,
      targetVillage,
      senderId: req.admin?.id,
      status: 'Active'
    });

    res.status(201).json({ message: 'Notification sent', notification });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
```

---

## 9. Quick Integration Template

Use this template for any new notification integration:

```javascript
// ─── SETUP ───────────────────────────────────────────────────────────
// Step 1: Add import at top of file
const { 
  notify<YourEventType>,
  notifyStatusUpdate,
  NOTIFICATION_TYPES 
} = require('../utils/notificationUtil');

// ─── IMPLEMENTATION ──────────────────────────────────────────────────
// Step 2: In your function where event occurs
const yourFunction = async (req, res) => {
  try {
    // Your business logic
    const entity = await YourModel.create({...});
    
    // Notify relevant user
    await notify<YourEventType>(targetUserId, entity);
    
    // Or notify multiple users
    await notifyStatusUpdate(userId, 'entity_type', entityId, 'NewStatus');
    
    res.json({ success: true, entity });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
```

---

## 10. Testing Your Integration

### Test in Postman/API Client
```
POST /api/your-endpoint
Content-Type: application/json
Authorization: Bearer {token}

{
  "field1": "value1",
  "field2": "value2"
}

// Check database
db.notifications.find({ userId: "<user_id>" }).sort({ createdAt: -1 }).limit(5)

// Check Socket.io logs (server console)
// Should see: "Popup notification sent to user <id>: <title>"
```

### Monitor Server Logs
```bash
# Look for these log entries:
[notificationUtil] Creating user notification
Emitted popup_notification to user <userId>
Socket.io popup_notification sent
```

### Check Frontend
1. Open DevTools Console
2. Filter for "notification"
3. You should see socket events being received
4. Check that popup component renders

---

## File Reference

| Feature | File | Function |
|---------|------|----------|
| User Notifications | `notificationUtil.js` | `createUserNotification()` |
| Bulk Notifications | `notificationUtil.js` | `createBulkNotification()` |
| Broadcast Notifications | `notificationUtil.js` | `createBroadcastNotification()` |
| Waste Reports | `notificationUtil.js` | `notifyPublicWasteReport()` |
| Home Pickups | `notificationUtil.js` | `notifyHomePickupRequest()` |
| Scrap Collection | `notificationUtil.js` | `notifyScrapCollection()` |
| Assignments | `notificationUtil.js` | `notifyCollectorAssignment()` |
| Green Champion | `notificationUtil.js` | `notifyGreenChampionRequest()` |
| Approvals | `notificationUtil.js` | `notifyApprovalRequest()` |
| Eco Shopping | `notificationUtil.js` | `notifyEcoShoppingOrder()` |
| Status Updates | `notificationUtil.js` | `notifyStatusUpdate()` |
| Rewards | `notificationUtil.js` | `notifyRewardEarned()` |
| Duplicate Check | `notificationUtil.js` | `checkDuplicateNotification()` |

---

## Error Handling

### Common Errors and Solutions

**Error:** "Cannot find module 'notificationUtil'"
- Solution: Verify path: `../utils/notificationUtil.js`
- Check file exists in server/utils/

**Error:** Socket not emitting
- Solution: Verify socket is initialized in server.js
- Check user is joined to room

**Error:** Notification not in database
- Solution: Check userId is valid ObjectId
- Verify MongoDB connection

**Error:** Sound not playing
- Solution: Check `/sound-popup.mp3` exists
- Verify browser allows autoplay
- Check console for errors

---

## Performance Tips

1. **Bulk Operations:** Use `createBulkNotification()` instead of loop
2. **Duplicate Prevention:** Built-in with 5-minute window
3. **Query Optimization:** Add index on userId + createdAt
4. **Socket Efficiency:** Use room-based emit instead of broadcast when possible

---

## Security Considerations

1. Always verify user ownership before sending notifications
2. Check user permissions for sensitive notifications
3. Sanitize notification content
4. Rate limit notification creation
5. Validate all inputs before creating notifications

