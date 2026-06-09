const express    = require('express');
const router     = express.Router();
const WasteReport = require('../models/WasteReport');
const Collector   = require('../models/Collector');
const { protect } = require('../middleware/auth');
const { createNotification } = require('../controllers/notificationController');
const upload = require('../middleware/uploadMiddleware');

const collectorAuth = async (req, res, next) => {
  try {
    const collector = await Collector.findById(req.user.id);
    if (!collector) return res.status(403).json({ message: 'Collector access only.' });
    if (collector.status === 'Inactive') return res.status(403).json({ message: 'Your account is inactive.' });
    req.collector = collector;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Collector access only.', error: err.message });
  }
};

router.get('/reports', protect, collectorAuth, async (req, res) => {
  try {
    const { filter, sort, type } = req.query;
    const cid = req.user.id;
    const collector = req.collector;
    const villages = Array.isArray(collector.villages) && collector.villages.length
      ? collector.villages
      : collector.village ? [collector.village] : [];

    const mine = { assignedCollector: cid };
    const villageQueue = villages.length
      ? { status: 'Submitted', assignedCollector: null, village: { $in: villages } }
      : { status: 'Submitted', assignedCollector: null };

    if (type && ['Public', 'Home Pickup'].includes(type)) {
      mine.reportType = type;
      villageQueue.reportType = type;
    }

    let query;
    if (!filter || filter === 'all') {
      query = { $or: [mine, villageQueue] };
    } else if (['High', 'Medium', 'Low'].includes(filter)) {
      query = {
        $or: [
          { ...mine, severity: filter },
          { ...villageQueue, severity: filter },
        ],
      };
    } else if (['Verified', 'Assigned', 'In Progress', 'Resolved', 'Delayed', 'Clarification Requested', 'Resubmitted'].includes(filter)) {
      query = { assignedCollector: cid, status: filter };
    } else {
      query = { ...mine, status: filter };
    }

    let reports = await WasteReport.find(query)
      .populate('userId', 'name phone email')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    if (sort === 'priority') {
      const order = { High: 0, Medium: 1, Low: 2 };
      reports.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
    }
    res.json(reports);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/reports/public', protect, collectorAuth, async (req, res) => {
  try {
    req.query.type = 'Public';
    const { filter, sort } = req.query;
    const cid = req.user.id;
    const collector = req.collector;
    const villages = Array.isArray(collector.villages) && collector.villages.length
      ? collector.villages
      : collector.village ? [collector.village] : [];

    const mine = { assignedCollector: cid, reportType: 'Public' };
    const villageQueue = villages.length
      ? { status: { $in: ['Submitted', 'Verified', 'Resubmitted', 'Clarification Expired'] }, assignedCollector: null, village: { $in: villages }, reportType: 'Public' }
      : { status: { $in: ['Submitted', 'Verified', 'Resubmitted', 'Clarification Expired'] }, assignedCollector: null, reportType: 'Public' };

    let query;
    if (!filter || filter === 'all') {
      query = { $or: [mine, villageQueue] };
    } else if (['High', 'Medium', 'Low'].includes(filter)) {
      query = {
        $or: [
          { ...mine, severity: filter },
          { ...villageQueue, severity: filter },
        ],
      };
    } else if (['Submitted', 'Verified', 'Resubmitted', 'Assigned', 'In Progress', 'Resolved', 'Delayed', 'Clarification Requested', 'Clarification Expired'].includes(filter)) {
      query = { assignedCollector: cid, reportType: 'Public', status: filter };
    } else {
      query = { ...mine, status: filter };
    }

    let reports = await WasteReport.find(query)
      .populate('userId', 'name phone email')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    if (sort === 'priority') {
      const order = { High: 0, Medium: 1, Low: 2 };
      reports.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
    }
    res.json(reports);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/reports/home-pickup', protect, collectorAuth, async (req, res) => {
  try {
    const { filter, sort } = req.query;
    const cid = req.user.id;
    const collector = req.collector;
    const villages = Array.isArray(collector.villages) && collector.villages.length
      ? collector.villages
      : collector.village ? [collector.village] : [];

    const mine = { assignedCollector: cid, reportType: 'Home Pickup' };
    const villageQueue = villages.length
      ? { status: 'Submitted', assignedCollector: null, village: { $in: villages }, reportType: 'Home Pickup' }
      : { status: 'Submitted', assignedCollector: null, reportType: 'Home Pickup' };

    let query;
    if (!filter || filter === 'all') {
      query = { $or: [mine, villageQueue] };
    } else if (['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Delayed'].includes(filter)) {
      query = { assignedCollector: cid, reportType: 'Home Pickup', status: filter };
    } else {
      query = { ...mine, status: filter };
    }

    let reports = await WasteReport.find(query)
      .populate('userId', 'name phone email')
      .sort({ createdAt: -1 })
      .lean();
    if (sort === 'date') {
      reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    res.json(reports);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/available', protect, collectorAuth, async (req, res) => {
  try {
    const reports = await WasteReport.find({ status: { $in: ['Submitted', 'Verified', 'Resubmitted', 'Clarification Expired'] }, assignedCollector: null })
      .populate('userId', 'name phone email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(reports);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/report/:id/status', protect, collectorAuth, upload.single('completionPhoto'), async (req, res) => {
  try {
    const { status, completionPhoto, completionNotes, delayReason } = req.body;
    const cid = req.user.id;

    
    if (status === 'Assigned') {
      const locked = await WasteReport.findOneAndUpdate(
        {
          _id: req.params.id,
          $or: [
            { status: 'Submitted', isLocked: { $ne: true } },
            { status: 'Verified', isLocked: { $ne: true } },
            { status: 'Resubmitted', isLocked: { $ne: true } },
            { status: 'Clarification Expired', isLocked: { $ne: true } },
            { status: 'Reopened', isLocked: { $ne: true } },
          ],
        },
        {
          $set: {
            status: 'Assigned',
            assignedCollector: cid,
            isLocked: true,
            lockedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!locked) {
        return res.status(409).json({ message: 'This task has already been accepted by another collector.' });
      }

      // Populate and broadcast assignment in real-time
      const assignedReport = await WasteReport.findById(locked._id)
        .populate('assignedCollector', 'name collectorType teamLeader teamSize')
        .lean();
      if (assignedReport.userId) {
        createNotification(assignedReport.userId, 'Report Assigned',
          `A collector has been assigned to your ${assignedReport.wasteType} waste report.`, 'status', assignedReport._id);
      }
      try {
        const { emitToUser, emitToAll } = require('../socket');
        if (assignedReport.userId?._id) emitToUser(assignedReport.userId.toString(), 'report_updated', assignedReport);
        emitToAll('report_updated', assignedReport);
      } catch (e) { /* socket non-critical */ }
      return res.json({ message: 'Task accepted.', report: assignedReport });
    }

    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    
    if (report.assignedCollector?.toString() !== cid.toString()) {
      return res.status(403).json({ message: 'You are not assigned to this task.' });
    }

    const allowed = { Assigned: ['In Progress'], 'In Progress': ['Resolved', 'Delayed'] };
    if (!allowed[report.status]?.includes(status)) {
      return res.status(400).json({ message: `Cannot change status from ${report.status} to ${status}.` });
    }

    report.status = status;
    if (status === 'In Progress') {
      if (report.userId) createNotification(report.userId, 'Work Started',
        `Collector has started working on your ${report.wasteType} waste report.`, 'status', report._id);
    }
    if (status === 'Resolved') {
      report.completionPhoto   = req.file ? req.file.path : (completionPhoto || '');
      report.completionNotes   = completionNotes || '';
      report.completedAt       = new Date();
      report.revokePreviousStatus = report.status;
      report.citizenVerified   = 'pending';
      await Collector.findByIdAndUpdate(cid, { $inc: { completedTasks: 1 } });
      if (report.userId) {
        createNotification(report.userId, 'Report Resolved',
          `Your ${report.wasteType} waste report has been resolved. Was the issue fixed?`, 'status', report._id);
        const { awardPoints } = require('../controllers/rewardsController');
        await awardPoints(report.userId, 15, 'Report Resolved', report._id);
      }
    }
    if (status === 'Delayed') {
      report.delayReason = delayReason || '';
      report.delayTime   = new Date();
      if (report.userId) createNotification(report.userId, 'Report Delayed',
        `Your ${report.wasteType} waste report is delayed: ${delayReason}`, 'delay', report._id);
    }
    await report.save();
    
    // Return populated report so frontend has user data
    const populated = await WasteReport.findById(report._id)
      .populate('userId', 'name phone email')
      .populate('assignedCollector', 'name collectorType teamLeader teamSize')
      .lean();
    
    // Socket broadcast
    try {
      const { emitToUser, emitToAll } = require('../socket');
      if (populated.userId?._id) emitToUser(populated.userId._id.toString(), 'report_updated', populated);
      emitToAll('report_updated', populated);
    } catch (e) { /* socket non-critical */ }

    res.json({ message: 'Status updated.', report: populated });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ─── Revoke Completion ─── */
router.put('/report/:id/revoke', protect, collectorAuth, async (req, res) => {
  try {
    const cid = req.user.id;
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.assignedCollector?.toString() !== cid.toString()) {
      return res.status(403).json({ message: 'Not assigned to this task.' });
    }
    if (report.status !== 'Resolved') {
      return res.status(400).json({ message: 'Only completed reports can be revoked.' });
    }

    // Store revoke tracking
    report.revokedAt = new Date();
    report.revokedBy = cid;
    report.revokePreviousStatus = report.revokePreviousStatus || report.status;

    // Restore to previous active status (default In Progress if unknown)
    const restoreStatus = report.revokePreviousStatus === 'Resolved' ? 'In Progress' : (report.revokePreviousStatus || 'In Progress');
    report.status = restoreStatus;
    report.completedAt = null;
    report.citizenVerified = 'pending';

    // Decrement completed tasks counter
    await Collector.findByIdAndUpdate(cid, { $inc: { completedTasks: -1 } });
    await report.save();

    // Notify citizen
    if (report.userId) {
      const { createNotification } = require('../controllers/notificationController');
      createNotification(report.userId, 'Completion Revoked',
        `Your ${report.wasteType} waste report completion has been revoked by the collector. Status restored to "${restoreStatus}".`,
        'status', report._id);
    }

    // Socket broadcast
    try {
      const { emitToUser, emitToAll } = require('../socket');
      const populated = await WasteReport.findById(report._id)
        .populate('userId', 'name phone email')
        .lean();
      if (report.userId) emitToUser(report.userId.toString(), 'report_updated', populated);
      emitToAll('report_updated', populated);
    } catch (e) { /* socket non-critical */ }

    res.json({ message: 'Completion revoked, report restored.', report: await WasteReport.findById(report._id).populate('userId', 'name phone email').lean() });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ─── Collector Location ─── */
router.post('/location', protect, collectorAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'lat and lng required.' });
    }
    await Collector.findByIdAndUpdate(req.user.id, {
      'lastLocation.lat': lat,
      'lastLocation.lng': lng,
      'lastLocation.updatedAt': new Date(),
    });
    try {
      const { emitToAll } = require('../socket');
      emitToAll('collector_location_updated', {
        collectorId: req.user.id,
        lat,
        lng,
        updatedAt: new Date(),
      });
    } catch (e) { /* socket non-critical */ }
    res.json({ message: 'Location updated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ─── Mark Arrived ─── */
router.put('/report/:id/arrived', protect, collectorAuth, async (req, res) => {
  try {
    const cid = req.user.id;
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.assignedCollector?.toString() !== cid.toString()) {
      return res.status(403).json({ message: 'Not assigned to this task.' });
    }
    if (report.status !== 'Assigned') {
      return res.status(400).json({ message: 'Can only mark arrived for Assigned tasks.' });
    }

    report.status = 'In Progress';
    await report.save();

    if (report.userId) {
      createNotification(report.userId, 'Collector Arrived',
        `Collector has arrived at your location for the ${report.wasteType} waste report.`, 'status', report._id);
    }

    const populated = await WasteReport.findById(report._id)
      .populate('userId', 'name phone email')
      .populate('assignedCollector', 'name collectorType teamLeader teamSize')
      .lean();

    try {
      const { emitToUser, emitToAll } = require('../socket');
      if (populated.userId?._id) emitToUser(populated.userId._id.toString(), 'report_updated', populated);
      emitToAll('report_updated', populated);
    } catch (e) { /* socket non-critical */ }

    res.json({ message: 'Marked as arrived.', report: populated });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ─── Get Collector Location (for citizen tracking) ─── */
router.get('/:collectorId/location', protect, async (req, res) => {
  try {
    const collector = await Collector.findById(req.params.collectorId).select('lastLocation name');
    if (!collector) return res.status(404).json({ message: 'Collector not found.' });
    res.json({
      name: collector.name,
      lat: collector.lastLocation?.lat ?? null,
      lng: collector.lastLocation?.lng ?? null,
      updatedAt: collector.lastLocation?.updatedAt ?? null,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/availability', protect, collectorAuth, async (req, res) => {
  try {
    const { availability } = req.body;
    await Collector.findByIdAndUpdate(req.user.id, { availability });
    res.json({ message: 'Availability updated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/profile', protect, collectorAuth, async (req, res) => {
  try {
    const collector = await Collector.findById(req.user.id).select('-password').lean();
    if (!collector) return res.status(404).json({ message: 'Collector not found.' });

    res.json({
      ...collector,
      phone: collector.mobile || '',
      profilePhoto: collector.photo || '',
      role: 'Collector',
      locality: collector.area || collector.city || '',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

router.put('/profile', protect, collectorAuth, upload.single('photo'), async (req, res) => {
  try {
    const { name, mobile, email, photo } = req.body;
    const update = {};
    if (name  !== undefined) update.name  = name;
    if (mobile !== undefined) update.mobile = mobile;
    if (email !== undefined) update.email = email;
    if (req.file)            update.photo  = req.file.path;
    else if (photo !== undefined) update.photo  = photo;

    const collector = await Collector.findByIdAndUpdate(req.user.id, update, { returnDocument: 'after' }).select('-password');
    res.json({ message: 'Profile updated.', user: collector });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

const ScrapRequest   = require('../models/ScrapRequest');
const Order          = require('../models/Order');

router.get('/stats', protect, collectorAuth, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cid = req.user.id;
    const collector = req.collector;
    const villages = Array.isArray(collector.villages) && collector.villages.length
      ? collector.villages
      : collector.village ? [collector.village] : [];

    const villageFilter = villages.length ? { village: { $in: villages } } : {};

    const [
      pendingSubmitted, assigned, inProgress, completedToday, total,
      pendingScrap, assignedScrap, inProgressScrap, completedScrapToday, totalScrap,
      publicPending, publicAssigned, publicInProgress, publicCompletedToday, publicTotal,
      homePending, homeAssigned, homeInProgress, homeCompletedToday, homeTotal
    ] = await Promise.all([
      WasteReport.countDocuments({ status: { $in: ['Submitted', 'Verified', 'Resubmitted', 'Clarification Expired'] }, assignedCollector: null, ...villageFilter }),
      WasteReport.countDocuments({ assignedCollector: cid, status: 'Assigned' }),
      WasteReport.countDocuments({ assignedCollector: cid, status: 'In Progress' }),
      WasteReport.countDocuments({ assignedCollector: cid, status: 'Resolved', completedAt: { $gte: today } }),
      WasteReport.countDocuments({ assignedCollector: cid }),

      ScrapRequest.countDocuments({ status: 'Requested', assignedCollector: null }),
      ScrapRequest.countDocuments({ assignedCollector: cid, status: 'Assigned' }),
      ScrapRequest.countDocuments({ assignedCollector: cid, status: 'In Progress' }),
      ScrapRequest.countDocuments({ assignedCollector: cid, status: 'Collected', updatedAt: { $gte: today } }),
      ScrapRequest.countDocuments({ assignedCollector: cid }),

      WasteReport.countDocuments({ status: { $in: ['Submitted', 'Verified', 'Resubmitted', 'Clarification Expired'] }, assignedCollector: null, reportType: 'Public', ...villageFilter }),
      WasteReport.countDocuments({ assignedCollector: cid, status: 'Assigned', reportType: 'Public' }),
      WasteReport.countDocuments({ assignedCollector: cid, status: 'In Progress', reportType: 'Public' }),
      WasteReport.countDocuments({ assignedCollector: cid, status: 'Resolved', reportType: 'Public', completedAt: { $gte: today } }),
      WasteReport.countDocuments({ assignedCollector: cid, reportType: 'Public' }),

      WasteReport.countDocuments({ assignedCollector: cid, status: 'Assigned', reportType: 'Home Pickup' }),
      WasteReport.countDocuments({ assignedCollector: cid, status: 'In Progress', reportType: 'Home Pickup' }),
      WasteReport.countDocuments({ assignedCollector: cid, status: 'Resolved', reportType: 'Home Pickup', completedAt: { $gte: today } }),
      WasteReport.countDocuments({ assignedCollector: cid, reportType: 'Home Pickup' }),
    ]);

    const collectorDoc = await Collector.findById(req.user.id).select('name collectorId city area village villages availability completedTasks');

    res.json({
      pendingSubmitted: pendingSubmitted + pendingScrap,
      assigned: assigned + assignedScrap,
      inProgress: inProgress + inProgressScrap,
      completedToday: completedToday + completedScrapToday,
      total: total + totalScrap,
      collector: collectorDoc,
      wasteDetails: { pendingSubmitted, assigned, inProgress, completedToday, total },
      scrapDetails: { pendingScrap, assignedScrap, inProgressScrap, completedScrapToday, totalScrap },
      publicWasteDetails: { pendingSubmitted: publicPending, assigned: publicAssigned, inProgress: publicInProgress, completedToday: publicCompletedToday, total: publicTotal },
      homePickupDetails: { assigned: homeAssigned, inProgress: homeInProgress, completedToday: homeCompletedToday, total: homeTotal }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/village-reports', protect, collectorAuth, async (req, res) => {
  try {
    const collector = req.collector;
    const villages = Array.isArray(collector.villages) && collector.villages.length
      ? collector.villages
      : collector.village ? [collector.village] : [];

    if (!villages.length) return res.json({ villageReports: [], nearbyReports: [], villages: [] });

    const villageReports = await WasteReport.find({
      village: { $in: villages },
      status: { $nin: ['Resolved'] },
    }).sort({ createdAt: -1 }).lean();

    let nearbyReports = [];
    if (villageReports.length === 0) {
      const ref = await WasteReport.findOne({
        'location.city': { $regex: new RegExp((collector.city || '').trim(), 'i') },
      }).lean();

      if (ref?.location?.lat && ref?.location?.lng) {
        nearbyReports = await WasteReport.find({
          location: {
            $nearSphere: {
              $geometry: { type: 'Point', coordinates: [ref.location.lng, ref.location.lat] },
              $maxDistance: 5000,
            },
          },
      status: { $nin: ['Resolved', 'Clarification Requested', 'Clarification Expired'] },
        }).limit(20).lean();
      }
    }

    res.json({ villageReports, nearbyReports, villages, village: villages[0] || '' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ─── Eco Delivery Routes ─── */
router.get('/deliveries', protect, collectorAuth, async (req, res) => {
  try {
    const { filter } = req.query;
    const cid = req.user.id;

    let query = { assignedCollector: cid };
    if (filter && ['Assigned', 'Out for Delivery', 'Delivered'].includes(filter)) {
      query.deliveryStatus = filter;
    } else {
      query.deliveryStatus = { $in: ['Assigned', 'Out for Delivery', 'Delivered'] };
    }

    const orders = await Order.find(query)
      .populate('userId', 'name phone email')
      .populate('itemId', 'itemName image price category')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(orders);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/delivery/:id/status', protect, collectorAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const cid = req.user.id;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.assignedCollector?.toString() !== cid.toString()) {
      return res.status(403).json({ message: 'Not assigned to this delivery.' });
    }

    const allowed = { Assigned: ['Out for Delivery'], 'Out for Delivery': ['Delivered'] };
    if (!allowed[order.deliveryStatus]?.includes(status)) {
      return res.status(400).json({ message: `Cannot change from ${order.deliveryStatus} to ${status}.` });
    }

    order.deliveryStatus = status;
    await order.save();
    if (order.userId) {
      createNotification(order.userId, 'Delivery Update',
        `Your eco shopping order is now "${status}".`, 'status', order._id);
    }
    res.json({ message: `Delivery status updated to ${status}.`, order });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
