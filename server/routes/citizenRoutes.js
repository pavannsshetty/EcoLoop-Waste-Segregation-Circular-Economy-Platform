const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { updateStreak } = require('../utils/streakManager');
const {
    getCommunityPosts,
    getCampaigns,
    joinCampaign,
    requestRecyclingPickup,
    submitGCFeedback
} = require('../controllers/citizenActionController');
const User    = require('../models/User');
const Collector = require('../models/Collector');
const WasteReport = require('../models/WasteReport');
const EcoPointHistory = require('../models/EcoPointHistory');
const upload = require('../middleware/uploadMiddleware');

const CHANGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const isWithinChangeWindow = (date) => date && (Date.now() - new Date(date).getTime()) < CHANGE_WINDOW_MS;

router.get('/profile', protect, async (req, res) => {
  try {
    await updateStreak(req.user.id);
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const [reportsCount, resolvedCount, history] = await Promise.all([
      WasteReport.countDocuments({ userId: req.user.id }),
      WasteReport.countDocuments({ userId: req.user.id, status: 'Resolved' }),
      EcoPointHistory.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20),
    ]);

    res.json({
      _id:          user._id,
      name:         user.name,
      email:        user.email,
      phone:        user.phone,
      role:         user.role,
      locality:     user.locality,
      village:      user.village,
      homeAddress:  user.homeAddress,
      houseNo:      user.houseNo,
      streetArea:   user.streetArea,
      landmark:     user.landmark,
      addressType:  user.addressType,
      latitude:     user.latitude,
      longitude:    user.longitude,
      ecoPoints:    user.ecoPoints    || 0,
      badges:       user.badges       || [],
      profilePhoto: user.profilePhoto || '',
      lastNameUpdatedAt: user.lastNameUpdatedAt,
      lastEmailUpdatedAt: user.lastEmailUpdatedAt,
      lastPhoneUpdatedAt: user.lastPhoneUpdatedAt,
      streakCount:  user.streakCount  || 0,
      reportsCount,
      resolvedCount,
      pointsHistory: history,
      createdAt:    user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

router.post('/upload-photo', protect, upload.single('photo'), async (req, res) => {
  try {
    const photoUrl = req.file.path;
    const user = await User.findByIdAndUpdate(req.user.id, { $set: { profilePhoto: photoUrl } }, { new: true }).select('-password');
    res.json({ message: 'Photo uploaded.', user, photoUrl });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading photo.', error: err.message });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, phone, locality, village, profilePhoto, houseNo, streetArea, landmark, addressType, latitude, longitude, currentPassword } = req.body;
    const existing = await User.findById(req.user.id).select('+password');
    if (!existing) return res.status(404).json({ message: 'User not found.' });

    const update = {};
    
    if (name && name.trim() && name.trim() !== existing.name) {
      if (isWithinChangeWindow(existing.lastNameUpdatedAt)) {
        return res.status(400).json({ message: 'You can update your name only once every 7 days.' });
      }
      update.name = name.trim();
      update.lastNameUpdatedAt = new Date();
    }
    if (email !== undefined && email.trim().toLowerCase() !== existing.email) {
      return res.status(400).json({ message: 'Email updates require verification.' });
    }
    if (phone && phone.trim() !== existing.phone) {
      const cleanPhone = phone.trim();
      if (!/^\d{10}$/.test(cleanPhone)) {
        return res.status(400).json({ message: 'Phone number must contain exactly 10 digits.' });
      }
      if (isWithinChangeWindow(existing.lastPhoneUpdatedAt)) {
        return res.status(400).json({ message: 'You can update phone number only once every 7 days.' });
      }
      if (!currentPassword || !(await existing.matchPassword(currentPassword))) {
        return res.status(401).json({ message: 'Incorrect password.' });
      }
      const duplicatePhone = await User.findOne({ phone: cleanPhone, _id: { $ne: existing._id } });
      if (duplicatePhone) return res.status(409).json({ message: 'Phone number already in use.' });
      const duplicateCollectorPhone = await Collector.findOne({ mobile: cleanPhone });
      if (duplicateCollectorPhone) return res.status(409).json({ message: 'Phone number already in use.' });
      update.phone = cleanPhone;
      update.lastPhoneUpdatedAt = new Date();
    }
    if (locality && locality.trim())    update.locality        = locality.trim();
    if (village !== undefined && village.trim() !== existing.village) {
      return res.status(400).json({ message: 'Village cannot be updated directly. Please request village change.' });
    }
    if (profilePhoto !== undefined)     update.profilePhoto    = profilePhoto;
    
    // Address fields for onboarding
    if (houseNo !== undefined)          update.houseNo         = houseNo ? houseNo.trim() : '';
    if (streetArea !== undefined)       update.streetArea      = streetArea ? streetArea.trim() : '';
    if (landmark !== undefined)         update.landmark        = landmark ? landmark.trim() : '';
    if (addressType !== undefined)      update.addressType     = addressType || '';
    if (latitude !== undefined)         update.latitude        = typeof latitude === 'number' ? latitude : parseFloat(latitude);
    if (longitude !== undefined)        update.longitude       = typeof longitude === 'number' ? longitude : parseFloat(longitude);

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No valid changes provided.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { $set: update }, 
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully.', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// COMMUNITY ACTIONS
router.get('/community/posts', protect, getCommunityPosts);
router.get('/community/campaigns', protect, getCampaigns);
router.post('/community/campaign/:campaignId/join', protect, joinCampaign);
router.post('/community/recycling-request', protect, requestRecyclingPickup);
router.post('/community/gc-feedback', protect, submitGCFeedback);

module.exports = router;
