const jwt       = require('jsonwebtoken');
const User      = require('../models/User');
const Collector = require('../models/Collector');
const Otp       = require('../models/Otp');
const bcrypt    = require('bcryptjs');
const { sendOtpEmail } = require('../utils/emailService');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/send-otp
const sendOtp = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    console.log(`[sendOtp] Request received for email: ${email}`);
    // Generate 4 digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store in DB
    await Otp.findOneAndUpdate(
      { email },
      { otp: otpCode, expiresAt, attempts: 0 },
      { upsert: true, returnDocument: 'after' }
    );

    // Send Email
    await sendOtpEmail(email, name || 'User', otpCode);

    res.json({ message: 'OTP sent successfully to your email.' });
  } catch (err) {
    console.error('[sendOtp]', err.message);
    res.status(500).json({ message: 'Failed to send OTP. Please try again later.' });
  }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await Otp.findOne({ email });

    if (!record) return res.status(400).json({ message: 'No OTP found for this email.' });
    if (record.expiresAt < Date.now()) return res.status(400).json({ message: 'OTP expired.' });
    if (record.attempts >= 3) return res.status(400).json({ message: 'Too many attempts. Request a new OTP.' });

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // Success - delete OTP
    await Otp.deleteOne({ email });
    res.json({ message: 'OTP verified successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, locality, village } = req.body;

    if (role === 'Collector') {
      return res.status(403).json({ message: 'Collector accounts are issued by the administrator.' });
    }

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(409).json({ message: 'Email or phone already registered.' });
    }

    if (role === 'Citizen' && !village) {
      return res.status(400).json({ message: 'Village is required for Citizen registration.' });
    }

    const userData = { name, email, password, phone, role, isVerified: true };
    if (locality) userData.locality = locality;
    if (village)  userData.village  = village;

    const user  = await User.create(userData);
    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/auth/login-otp
const loginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const record = await Otp.findOne({ email });
    if (!record || record.otp !== otp || record.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    await Otp.deleteOne({ email });
    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { identifier, collectorId, password, role } = req.body;

    if (role === 'Collector') {
      if (!collectorId) return res.status(400).json({ message: 'Collector ID is required.' });
      const collector = await Collector.findOne({ collectorId }).select('+password');
      if (!collector) return res.status(401).json({ message: 'Collector not found.' });
      const match = await bcrypt.compare(password, collector.password);
      if (!match) return res.status(401).json({ message: 'Invalid Collector ID or Password.' });
      if (collector.status === 'Inactive') return res.status(403).json({ message: 'Your account is inactive. Contact admin.' });
      const token = signToken(collector._id);
      const safeCollector = { _id: collector._id, name: collector.name, collectorId: collector.collectorId, role: 'Collector', city: collector.city, area: collector.area };
      return res.json({ token, user: safeCollector });
    }

    if (!identifier) return res.status(400).json({ message: 'Email or phone is required.' });
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
      role,
    }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }



    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { register, login, sendOtp, verifyOtp, loginOtp };
