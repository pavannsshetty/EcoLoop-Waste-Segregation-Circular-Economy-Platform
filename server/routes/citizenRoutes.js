const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const User    = require('../models/User');
const WasteReport = require('../models/WasteReport');
const EcoPointHistory = require('../models/EcoPointHistory');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ── Multer Config (Identical to userRoutes for consistency) ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/profiles';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
});

router.get('/profile', protect, async (req, res) => {
  try {
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
      ecoPoints:    user.ecoPoints    || 0,
      badges:       user.badges       || [],
      profilePhoto: user.profilePhoto || '',
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
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user.id, { $set: { profilePhoto: photoUrl } }, { new: true }).select('-password');
    res.json({ message: 'Photo uploaded.', user, photoUrl });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading photo.', error: err.message });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, locality, profilePhoto } = req.body;
    const update = {};
    if (name && name.trim())     update.name     = name.trim();
    if (phone && phone.trim())   update.phone    = phone.trim();
    if (locality && locality.trim()) update.locality = locality.trim();
    if (profilePhoto !== undefined)  update.profilePhoto = profilePhoto;

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

module.exports = router;
