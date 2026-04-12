const jwt       = require('jsonwebtoken');
const User      = require('../models/User');
const Collector = require('../models/Collector');
const bcrypt    = require('bcryptjs');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, phone, address, role, collectorId, locality } = req.body;

    if (role === 'Collector') {
      return res.status(403).json({ message: 'Collector accounts are issued by the administrator.' });
    }

    const orConditions = [{ email }];
    if (phone) orConditions.push({ phone });
    const existing = await User.findOne({ $or: orConditions });
    if (existing) {
      const field = existing.email === email ? 'Email' : 'Phone number';
      return res.status(409).json({ message: `${field} already registered. Please login.` });
    }

    const userData = { name, email, password, phone, role };
    if (address)  userData.address  = address;
    if (locality) userData.locality = locality;

    const user = await User.create(userData);
    const token = signToken(user._id);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('[register]', err.message);
    res.status(400).json({ message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { identifier, collectorId, password, role } = req.body;

    let user;

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
    user = await User.findOne({
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

module.exports = { register, login };
