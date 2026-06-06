const User = require('../models/User');
const WasteReport = require('../models/WasteReport');
const ScrapRequest = require('../models/ScrapRequest');

const getLeaderboard = async (req, res) => {
  try {
    const { filter = 'points', period = 'all-time', village, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let matchQuery = { role: 'citizen' };
    if (village && village !== 'all') {
      matchQuery.village = { $regex: new RegExp(village, 'i') };
    }

    let primarySortField = 'totalPoints';
    if (period === 'monthly') {
      primarySortField = 'monthlyPoints';
    } else if (filter === 'reports') {
      primarySortField = 'reportCount';
    } else if (filter === 'scrap') {
      primarySortField = 'scrapCount';
    }

    // Secondary tie-breaker sort
    let secondarySortField = 'reportCount';
    if (primarySortField === 'reportCount' || primarySortField === 'scrapCount') {
      secondarySortField = period === 'monthly' ? 'monthlyPoints' : 'totalPoints';
    }

    // Aggregation pipeline for proper ranking and stats
    const pipeline = [
      { $match: matchQuery },
      // Look up reports
      {
        $lookup: {
          from: 'wastereports',
          localField: '_id',
          foreignField: 'userId',
          as: 'reports'
        }
      },
      // Look up scrap requests
      {
        $lookup: {
          from: 'scraprequests',
          localField: '_id',
          foreignField: 'userId',
          as: 'scrap'
        }
      },
      {
        $addFields: {
          // Count ALL reports submitted by the citizen
          reportCount: { $size: '$reports' },
          scrapCount: { 
            $size: { 
              $filter: { 
                input: '$scrap', 
                as: 's', 
                cond: { $eq: ['$$s.status', 'Collected'] } 
              } 
            } 
          },
          totalPoints: { $ifNull: ['$rewards.totalEarned', 0] },
          monthlyPoints: { $ifNull: ['$rewards.monthlyPoints', 0] }
        }
      },
      {
        $sort: {
          [primarySortField]: -1,
          [secondarySortField]: -1
        }
      },
    ];

    // Get total count for pagination
    const allUsers = await User.aggregate(pipeline);
    const total = allUsers.length;

    // Paginated results
    const users = allUsers.slice(skip, skip + parseInt(limit));

    const leaderboard = users.map((u, i) => ({
      _id: u._id,
      name: u.name,
      avatar: u.profilePhoto || '',
      village: u.village || 'Global',
      points: period === 'monthly' ? u.monthlyPoints : u.totalPoints,
      ecoPoints: period === 'monthly' ? u.monthlyPoints : u.totalPoints,
      reportCount: u.reportCount,
      reportsCount: u.reportCount,
      scrapCount: u.scrapCount,
      level: u.rewards?.level || 'Green Beginner',
      rank: skip + i + 1
    }));

    // Current user rank
    let myRankInfo = null;
    const myIndex = allUsers.findIndex(u => u._id.toString() === req.user.id);
    if (myIndex !== -1) {
      const me = allUsers[myIndex];
      myRankInfo = {
        _id: me._id,
        name: me.name,
        village: me.village || 'Global',
        rank: myIndex + 1,
        points: period === 'monthly' ? me.monthlyPoints : me.totalPoints,
        ecoPoints: period === 'monthly' ? me.monthlyPoints : me.totalPoints,
        level: me.rewards?.level || 'Green Beginner',
        reportCount: me.reportCount,
        reportsCount: me.reportCount,
        scrapCount: me.scrapCount
      };
    }

    res.json({
      leaderboard,
      me: myRankInfo,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (err) {
    console.error('[getLeaderboard Error]:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

module.exports = { getLeaderboard };
