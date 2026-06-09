const User = require('../models/User');
const EcoPointHistory = require('../models/EcoPointHistory');
const CampaignMultiplier = require('../models/CampaignMultiplier');
const { syncUserPoints, broadcastLeaderboardUpdate } = require('../utils/rewardSync');
const { updateStreak } = require('../utils/streakManager');

// Helper: Calculate Level based on total earned points
const calculateLevel = (totalPoints) => {
  if (totalPoints >= 5000) return 'Green Champion Supporter';
  if (totalPoints >= 2000) return 'Recycling Hero';
  if (totalPoints >= 500)  return 'Eco Warrior';
  return 'Green Beginner';
};

// Helper: Get active multiplier
const getActiveMultiplier = async () => {
  const now = new Date();
  const campaign = await CampaignMultiplier.findOne({
    active: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  });
  return campaign ? campaign.multiplier : 1;
};

// Public: Get user rewards profile
const getRewardsProfile = async (req, res) => {
  try {
    // Check/Update Streak first
    const streakResult = await updateStreak(req.user.id);

    const user = await User.findById(req.user.id).select('rewards ecoPoints streakCount highestStreak streakRewardsTotal');
    const history = await EcoPointHistory.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Check for active campaigns
    const now = new Date();
    const activeCampaigns = await CampaignMultiplier.find({
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    res.json({
      points: user.rewards.points,
      totalEarned: user.rewards.totalEarned,
      level: user.rewards.level,
      badges: user.rewards.badges,
      streak: {
        current: user.streakCount || 0,
        highest: user.highestStreak || 0,
        totalRewards: user.streakRewardsTotal || 0
      },
      streakUpdate: streakResult,
      history,
      activeCampaigns
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Internal/Admin: Award points for activity
const awardPoints = async (userId, basePoints, reason, relatedId = null, type = 'report') => {
  try {
    const multiplier = await getActiveMultiplier();
    const finalPoints = Math.round(basePoints * multiplier);

    const user = await User.findById(userId);
    if (!user) return;

    // Update user points
    user.rewards.points += finalPoints;
    user.rewards.totalEarned += finalPoints;
    user.rewards.monthlyPoints += finalPoints;
    user.ecoPoints += finalPoints; // Legacy

    // Update Level
    const newLevel = calculateLevel(user.rewards.totalEarned);
    if (newLevel !== user.rewards.level) {
      user.rewards.level = newLevel;
      // Add level badge if not exists
      if (!user.rewards.badges.includes(newLevel)) {
        user.rewards.badges.push(newLevel);
      }
    }

    await user.save();

    // Create history entry
    await EcoPointHistory.create({
      userId,
      points: finalPoints,
      reason: multiplier > 1 ? `${reason} (x${multiplier} Event Bonus!)` : reason,
      type: 'Credit',
      status: 'Approved',
      [type === 'report' ? 'reportId' : 'scrapId']: relatedId
    });

    // Real-time Sync
    await syncUserPoints(userId);
    broadcastLeaderboardUpdate();

    return finalPoints;
  } catch (err) {
    console.error('Error awarding points:', err);
  }
};

// Internal/Shopping: Deduct points for purchase
const deductPoints = async (userId, points, reason, relatedId = null) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.rewards.points < points) throw new Error('Insufficient points');

    user.rewards.points -= points;
    user.ecoPoints -= points; // Keep legacy field in sync
    await user.save();

    await EcoPointHistory.create({
      userId,
      points,
      reason,
      type: 'Debit',
      status: 'Approved',
      itemId: relatedId
    });

    // Real-time Sync
    await syncUserPoints(userId);
    broadcastLeaderboardUpdate();

    return true;
  } catch (err) {
    console.error('Error deducting points:', err);
    throw err;
  }
};

module.exports = { getRewardsProfile, awardPoints, deductPoints, getActiveMultiplier };
