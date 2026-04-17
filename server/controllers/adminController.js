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
    const {
      name, teamLeader, mobile, email, city, area, villages, ward,
      collectorId, password, status, collectorType, teamSize,
      vehicleType, vehicleNumber, workingShift, forceReassign,
    } = req.body;

    if (!name || !mobile || !password || !collectorType || !vehicleType || !workingShift) {
      return res.status(400).json({ message: 'Required fields missing.' });
    }
    if (!villages || !Array.isArray(villages) || villages.length === 0) {
      return res.status(400).json({ message: 'At least one village is required.' });
    }
    if (villages.length > 5) {
      return res.status(400).json({ message: 'You can assign up to 5 villages only.' });
    }
    if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ message: 'Mobile must be 10 digits.' });

    const dupMobile = await Collector.findOne({ mobile });
    if (dupMobile) return res.status(409).json({ message: 'Mobile number already registered.' });

    const existing = await Collector.findOne({ collectorId });
    if (existing) return res.status(409).json({ message: 'Collector ID already exists.' });

    // Check each village for conflicts with active collectors
    const conflicts = [];
    for (const v of villages) {
      const taken = await Collector.findOne({ villages: v, status: 'Active' });
      if (taken) conflicts.push({ village: v, name: taken.name, collectorId: taken.collectorId });
    }

    if (conflicts.length > 0 && !forceReassign) {
      return res.status(409).json({
        message: `Some villages are already assigned.`,
        conflict: true,
        conflicts,
      });
    }

    // If force reassign — remove conflicting villages from existing collectors
    if (forceReassign && conflicts.length > 0) {
      for (const c of conflicts) {
        await Collector.findOneAndUpdate(
          { collectorId: c.collectorId },
          { $pull: { villages: { $in: villages } } }
        );
      }
    }

    const collector = await Collector.create({
      collectorId, name, teamLeader: teamLeader || '', mobile,
      email: email || '', city: city || '', area: area || '',
      village: villages[0], villages, ward: ward || '',
      password, status: status || 'Active',
      collectorType, teamSize: collectorType === 'Team' ? (teamSize || 1) : 1,
      vehicleType, vehicleNumber: vehicleNumber || '', workingShift,
    });
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
