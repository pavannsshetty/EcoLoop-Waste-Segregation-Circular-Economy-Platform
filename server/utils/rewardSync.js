const User = require('../models/User');
const { emitToUser, emitToAll } = require('../socket');

const syncUserPoints = async (userId) => {
  try {
    const user = await User.findById(userId).select('rewards ecoPoints streakCount highestStreak');
    if (user) {
      emitToUser(userId.toString(), 'points_updated', {
        points: user.rewards.points,
        totalEarned: user.rewards.totalEarned,
        level: user.rewards.level,
        badges: user.rewards.badges,
        streakCount: user.streakCount || 0,
        highestStreak: user.highestStreak || 0
      });
    }
  } catch (err) {
    console.error('[syncUserPoints Error]:', err);
  }
};

const broadcastLeaderboardUpdate = () => {
  try {
    emitToAll('leaderboard_updated', {
      timestamp: new Date(),
      message: 'Rankings updated'
    });
  } catch (err) {
    console.error('[broadcastLeaderboardUpdate Error]:', err);
  }
};

module.exports = { syncUserPoints, broadcastLeaderboardUpdate };
