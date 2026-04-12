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

const updateStreak = async (userId) => {
  try {
    const user = await User.findById(userId).select('streakCount lastActiveDate');
    if (!user) return;
    const today     = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const last      = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    if (last) { last.setHours(0, 0, 0, 0); }

    let newStreak = 1;
    if (last) {
      if (last.getTime() === today.getTime()) {
        newStreak = user.streakCount || 1;
      } else if (last.getTime() === yesterday.getTime()) {
        newStreak = (user.streakCount || 0) + 1;
      }
    }
    await User.findByIdAndUpdate(userId, { streakCount: newStreak, lastActiveDate: today });
    return newStreak;
  } catch (err) {
    console.error('[updateStreak]', err.message);
  }
};

const awardPoints = async (userId, points, reason, reportId = null) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { ecoPoints: points } },
      { returnDocument: 'after' }
    );
    if (!user) return;
    const newBadges = computeBadges(user.ecoPoints);
    await User.findByIdAndUpdate(userId, { badges: newBadges });
    await EcoPointHistory.create({ userId, points, reason, reportId });
    if (reason === 'Report Submitted') await updateStreak(userId);
  } catch (err) {
    console.error('[awardPoints]', err.message);
  }
};

const getRewards = async (req, res) => {
  try {
    const user    = await User.findById(req.user.id).select('ecoPoints badges name streakCount');
    const history = await EcoPointHistory.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json({
      ecoPoints:   user?.ecoPoints   || 0,
      badges:      user?.badges      || [],
      streakCount: user?.streakCount || 0,
      history,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

module.exports = { awardPoints, getRewards, updateStreak };
