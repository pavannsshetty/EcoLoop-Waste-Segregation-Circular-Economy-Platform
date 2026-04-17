const express    = require('express');
const router     = express.Router();
const WasteReport = require('../models/WasteReport');
const Collector   = require('../models/Collector');
const { protect } = require('../middleware/auth');
const { createNotification } = require('../controllers/notificationController');

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
    const { filter, sort } = req.query;
    const cid = req.user.id;
    const collector = req.collector;
    const villages = Array.isArray(collector.villages) && collector.villages.length
      ? collector.villages
      : collector.village ? [collector.village] : [];

    const mine = { assignedCollector: cid };
    const villageQueue = villages.length
      ? { status: 'Submitted', assignedCollector: null, village: { $in: villages } }
      : { status: 'Submitted', assignedCollector: null };

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
    } else if (['Assigned', 'In Progress', 'Resolved', 'Delayed'].includes(filter)) {
      query = { assignedCollector: cid, status: filter };
    } else {
      query = { ...mine, status: filter };
    }

    let reports = await WasteReport.find(query).sort({ createdAt: -1 }).lean();
    if (sort === 'priority') {
      const order = { High: 0, Medium: 1, Low: 2 };
      reports.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
    }
    res.json(reports);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/available', protect, collectorAuth, async (req, res) => {
  try {
    const reports = await WasteReport.find({ status: 'Submitted', assignedCollector: null }).sort({ createdAt: -1 }).lean();
    res.json(reports);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/report/:id/status', protect, collectorAuth, async (req, res) => {
  try {
    const { status, completionPhoto, completionNotes, delayReason } = req.body;
    const cid = req.user.id;

    // Edge Case 5 — Task Locking: atomically accept only if still unassigned/unlocked
    if (status === 'Assigned') {
      const locked = await WasteReport.findOneAndUpdate(
        {
          _id: req.params.id,
          $or: [
            { status: 'Submitted', isLocked: { $ne: true } },
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

      if (locked.userId) {
        createNotification(locked.userId, 'Report Assigned',
          `A collector has been assigned to your ${locked.wasteType} waste report.`, 'status', locked._id);
      }
      return res.json({ message: 'Task accepted.', report: locked });
    }

    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    // Only the assigned collector can progress the task
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
      report.completionPhoto   = completionPhoto || '';
      report.completionNotes   = completionNotes || '';
      report.completedAt       = new Date();
      report.citizenVerified   = 'pending';
      await Collector.findByIdAndUpdate(cid, { $inc: { completedTasks: 1 } });
      if (report.userId) createNotification(report.userId, 'Report Resolved',
        `Your ${report.wasteType} waste report has been resolved. Was the issue fixed?`, 'status', report._id);
    }
    if (status === 'Delayed') {
      report.delayReason = delayReason || '';
      report.delayTime   = new Date();
      if (report.userId) createNotification(report.userId, 'Report Delayed',
        `Your ${report.wasteType} waste report is delayed: ${delayReason}`, 'delay', report._id);
    }
    await report.save();
    res.json({ message: 'Status updated.', report });
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
    const collector = req.collector; // populated by collectorAuth middleware
    if (!collector) return res.status(404).json({ message: 'Collector not found.' });

    res.json({
      _id:          collector._id,
      name:         collector.name,
      email:        collector.email || '',
      phone:        collector.mobile || '',
      role:         'Collector',
      locality:     collector.area || '',
      profilePhoto: collector.photo || '',
      completedTasks: collector.completedTasks || 0,
      createdAt:    collector.createdAt,
      collectorId:  collector.collectorId,
      city:         collector.city,
      area:         collector.area,
      performanceScore: collector.performanceScore || 0,
      availability: collector.availability
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

router.put('/profile', protect, collectorAuth, async (req, res) => {
  try {
    const { name, mobile, email, photo } = req.body;
    const update = {};
    if (name  !== undefined) update.name  = name;
    if (mobile !== undefined) update.mobile = mobile;
    if (email !== undefined) update.email = email;
    if (photo !== undefined) update.photo  = photo;

    const collector = await Collector.findByIdAndUpdate(req.user.id, update, { returnDocument: 'after' }).select('-password');
    res.json({ message: 'Profile updated.', user: collector });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

const ScrapRequest   = require('../models/ScrapRequest');

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
      pendingScrap, assignedScrap, inProgressScrap, completedScrapToday, totalScrap
    ] = await Promise.all([
      WasteReport.countDocuments({ status: 'Submitted', assignedCollector: null, ...villageFilter }),
      WasteReport.countDocuments({ assignedCollector: cid, status: 'Assigned' }),
      WasteReport.countDocuments({ assignedCollector: cid, status: 'In Progress' }),
      WasteReport.countDocuments({ assignedCollector: cid, status: 'Resolved', completedAt: { $gte: today } }),
      WasteReport.countDocuments({ assignedCollector: cid }),

      ScrapRequest.countDocuments({ status: 'Requested', assignedCollector: null }),
      ScrapRequest.countDocuments({ assignedCollector: cid, status: 'Assigned' }),
      ScrapRequest.countDocuments({ assignedCollector: cid, status: 'In Progress' }),
      ScrapRequest.countDocuments({ assignedCollector: cid, status: 'Collected', updatedAt: { $gte: today } }),
      ScrapRequest.countDocuments({ assignedCollector: cid }),
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
      scrapDetails: { pendingScrap, assignedScrap, inProgressScrap, completedScrapToday, totalScrap }
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
          status: { $nin: ['Resolved'] },
        }).limit(20).lean();
      }
    }

    res.json({ villageReports, nearbyReports, villages, village: villages[0] || '' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
