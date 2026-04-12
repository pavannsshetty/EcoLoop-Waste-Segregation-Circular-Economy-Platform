const jwt       = require('jsonwebtoken');
const Collector = require('../models/Collector');
const WasteReport = require('../models/WasteReport');

const ADMIN_USERNAME = 'pavansshetty';
const ADMIN_PASSWORD = 'Pk@7022302564';
const ADMIN_SECRET   = process.env.JWT_SECRET + '_admin';

const adminLogin = (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid admin credentials.' });
  }
  const token = jwt.sign({ role: 'admin', username }, ADMIN_SECRET, { expiresIn: '8h' });
  res.json({ token, username });
};

const generateCollectorId = async () => {
  const last = await Collector.findOne().sort({ createdAt: -1 }).select('collectorId');
  if (!last) return 'COL-1001';
  const num = parseInt(last.collectorId.replace('COL-', ''), 10);
  return `COL-${num + 1}`;
};

const addCollector = async (req, res) => {
  try {
    const { name, teamLeader, mobile, email, city, area, ward, collectorId, password, status, teamSize } = req.body;
    if (!name || !mobile || !city || !area || !ward || !password) {
      return res.status(400).json({ message: 'Required fields missing.' });
    }
    const existing = await Collector.findOne({ collectorId });
    if (existing) return res.status(409).json({ message: 'Collector ID already exists.' });

    const collector = await Collector.create({ collectorId, name, teamLeader: teamLeader || '', mobile, email: email || '', city, area, ward, password, status: status || 'Active', teamSize: teamSize || 1 });
    res.status(201).json({ message: 'Collector added successfully.', collector });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getNextCollectorId = async (req, res) => {
  try {
    const id = await generateCollectorId();
    res.json({ collectorId: id });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [totalCollectors, activeCollectors, totalReports, collectors] = await Promise.all([
      Collector.countDocuments(),
      Collector.countDocuments({ status: 'Active' }),
      WasteReport.countDocuments(),
      Collector.find().sort({ createdAt: -1 }).select('-password'),
    ]);
    res.json({ totalCollectors, activeCollectors, totalReports, collectors });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { adminLogin, addCollector, getNextCollectorId, getDashboardStats };
