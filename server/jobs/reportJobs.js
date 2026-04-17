/**
 * Background jobs for waste report edge cases.
 * Edge Case 3  — Auto-reassign tasks not accepted within 2 hours.
 * Edge Case 10 — Escalate tasks not completed within deadline.
 *
 * Call startReportJobs() once from server.js.
 */

const WasteReport  = require('../models/WasteReport');
const Collector    = require('../models/Collector');
const { createNotification } = require('../controllers/notificationController');

const MAX_ACTIVE_TASKS = 10;

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000, r = d => (d * Math.PI) / 180;
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Edge Case 3 — reassign tasks locked but not started within 2 hours
const autoReassignStaleTask = async () => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const stale = await WasteReport.find({
      status: 'Assigned',
      isLocked: true,
      lockedAt: { $lt: twoHoursAgo },
    }).lean();

    for (const report of stale) {
      // Find another eligible collector
      const collectors = await Collector.find({
        status: 'Active',
        availability: { $ne: 'Offline' },
        _id: { $ne: report.assignedCollector },
      }).lean();

      const activeCounts = await Promise.all(
        collectors.map(c =>
          WasteReport.countDocuments({ assignedCollector: c._id, status: { $in: ['Assigned', 'In Progress'] } })
        )
      );

      const eligible = collectors.filter((_, i) => activeCounts[i] < MAX_ACTIVE_TASKS);
      const next = eligible[0] || null;

      await WasteReport.findByIdAndUpdate(report._id, {
        status:            next ? 'Assigned' : 'Submitted',
        assignedCollector: next ? next._id   : null,
        isLocked:          !!next,
        lockedAt:          next ? new Date() : null,
      });

      if (next) {
        createNotification(next._id, 'Task Reassigned',
          `A ${report.wasteType} waste report has been reassigned to you.`, 'report', report._id);
      }
      if (report.userId) {
        createNotification(report.userId, 'Collector Reassigned',
          `Your ${report.wasteType} waste report has been reassigned to a new collector.`, 'status', report._id);
      }
    }
  } catch (err) {
    console.error('[autoReassign]', err.message);
  }
};

// Edge Case 10 — escalate overdue tasks
const escalateOverdueTasks = async () => {
  try {
    const now = new Date();
    const overdue = await WasteReport.find({
      status: { $in: ['Submitted', 'Assigned', 'In Progress'] },
      deadline: { $lt: now },
      escalated: { $ne: true },
    }).lean();

    for (const report of overdue) {
      await WasteReport.findByIdAndUpdate(report._id, {
        escalated:   true,
        escalatedAt: now,
        severity:    'High',
        $inc: { priority: 10 },
      });

      if (report.userId) {
        createNotification(report.userId, 'Issue Escalated',
          `Your ${report.wasteType} waste report is overdue and has been escalated.`, 'escalation', report._id);
      }
      if (report.assignedCollector) {
        createNotification(report.assignedCollector, 'Task Overdue',
          `A task assigned to you is overdue and has been escalated to High priority.`, 'escalation', report._id);
      }
    }
  } catch (err) {
    console.error('[escalateOverdue]', err.message);
  }
};

const startReportJobs = () => {
  // Run every 30 minutes
  setInterval(autoReassignStaleTask,  30 * 60 * 1000);
  setInterval(escalateOverdueTasks,   30 * 60 * 1000);
  // Also run immediately on startup
  autoReassignStaleTask();
  escalateOverdueTasks();
  console.log('[reportJobs] Background jobs started.');
};

module.exports = { startReportJobs };
