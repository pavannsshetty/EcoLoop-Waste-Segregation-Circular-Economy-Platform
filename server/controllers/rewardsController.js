const User            = require('../models/User');
const EcoPointHistory = require('../models/EcoPointHistory');

const BADGE_THRESHOLDS = [
  { points: 500, badge: 'Green Champion'  },
  { points: 200, badge: 'Eco Warrior'     },
  { points: 100, badge: 'Green Supporter' },
  { points:  50, badge: 'Eco Beginner'    },
];

const computeBadges = (points) =>
  BADGE_THRESHOLDS.filter(b => points >= b.points).map(b => b.badge);

const awardPoints = async (userId, points, reason, reportId = null) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    user.ecoPoints = (user.ecoPoints || 0) + points;
    user.badges    = computeBadges(user.ecoPoints);
    await user.save();
    await EcoPointHistory.create({ userId, points, reason, reportId });
  } catch { }
};

const getRewards = async (req, res) => {
  try {
    const user    = await User.findById(req.user.id).select('ecoPoints badges name');
    const history = await EcoPointHistory.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json({ ecoPoints: user?.ecoPoints || 0, badges: user?.badges || [], history });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

module.exports = { awardPoints, getRewards };
