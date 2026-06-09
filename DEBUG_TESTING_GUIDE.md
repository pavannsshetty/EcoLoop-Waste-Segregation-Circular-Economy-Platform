# Notification System - Debugging & Testing Guide

## 🐛 Debugging Tools & Techniques

### 1. Server-Side Logging

Add this to your controller to debug:

```javascript
// Enable detailed logging
const debugLog = (label, data) => {
  console.log(`[NOTIFICATION-DEBUG] ${label}:`, JSON.stringify(data, null, 2));
};

// In your function
debugLog('Notification Created', { 
  userId: userId, 
  type: type,
  timestamp: new Date()
});

// Check database
// MongoDB command
db.notifications.findOne({ userId: ObjectId("userId"), createdAt: { $gte: new Date(Date.now() - 60000) } })
```

### 2. Client-Side Console Debugging

Open browser DevTools (F12) and paste:

```javascript
// Check Socket.io connection
console.log('Socket connected:', socket?.connected);
console.log('Socket ID:', socket?.id);

// Listen for all notifications
socket?.on('popup_notification', (data) => {
  console.log('[NOTIFICATION RECEIVED]', data);
});

// Test manual notification
socket?.emit('test_notification', { 
  title: 'Test', 
  message: 'This is a test notification' 
});
```

### 3. Network Monitoring

In DevTools → Network Tab:

1. Filter for "WebSocket"
2. Look for Socket.io connections
3. Should see messages like:
   ```
   42["popup_notification",{...}]
   ```

---

## 🧪 Step-by-Step Testing Guide

### Test 1: Basic Connection Test

**Objective:** Verify Socket.io is working

**Steps:**
1. Open browser console (F12)
2. Run:
   ```javascript
   console.log('Socket:', socket);
   console.log('Connected:', socket?.connected);
   console.log('Socket ID:', socket?.id);
   ```
3. Expected output:
   - Socket object exists
   - Connected: true
   - Socket ID: a long string (e.g., "rI1..." )

**If fails:**
- [ ] Check server is running
- [ ] Check WebSocket connection in Network tab
- [ ] Look for errors in browser console
- [ ] Verify socket.js is loaded

---

### Test 2: User Join Event

**Objective:** Verify user is joining notification room

**Steps:**
1. After login, open console
2. Run:
   ```javascript
   const userId = localStorage.getItem('userId'); // or from state
   console.log('User ID:', userId);
   // Socket should auto-emit 'join'
   ```
3. Check server logs for:
   ```
   User joined room: <userId>
   ```

**If fails:**
- [ ] Check userId is set correctly
- [ ] Verify socket.js has join event handler
- [ ] Check server logs for connection event

---

### Test 3: Manual Notification Test

**Objective:** Send a test notification from server

**Steps:**

**Method A: Using Admin Panel (if available)**
1. Log in as Admin
2. Create a broadcast notification
3. Check other users receive it

**Method B: Using Server Code**
```javascript
// In server/socket.js or a test route
const { emitPopupNotification } = require('./socket.js');
const testUserId = '65d1234567890abcdef12345';

emitPopupNotification(testUserId, {
  title: 'Test Notification',
  message: 'If you see this, Socket.io is working!',
  type: 'general',
  priority: 'Medium',
  timestamp: new Date()
});
```

**Method C: Using MongoDB Direct Update**
```javascript
// In server terminal with MongoDB
db.notifications.insertOne({
  userId: ObjectId("testUserId"),
  title: "Test from DB",
  message: "Testing notification",
  type: "general",
  isRead: false,
  createdAt: new Date()
});
```

**If notification appears:**
- ✅ Socket.io is working
- ✅ Database connection is working
- ✅ Frontend component is rendering

---

### Test 4: Scrap Collection Notification

**Objective:** Test the integrated scrap notification flow

**Steps:**

1. **Create Scrap Request:**
   - Log in as Citizen
   - Submit a scrap collection request (e.g., plastic bottles)
   - Note the request ID

2. **Accept as Collector:**
   - Open new browser window / incognito (or log in as different collector)
   - Log in as Collector in same village
   - Look for pending scrap requests
   - Click "Accept" or "Assign"

3. **Observe Notifications:**
   - On Collector screen: Popup appears "Scrap Collection Request Assigned"
   - Check database:
     ```javascript
     db.notifications.find({ 
       userId: collectorId, 
       type: "scrap_collection" 
     }).sort({ createdAt: -1 }).limit(1)
     ```

4. **Check Status Update:**
   - As Collector, change status to "In Progress"
   - Observe: Citizen receives notification on their screen
   - Check sound plays (if enabled)

**Troubleshooting:**
- [ ] Collector and Citizen in same village?
- [ ] Check database for notification records
- [ ] Check server logs for socket emissions
- [ ] Verify request status changed in database

---

### Test 5: Sound Playback

**Objective:** Verify notification sound works

**Steps:**

1. **Manual Sound Test (Console):**
   ```javascript
   const audio = new Audio('/sound-popup.mp3');
   audio.volume = 0.3;
   audio.play().catch(err => console.error('Audio error:', err));
   ```

2. **Trigger Real Notification:**
   - Create a notification through normal flow
   - Should hear the alert sound
   - Volume should be at 30%

**If sound doesn't play:**
- [ ] Check file path: `/admin/src/assets/sound-popup.mp3`
- [ ] Check browser volume settings
- [ ] Check browser permissions for audio
- [ ] Try different audio file format (MP3 should work)
- [ ] Check browser console for audio errors

**To disable sound for testing:**
```javascript
// In PopupNotification.jsx, comment out:
// const audio = new Audio(soundPath);
// audio.play();
```

---

### Test 6: Notification Center (History)

**Objective:** Verify all notifications are stored and retrievable

**Steps:**

1. **Create Multiple Notifications:**
   - Submit 3 different requests
   - Have them assigned to you
   - Trigger different notification types

2. **Open Notification Center:**
   - Click notification bell icon
   - Should see all notifications with timestamps
   - Count should match database

3. **Check Database:**
   ```javascript
   db.notifications.find({ userId: "your_id" }).sort({ createdAt: -1 })
   ```

4. **Mark as Read:**
   - Click a notification in the center
   - Should change styling (lighter color)
   - Database should have `isRead: true`

---

### Test 7: Mobile Responsiveness

**Objective:** Verify notifications work on mobile devices

**Steps:**

1. **Desktop Emulation:**
   - Open DevTools (F12)
   - Click device toolbar (Ctrl+Shift+M)
   - Select mobile device

2. **Trigger Notification:**
   - Create notification while in mobile view
   - Popup should appear at bottom-right
   - Should be readable on small screen
   - Buttons should be clickable

3. **Real Mobile Device:**
   - Access app on actual phone/tablet
   - Test same flows
   - Verify touch interactions work

**Mobile Specific Checks:**
- [ ] Popup not cut off at edges
- [ ] Text is readable (font size OK)
- [ ] Buttons are large enough to tap
- [ ] Notification queue works (sequential display)
- [ ] Sound plays on device

---

### Test 8: Dark/Light Mode Toggle

**Objective:** Verify notifications adapt to theme

**Steps:**

1. **Set Light Mode:**
   - Enable light theme in app
   - Trigger notification
   - Observe: Light background, dark text
   - Progress bar: light color

2. **Toggle to Dark Mode:**
   - Enable dark theme
   - Trigger another notification
   - Observe: Dark background, light text
   - Progress bar: bright color

3. **Real-Time Toggle:**
   - While notification visible, toggle theme
   - Notification should update colors

**If colors don't change:**
- [ ] Check useTheme hook is available
- [ ] Verify TailwindCSS dark mode is enabled
- [ ] Check CSS classes in PopupNotification.jsx
- [ ] Look for theme context in layout

---

### Test 9: Duplicate Prevention

**Objective:** Verify same notification isn't sent twice in 5-minute window

**Steps:**

1. **Create Scrap Request:**
   - Log in as Citizen, submit scrap request
   - Assign same request to Collector A
   - Collector should get 1 notification

2. **Try to Assign Again (if possible):**
   - Try to assign same request again
   - Expected: No duplicate notification
   - Or: Time > 5 minutes, assignment happens again, notification sent

3. **Check Database:**
   ```javascript
   db.notifications.find({ 
     "reportId": "scrapRequestId" 
   }).count()
   // Should be 1, not 2
   ```

---

### Test 10: Unread Badge Counter

**Objective:** Verify unread count updates correctly

**Steps:**

1. **Initial State:**
   - Navigate to page
   - Check notification bell icon
   - Should show "0" or no badge

2. **Create Notification:**
   - Submit request from another user
   - Assigned to you
   - Badge should now show "1"

3. **Create More:**
   - Create 2 more notifications
   - Badge should show "3"

4. **Open Notification Center:**
   - Badge count should clear (mark as read)
   - Or decrease as you read individually

5. **Check Backend:**
   ```javascript
   db.notifications.countDocuments({ 
     userId: "yourId", 
     isRead: false 
   })
   ```

---

## 🔍 Common Issues & Solutions

### Issue: "Socket is not connected"

**Symptom:** Notifications don't appear, console shows socket undefined

**Debug:**
```javascript
console.log('socket:', socket);
console.log('socket?.connected:', socket?.connected);
// Check in Network → WS tab for Socket.io connection
```

**Solutions:**
1. Verify server is running: `npm start` in server folder
2. Check socket.io port (usually 3000 or 5000)
3. Look for CORS errors in browser console
4. Restart browser
5. Check firewall isn't blocking WebSocket

### Issue: "Notification appears but no sound"

**Symptom:** Popup shows but audio doesn't play

**Debug:**
```javascript
// Test audio directly
new Audio('/sound-popup.mp3').play()
  .then(() => console.log('Sound played'))
  .catch(err => console.error('Sound failed:', err));
```

**Solutions:**
1. Check browser volume (not muted)
2. Check browser permissions for audio
3. Verify file exists at: `/admin/src/assets/sound-popup.mp3`
4. Try different audio format
5. Check browser autoplay policy (some require user interaction first)

### Issue: "Duplicate notifications appearing"

**Symptom:** See same notification twice

**Debug:**
```javascript
db.notifications.find({ userId: "id" }).sort({ createdAt: -1 }).limit(5)
// Check timestamps - should be seconds apart or same second
```

**Solutions:**
1. Check function isn't called twice
2. Verify duplicate prevention logic works
3. Check socket isn't emitting multiple times
4. Look for multiple socket connections
5. Clear database and try again

### Issue: "Notification center shows wrong data"

**Symptom:** Old notifications or wrong userId

**Debug:**
```javascript
// Frontend
console.log('Current userId:', localStorage.getItem('userId'));

// Backend
db.notifications.find({ userId: ObjectId("userId") }).count()
```

**Solutions:**
1. Clear localStorage and re-login
2. Check userId is set correctly before socket join
3. Verify socket room is correct userId
4. Check database for orphaned notifications
5. Restart server and browser

### Issue: "Notification appears but doesn't dismiss"

**Symptom:** Popup never closes, stays forever

**Debug:**
```javascript
// Check PopupNotification component
// autoClose prop should be passed
// Look for setTimeout logic in component
```

**Solutions:**
1. Check `autoClose` prop is passed: `autoClose={8000}`
2. Verify setTimeout is not blocked
3. Check for CSS z-index issues
4. Clear browser cache
5. Check browser console for errors

---

## 📊 Database Queries for Debugging

### Check Notifications for a User
```javascript
db.notifications.find({ 
  userId: ObjectId("65d1234567890abcdef12345") 
}).sort({ createdAt: -1 }).limit(10)
```

### Check Unread Count
```javascript
db.notifications.countDocuments({ 
  userId: ObjectId("65d1234567890abcdef12345"),
  isRead: false 
})
```

### Delete Old Notifications
```javascript
// Delete notifications older than 30 days
db.notifications.deleteMany({ 
  createdAt: { $lt: new Date(Date.now() - 30*24*60*60*1000) }
})
```

### Check for Duplicates
```javascript
db.notifications.aggregate([
  { $group: { 
    _id: { userId: "$userId", type: "$type", reportId: "$reportId" },
    count: { $sum: 1 }
  }},
  { $match: { count: { $gt: 1 } }}
])
```

### Create Test Notification
```javascript
db.notifications.insertOne({
  userId: ObjectId("testUserId"),
  title: "Test Notification",
  description: "Testing notification system",
  type: "general",
  isRead: false,
  createdAt: new Date(),
  timestamp: new Date()
})
```

---

## 🧹 Cleanup & Reset

### Clear All Notifications
```javascript
db.notifications.deleteMany({ userId: ObjectId("userId") })
```

### Reset Unread Count
```javascript
db.notifications.updateMany(
  { userId: ObjectId("userId") },
  { $set: { isRead: false } }
)
```

### Mark All as Read
```javascript
db.notifications.updateMany(
  { userId: ObjectId("userId") },
  { $set: { isRead: true } }
)
```

### Clear Duplicates (keep latest)
```javascript
db.notifications.aggregate([
  { $group: { 
    _id: { userId: "$userId", type: "$type", reportId: "$reportId" },
    ids: { $push: "$_id" },
    maxDate: { $max: "$createdAt" }
  }},
  { $match: { ids: { $size: { $gt: 1 } } } }
]).forEach(doc => {
  doc.ids.forEach(id => {
    if (id.toString() !== doc.ids[doc.ids.length-1].toString()) {
      db.notifications.deleteOne({ _id: id });
    }
  });
});
```

---

## ✅ Pre-Production Checklist

- [ ] All notifications log successfully to database
- [ ] Socket.io emits to correct users
- [ ] Sound plays on all major browsers
- [ ] Dark/light mode works
- [ ] Mobile responsive
- [ ] Duplicate prevention works
- [ ] Unread count updates correctly
- [ ] Notifications persist after page refresh
- [ ] Old notifications don't reappear
- [ ] No memory leaks with multiple notifications
- [ ] Performance acceptable with many notifications
- [ ] All error cases handled gracefully

