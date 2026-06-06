const User = require('../models/User');
const { syncUserPoints } = require('./rewardSync');

const MILESTONES = {
  3: 20,
  7: 50,
  15: 100,
  30: 250 // + Special logic for badge
};

const updateStreak = async (userId) => {
  try {
    const { awardPoints } = require('../controllers/rewardsController');
    const user = await User.findById(userId);
    if (!user) return null;

    const now = new Date();
    const lastLogin = user.lastActiveDate;

    // Set times to midnight for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (lastLogin) {
      const last = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
      const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already active today, return immediately without redundant database write
        return { updated: false, streakCount: user.streakCount };
      }

      if (diffDays === 1) {
        // Consecutive day
        user.streakCount += 1;
      } else {
        // Missed day(s)
        user.streakCount = 1;
      }
    } else {
      // First login ever
      user.streakCount = 1;
    }

    // Update highest streak
    if (user.streakCount > user.highestStreak) {
      user.highestStreak = user.streakCount;
    }

    user.lastActiveDate = now;
    await user.save();

    // Check for milestones
    let bonusEarned = 0;
    if (MILESTONES[user.streakCount]) {
      bonusEarned = MILESTONES[user.streakCount];
      await awardPoints(userId, bonusEarned, `${user.streakCount} Day Login Streak Bonus! 🔥`, null, 'streak');
      user.streakRewardsTotal = (user.streakRewardsTotal || 0) + bonusEarned;
      
      // Special badge for 30 days
      if (user.streakCount === 30 && !user.rewards.badges.includes('Monthly Legend')) {
        user.rewards.badges.push('Monthly Legend');
      }
      await user.save();
    }

    // Sync to frontend
    await syncUserPoints(userId);

    return { 
      updated: true, 
      streakCount: user.streakCount, 
      bonus: bonusEarned,
      highest: user.highestStreak
    };

  } catch (err) {
    console.error('[updateStreak Error]:', err);
    return null;
  }
};

module.exports = { updateStreak };
