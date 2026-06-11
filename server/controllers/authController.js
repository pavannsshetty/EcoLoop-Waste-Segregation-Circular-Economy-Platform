const jwt       = require('jsonwebtoken');
const User      = require('../models/User');
const Collector = require('../models/Collector');
const GreenChampionRequest = require('../models/GreenChampionRequest');
const bcrypt    = require('bcryptjs');
const { getCanonicalVillageName } = require('../data/kundapuraVillages');
const { updateStreak } = require('../utils/streakManager');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });


// POST /api/auth/register
const register = async (req, res) => {
  try {
    let { name, email, password, phone, role, locality, village } = req.body;
    role = role?.toLowerCase().trim();
    if (role === 'greenchampion' || role === 'green champion') role = 'green_champion';

    if (role === 'collector' || role === 'green_champion') {
      return res.status(403).json({ message: `${role} accounts are issued by the administrator.` });
    }

    if (!email || !phone) {
      return res.status(400).json({ message: 'Email and phone are required.' });
    }
    const searchEmail = email.toLowerCase().trim();
    const searchPhone = phone.trim();

    // Indian Mobile Number Validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(searchPhone)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit mobile number starting with 9, 8, 7, or 6.' });
    }

    // 1. Check Citizens & Green Champions (User model)
    const existingUser = await User.findOne({ $or: [{ email: searchEmail }, { phone: searchPhone }] });
    if (existingUser) {
      const msg = existingUser.role === 'green_champion' 
        ? 'This mobile number/email is already associated with a Green Champion account.'
        : 'Citizen account already exists with this mobile number/email.';
      return res.status(409).json({ message: msg });
    }

    // 2. Check Collectors
    const existingCollector = await Collector.findOne({ $or: [{ email: searchEmail }, { mobile: searchPhone }] });
    if (existingCollector) {
      return res.status(409).json({ message: 'This mobile number/email is already associated with a Collector account.' });
    }

    // 3. Check Pending Green Champion Requests
    const existingRequest = await GreenChampionRequest.findOne({ 
      $or: [{ email: searchEmail }, { mobile: searchPhone }],
      status: { $in: ['PENDING', 'APPROVED'] }
    });
    if (existingRequest) {
      return res.status(409).json({ message: 'A Green Champion request already exists with this mobile number/email.' });
    }

    const canonicalVillage = getCanonicalVillageName(village);

    if (role === 'citizen' && !canonicalVillage) {
      return res.status(400).json({ message: 'Village is required for Citizen registration.' });
    }

    const userData = { name, email: searchEmail, password, phone: searchPhone, role, isVerified: true };
    if (locality) userData.locality = locality;
    if (canonicalVillage) userData.village = canonicalVillage;

    const user  = await User.create(userData);
    await updateStreak(user._id);
    const updatedUser = await User.findById(user._id);
    const token = signToken(updatedUser._id);

    const roleMapping = {
      'citizen': 'Citizen',
      'collector': 'Collector',
      'green_champion': 'GreenChampion'
    };
    const safeUser = updatedUser.toJSON();
    safeUser.role = roleMapping[updatedUser.role] || updatedUser.role;

    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// POST /api/auth/login
const login = async (req, res) => {
  try {
    let { identifier, collectorId, password, role } = req.body;
    role = role?.toLowerCase().trim();
    if (role === 'greenchampion' || role === 'green champion') role = 'green_champion';

    console.log(`\n--- Login Attempt [${new Date().toISOString()}] ---`);
    console.log(`Role: ${role}`);

    if (role === 'collector') {
      const cleanCollectorId = collectorId?.trim();
      if (!cleanCollectorId) {
        console.log('[Login] FAIL: Missing collectorId');
        return res.status(400).json({ message: 'Collector ID is required.' });
      }

      console.log(`Searching Collector with ID: "${cleanCollectorId}"`);
      const collector = await Collector.findOne({ 
        collectorId: { $regex: new RegExp(`^${cleanCollectorId}$`, 'i') } 
      }).select('+password');
      
      if (!collector) {
        console.log(`[Login] FAIL: Collector NOT FOUND for ID: "${cleanCollectorId}"`);
        return res.status(401).json({ message: 'Collector account not found for this ID.' });
      }

      console.log(`Collector found: ${collector.name} (Status: ${collector.status})`);
      
      if (collector.status === 'Inactive') {
        console.log('[Login] FAIL: Account Inactive');
        return res.status(403).json({ message: 'Your account is inactive. Please contact the administrator.' });
      }

      const match = await collector.matchPassword(password);
      if (!match) {
        console.log(`[Login] FAIL: Password MISMATCH for Collector ID: "${cleanCollectorId}"`);
        return res.status(401).json({ message: 'Invalid password for this Collector ID.' });
      }

      console.log(`[Login] SUCCESS: Collector ${collector.name} logged in`);
      const token = signToken(collector._id);
      const safeCollector = { 
        _id: collector._id, 
        name: collector.name, 
        collectorId: collector.collectorId, 
        role: 'Collector', 
        city: collector.city, 
        area: collector.area 
      };
      return res.json({ token, user: safeCollector });
    }

    // Citizen / Green Champion Login
    if (!identifier) {
      console.log('[Login] FAIL: Missing identifier');
      return res.status(400).json({ message: 'Email or phone number is required.' });
    }

    const searchIdentifier = identifier.trim();
    const searchEmail = searchIdentifier.toLowerCase();
    
    console.log(`Searching User with Identifier: "${searchIdentifier}" (Search Role: ${role})`);

    const user = await User.findOne({
      $or: [
        { email: searchEmail }, 
        { phone: searchIdentifier },
        { greenChampionId: { $regex: new RegExp(`^${searchIdentifier}$`, 'i') } }
      ],
    }).select('+password');

    if (!user) {
      console.log(`[Login] FAIL: User NOT FOUND for identifier: "${searchIdentifier}"`);
      const msg = role === 'green_champion' 
        ? 'No Green Champion account found with this ID/Mobile.'
        : 'No account found with this email or phone number.';
      return res.status(401).json({ message: msg });
    }

    console.log(`User found: ${user.name} (DB Role: "${user.role}", DB Status: "${user.accountStatus}")`);

    if (user.role.toLowerCase() !== role) {
      console.log(`[Login] FAIL: Role mismatch. Expected: "${role}", Found: "${user.role}"`);
      return res.status(401).json({ message: 'The provided credentials do not belong to a ' + role + ' account.' });
    }
    
    if (user.role === 'green_champion') {
        const request = await GreenChampionRequest.findOne({ 
            $or: [{ greenChampionId: user.greenChampionId }, { mobile: user.phone }] 
        });

        if (request) {
            if (request.status === 'PENDING') {
                return res.status(403).json({ message: 'Your application is still under review. Please check status later.' });
            }
            if (request.status === 'REJECTED') {
                return res.status(403).json({ message: 'Your application was rejected. Please re-apply with correct details.' });
            }
            if (request.status === 'SUSPENDED') {
                return res.status(403).json({ message: 'Your Green Champion account has been suspended for policy violations.' });
            }
        }
    }

    if (user.accountStatus === 'Deleted') {
      console.log('[Login] FAIL: User Account Deleted');
      return res.status(403).json({ message: 'DELETED_ACCOUNT', deletionReason: user.deletionReason });
    }

    if (user.accountStatus === 'Suspended') {
      console.log('[Login] FAIL: User Account Suspended');
      return res.status(403).json({
        message: 'SUSPENDED_ACCOUNT',
        suspensionReason: user.suspensionReason,
        suspendedUntil: user.suspendedUntil,
        suspensionDuration: user.suspensionDuration,
      });
    }

    if (user.accountStatus === 'Inactive') {
      console.log('[Login] FAIL: User Account Inactive');
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    const isMatch = await user.matchPassword(password);
    console.log(`Password comparison result: ${isMatch}`);

    if (!isMatch) {
      console.log(`[Login] FAIL: Password MISMATCH for user: "${searchIdentifier}"`);
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }

    // Green Champion specific checks after password match
    if (user.role === 'green_champion') {
      if (user.accountStatus === 'Inactive') {
         return res.status(403).json({ message: 'Your Green Champion account is currently suspended or inactive.' });
      }
    }

    console.log(`[Login] SUCCESS: User ${user.name} logged in`);
    await updateStreak(user._id);
    const updatedUser = await User.findById(user._id);
    const token = signToken(updatedUser._id);
    const userRes = updatedUser.toJSON();

    const roleMapping = {
      'citizen': 'Citizen',
      'collector': 'Collector',
      'green_champion': 'GreenChampion'
    };
    userRes.role = roleMapping[updatedUser.role] || updatedUser.role;
    
    // Include isFirstLogin for the frontend to handle password change force
    if (updatedUser.role === 'green_champion') {
      userRes.isFirstLogin = updatedUser.isFirstLogin;
    }

    res.json({ token, user: userRes });

  } catch (err) {
    console.error('[Login] INTERNAL ERROR:', err);
    res.status(500).json({ message: 'An internal server error occurred during login.', error: err.message });
  }
};

// Update Password (used for force password change)
const updatePassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password is required.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.password = password;
    user.isFirstLogin = false;
    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// Reset Password for Green Champions (Forgot Password)
const resetPasswordGC = async (req, res) => {
  try {
    const { greenChampionId, email, password } = req.body;
    if (!greenChampionId || !email || !password) {
      return res.status(400).json({ message: 'Green Champion ID, registered email, and new password are required.' });
    }

    const searchEmail = email.toLowerCase().trim();
    const searchId = greenChampionId.trim();

    // Find User by greenChampionId
    const user = await User.findOne({
      role: 'green_champion',
      greenChampionId: { $regex: new RegExp(`^${searchId}$`, 'i') }
    });

    if (!user) {
      return res.status(404).json({ message: 'Green Champion account not found with this ID.' });
    }

    if (user.email !== searchEmail) {
      return res.status(400).json({ message: 'The email provided does not match the registered email for this Green Champion ID.' });
    }

    // Reuse existing auth infrastructure
    user.password = password;
    user.isFirstLogin = false;
    await user.save();

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

module.exports = { register, login, updatePassword, resetPasswordGC };

