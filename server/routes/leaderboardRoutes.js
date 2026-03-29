const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const User        = require('../models/User');
const WasteReport = require('../models/WasteReport');

router.get('/', protect, async (req, res) => {
  try {
    const { filter = 'overall', area } = req.query;

    let matchStage = { role: 'Citizen', ecoPoints: { $gt: 0 } };
    if (area) matchStage['address'] = { $regex: area, $options: 'i' };

    let users = await User.find(matchStage)
      .select('name ecoPoints badges locality city address')
      .sort({ ecoPoints: -1 })
      .limit(50)
      .lean();

    const userIds = users.map(u => u._id);
    const reportCounts = await WasteReport.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(reportCounts.map(r => [r._id.toString(), r.count]));

    const ranked = users.map((u, i) => ({
      ...u,
      rank:         i + 1,
      reportsCount: countMap[u._id.toString()] || 0,
      topBadge:     u.badges?.[0] || null,
    }));

    const currentUser = await User.findById(req.user.id).select('ecoPoints badges name').lean();
    const myRank = ranked.findIndex(u => u._id.toString() === req.user.id) + 1;
    const myReports = countMap[req.user.id] || 0;

    res.json({
      leaderboard: ranked,
      me: { rank: myRank || '50+', ecoPoints: currentUser?.ecoPoints || 0, reportsCount: myReports, name: currentUser?.name || '' },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;
