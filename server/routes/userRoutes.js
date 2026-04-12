const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const User    = require('../models/User');
const Collector = require('../models/Collector');
const WasteReport = require('../models/WasteReport');
const EcoPointHistory = require('../models/EcoPointHistory');

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (user) {
      const [reportsCount, resolvedCount, history] = await Promise.all([
        WasteReport.countDocuments({ userId: req.user.id }),
        WasteReport.countDocuments({ userId: req.user.id, status: 'Resolved' }),
        EcoPointHistory.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20),
      ]);

      return res.json({
        _id:          user._id,
        name:         user.name,
        email:        user.email,
        phone:        user.phone,
        role:         user.role,
        address:      user.address,
        locality:     user.locality,
        ecoPoints:    user.ecoPoints    || 0,
        badges:       user.badges       || [],
        profilePhoto: user.profilePhoto || '',
        streakCount:  user.streakCount  || 0,
        reportsCount,
        resolvedCount,
        pointsHistory: history,
        createdAt:    user.createdAt,
      });
    }

    const collector = await Collector.findById(req.user.id).select('-password');
    if (!collector) return res.status(404).json({ message: 'User not found.' });

    return res.json({
      _id:          collector._id,
      name:         collector.name,
      email:        collector.email || '',
      phone:        collector.mobile || '',
      role:         'Collector',
      address:      '',
      locality:     collector.area || '',
      ecoPoints:    0,
      badges:       [],
      profilePhoto: collector.photo || '',
      streakCount:  0,
      reportsCount: 0,
      resolvedCount: 0,
      pointsHistory: [],
      createdAt:    collector.createdAt,
      collectorId:  collector.collectorId,
      city:         collector.city,
      area:         collector.area,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, address, locality, city, pincode, profilePhoto } = req.body;
    const update = {};
    if (name         !== undefined) update.name         = name;
    if (phone        !== undefined) update.phone        = phone;
    if (address      !== undefined) update.address      = address;
    if (locality     !== undefined) update.locality     = locality;
    if (city         !== undefined) update.city         = city;
    if (pincode      !== undefined) update.pincode      = pincode;
    if (profilePhoto !== undefined) update.profilePhoto = profilePhoto;

    const user = await User.findByIdAndUpdate(req.user.id, update, { returnDocument: 'after' }).select('-password');
    const stored = JSON.parse(JSON.stringify(user));
    res.json({ message: 'Profile updated.', user: stored });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;
