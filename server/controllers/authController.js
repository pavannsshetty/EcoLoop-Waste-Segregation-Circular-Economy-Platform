const jwt       = require('jsonwebtoken');
const User      = require('../models/User');
const Collector = require('../models/Collector');
const bcrypt    = require('bcryptjs');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });


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

    const searchIdentifier = identifier.toLowerCase().trim();
    console.log(`[Login] Attempting login — identifier: "${searchIdentifier}", role: "${role}"`);

    const user = await User.findOne({
      $or: [{ email: searchIdentifier }, { phone: searchIdentifier }],
    }).select('+password');

    if (!user) {
      console.log(`[Login] FAIL — User NOT FOUND for: "${searchIdentifier}"`);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    console.log(`[Login] User found — DB role: "${user.role}", requested role: "${role}"`);

    if (user.role !== role) {
      console.log(`[Login] FAIL — Role MISMATCH. Expected: "${role}", Found: "${user.role}"`);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.matchPassword(password);
    console.log(`[Login] Password match: ${isMatch}`);
    if (!isMatch) {
      console.log(`[Login] FAIL — Password MISMATCH for: "${searchIdentifier}"`);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { register, login };
