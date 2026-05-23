const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const User    = require('../models/User');
const Collector = require('../models/Collector');
const WasteReport = require('../models/WasteReport');
const EcoPointHistory = require('../models/EcoPointHistory');
const ApprovalRequest = require('../models/ApprovalRequest');
const upload = require('../middleware/uploadMiddleware');
const { getCanonicalVillageName } = require('../data/kundapuraVillages');

const CHANGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const isWithinChangeWindow = (date) => date && (Date.now() - new Date(date).getTime()) < CHANGE_WINDOW_MS;

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const [reportsCount, resolvedCount, history] = await Promise.all([
      WasteReport.countDocuments({ userId: req.user.id }),
      WasteReport.countDocuments({ userId: req.user.id, status: 'Resolved' }),
      EcoPointHistory.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20),
    ]);

    const safeUser = {
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
      currentLocation: user.currentLocation,
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
    };

    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

router.post('/upload-photo', protect, upload.single('photo'), async (req, res) => {
  try {
    const photoUrl = req.file.path;
    const user = await User.findByIdAndUpdate(req.user.id, { $set: { profilePhoto: photoUrl } }, { new: true }).select('-password');
    
    res.json({ message: 'Photo uploaded successfully.', user, photoUrl });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading photo.', error: err.message });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, phone, locality, currentPassword } = req.body;
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

    if (locality && locality.trim()) update.locality = locality.trim();
    if (req.body.village !== undefined && req.body.village.trim() !== existing.village) {
      return res.status(400).json({ message: 'Village cannot be updated directly. Please request village change.' });
    }
    if (req.body.homeAddress !== undefined) update.homeAddress = req.body.homeAddress.trim();
    if (req.body.houseNo !== undefined)     update.houseNo     = req.body.houseNo.trim();
    if (req.body.streetArea !== undefined)  update.streetArea  = req.body.streetArea.trim();
    if (req.body.landmark !== undefined)    update.landmark    = req.body.landmark.trim();
    if (req.body.addressType !== undefined) update.addressType = req.body.addressType.trim();
    if (req.body.latitude !== undefined)    update.latitude    = req.body.latitude;
    if (req.body.longitude !== undefined)   update.longitude   = req.body.longitude;
    if (req.body.currentLocation !== undefined) update.currentLocation = req.body.currentLocation.trim();

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

router.post('/email-change-request', protect, async (req, res) => {
  try {
    const { email, currentPassword } = req.body;
    const requestedEmail = email?.trim().toLowerCase();
    if (!requestedEmail) return res.status(400).json({ message: 'Email is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (requestedEmail === user.email) return res.status(400).json({ message: 'No valid changes provided.' });
    if (isWithinChangeWindow(user.lastEmailUpdatedAt)) {
      return res.status(400).json({ message: 'You can update email only once every 7 days.' });
    }
    if (!currentPassword || !(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const duplicateEmail = await User.findOne({ email: requestedEmail, _id: { $ne: user._id } });
    if (duplicateEmail) return res.status(409).json({ message: 'Email already in use.' });
    const duplicateCollectorEmail = await Collector.findOne({ email: requestedEmail });
    if (duplicateCollectorEmail) return res.status(409).json({ message: 'Email already in use.' });

    const pending = await ApprovalRequest.findOne({
      citizen: user._id,
      type: 'email_change',
      status: 'Pending',
    });
    if (pending) return res.status(409).json({ message: 'Email updates require verification.' });

    const request = await ApprovalRequest.create({
      citizen: user._id,
      type: 'email_change',
      currentEmail: user.email,
      requestedEmail,
      reason: 'Citizen requested verified email update.',
    });

    try {
      const { emitToAll } = require('../socket');
      emitToAll('approval_request_created', { requestId: request._id, type: request.type });
    } catch {}

    res.status(201).json({ message: 'Email updates require verification.', request });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

router.post('/village-change-request', protect, async (req, res) => {
  try {
    const { requestedVillage, reason } = req.body;
    const village = getCanonicalVillageName(requestedVillage);
    const cleanReason = reason?.trim();
    if (!village) return res.status(400).json({ message: 'Select a valid Kundapura Taluk village.' });
    if (!cleanReason) return res.status(400).json({ message: 'Reason for change is required.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (village === user.village) return res.status(400).json({ message: 'Requested village must be different from current village.' });

    const pending = await ApprovalRequest.findOne({
      citizen: user._id,
      type: 'village_change',
      status: 'Pending',
    });
    if (pending) return res.status(409).json({ message: 'A village change request is already pending.' });

    const request = await ApprovalRequest.create({
      citizen: user._id,
      type: 'village_change',
      currentVillage: user.village,
      requestedVillage: village,
      reason: cleanReason,
    });

    try {
      const { emitToAll } = require('../socket');
      emitToAll('approval_request_created', { requestId: request._id, type: request.type });
    } catch {}

    res.status(201).json({ message: 'Village change request submitted.', request });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;
