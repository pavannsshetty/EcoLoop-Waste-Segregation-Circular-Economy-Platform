const express    = require('express');
const router     = express.Router();
const WasteReport = require('../models/WasteReport');
const Collector   = require('../models/Collector');
const { protect } = require('../middleware/auth');
const { createNotification } = require('../controllers/notificationController');

const collectorAuth = async (req, res, next) => {
  const collector = await Collector.findById(req.user.id);
  if (!collector) return res.status(403).json({ message: 'Collector access only.' });
  req.collector = collector;
  next();
};

router.get('/reports', protect, collectorAuth, async (req, res) => {
  try {
    const { filter, sort } = req.query;
    const query = { assignedCollector: req.user.id };
    if (filter && filter !== 'all') {
      if (['High', 'Medium', 'Low'].includes(filter)) query.severity = filter;
      else query.status = filter;
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
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    const allowed = { Submitted: ['Assigned'], Assigned: ['In Progress'], 'In Progress': ['Resolved', 'Delayed'] };
    if (!allowed[report.status]?.includes(status)) {
      return res.status(400).json({ message: `Cannot change status from ${report.status} to ${status}.` });
    }

    report.status = status;
    if (status === 'Assigned') report.assignedCollector = req.user.id;
    if (status === 'Resolved') {
      report.completionPhoto = completionPhoto || '';
      report.completionNotes = completionNotes || '';
      report.completedAt     = new Date();
      await Collector.findByIdAndUpdate(req.user.id, { $inc: { completedTasks: 1 } });
      if (report.userId) createNotification(report.userId, 'Report Resolved', `Your ${report.wasteType} waste report has been resolved.`, 'status', report._id);
    }
    if (status === 'Delayed') {
      report.delayReason = delayReason || '';
      report.delayTime   = new Date();
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

router.get('/stats', protect, collectorAuth, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [assigned, inProgress, completedToday, total] = await Promise.all([
      WasteReport.countDocuments({ assignedCollector: req.user.id, status: 'Assigned' }),
      WasteReport.countDocuments({ assignedCollector: req.user.id, status: 'In Progress' }),
      WasteReport.countDocuments({ assignedCollector: req.user.id, status: 'Resolved', completedAt: { $gte: today } }),
      WasteReport.countDocuments({ assignedCollector: req.user.id }),
    ]);
    const collector = await Collector.findById(req.user.id).select('name collectorId city area availability completedTasks');
    res.json({ assigned, inProgress, completedToday, total, collector });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
