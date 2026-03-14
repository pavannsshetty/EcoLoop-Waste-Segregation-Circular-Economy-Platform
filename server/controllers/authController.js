const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, phone, address, role, collectorId, locality } = req.body;

    // Collectors are admin-created only
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
    const { email, collectorId, password, role } = req.body;

    let user;

    if (role === 'Collector') {
      if (!collectorId) return res.status(400).json({ message: 'Collector ID is required.' });
      user = await User.findOne({ collectorId, role: 'Collector' }).select('+password');
    } else {
      if (!email) return res.status(400).json({ message: 'Email is required.' });
      user = await User.findOne({ email, role }).select('+password');
    }

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    console.error('[login]', err.message);
    res.status(400).json({ message: err.message });
  }
};

module.exports = { register, login };
