const jwt       = require('jsonwebtoken');
const Collector = require('../models/Collector');
const WasteReport = require('../models/WasteReport');
const User      = require('../models/User');
const GreenChampionRequest = require('../models/GreenChampionRequest');
const GCTask = require('../models/GCTask');
const ApprovalRequest = require('../models/ApprovalRequest');
const bcrypt      = require('bcryptjs');
const { getCanonicalVillageName } = require('../data/kundapuraVillages');

const canonicalizeVillageList = (values = []) =>
  values.map(v => getCanonicalVillageName(v)).filter(Boolean);

const ADMIN_USERNAME = 'pavansshetty';
const ADMIN_PASSWORD = 'Pk@7022302564';
const ADMIN_SECRET   = process.env.JWT_SECRET + '_admin';

const adminLogin = (req, res) => {
  const { username, password } = req.body;
  const cleanUser = username?.trim();
  const cleanPass = password?.trim();

  if (cleanUser !== ADMIN_USERNAME || cleanPass !== ADMIN_PASSWORD) {
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

    if (!name || !teamLeader || !mobile || !password || !collectorType || !vehicleType || !vehicleNumber || !workingShift || workingShift.length === 0) {
      return res.status(400).json({ message: 'Required fields missing.' });
    }
    if (!villages || !Array.isArray(villages) || villages.length === 0) {
      return res.status(400).json({ message: 'At least one village is required.' });
    }
    if (villages.length > 5) {
      return res.status(400).json({ message: 'You can assign up to 5 villages only.' });
    }
    const canonicalVillages = canonicalizeVillageList(villages);
    if (canonicalVillages.length !== villages.length) {
      return res.status(400).json({ message: 'Select valid Kundapura Taluk villages only.' });
    }
    if (new Set(canonicalVillages).size !== canonicalVillages.length) {
      return res.status(400).json({ message: 'Duplicate village values are not allowed.' });
    }
    if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ message: 'Mobile must be 10 digits.' });

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6}$/.test(password)) {
      return res.status(400).json({ message: 'Password must be exactly 6 characters containing at least 1 uppercase, 1 lowercase, and 1 number.' });
    }

    const searchEmail = email?.toLowerCase().trim();
    const searchMobile = mobile?.trim();

    // 1. Cross-collection uniqueness check
    // Check against Users
    const existingUser = await User.findOne({ 
      $or: [
        searchEmail ? { email: searchEmail } : { _id: null }, 
        { phone: searchMobile }
      ].filter(f => f && Object.values(f)[0] !== null)
    });
    if (existingUser) {
      const msg = existingUser.role === 'green_champion'
        ? 'This mobile number/email is already associated with a Green Champion account.'
        : 'This mobile number/email is already associated with a Citizen account.';
      return res.status(409).json({ message: msg });
    }

    // Check against Green Champion Requests
    const existingReq = await GreenChampionRequest.findOne({
      $or: [
        searchEmail ? { email: searchEmail } : { _id: null },
        { mobile: searchMobile }
      ].filter(f => f && Object.values(f)[0] !== null),
      status: { $in: ['PENDING', 'APPROVED'] }
    });
    if (existingReq) {
      return res.status(409).json({ message: 'A Green Champion request already exists with this mobile number/email.' });
    }

    // Check against Collectors
    const existingColl = await Collector.findOne({
      $or: [
        searchEmail ? { email: { $regex: new RegExp(`^${searchEmail}$`, 'i') } } : { _id: null },
        { mobile: searchMobile }
      ].filter(f => f && Object.values(f)[0] !== null)
    });
    if (existingColl) {
      return res.status(409).json({ message: 'A Collector account already exists with this mobile number/email.' });
    }

    const dupName = await Collector.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (dupName) return res.status(409).json({ message: 'Collector/Team Name already exists.' });

    const dupLeader = await Collector.findOne({ teamLeader: { $regex: new RegExp(`^${teamLeader}$`, 'i') } });
    if (dupLeader) return res.status(409).json({ message: 'Team Leader Name already associated.' });

    const dupVehicle = await Collector.findOne({ vehicleNumber: { $regex: new RegExp(`^${vehicleNumber}$`, 'i') } });
    if (dupVehicle) return res.status(409).json({ message: 'Vehicle Number already registered.' });

    const existing = await Collector.findOne({ collectorId });
    if (existing) return res.status(409).json({ message: 'Collector ID already exists.' });

    // Check each village for conflicts with active collectors
    const conflicts = [];
    for (const v of canonicalVillages) {
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
          { $pull: { villages: { $in: canonicalVillages } } }
        );
      }
    }

    const collector = await Collector.create({
      collectorId, name, teamLeader: teamLeader || '', mobile,
      email: email || '', city: city || '', area: area || '',
      village: canonicalVillages[0], villages: canonicalVillages, ward: ward || '',
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
    const collectorsData = await Collector.find().sort({ createdAt: -1 }).lean().select('-password');
    const reportsPopulated = await WasteReport.find()
      .populate('userId', 'name phone')
      .populate('assignedCollector', 'name collectorId')
      .sort({ createdAt: -1 })
      .lean();

    const collectors = collectorsData.map(c => {
      const assigned = reportsPopulated.filter(r => r.assignedCollector?._id?.toString() === c._id.toString());
      return {
        ...c,
        stats: {
          totalAssigned: assigned.length,
          completed: assigned.filter(r => r.status === 'Resolved' || r.status === 'Completed').length,
          active: assigned.filter(r => r.status === 'Assigned' || r.status === 'In Progress').length,
        }
      };
    });

    const totalCollectors = collectors.length;
    const activeCollectors = collectors.filter(c => c.status === 'Active').length;
    const totalReports = reportsPopulated.length;
    const totalGreenChampions = await User.countDocuments({ role: 'green_champion' });

    res.json({ 
      totalCollectors, 
      activeCollectors, 
      totalReports,
      totalGreenChampions,
      collectors, 
      recentReports: reportsPopulated.slice(0, 10),
      allReports: reportsPopulated 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const updateCollector = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, teamLeader, mobile, email, villages, status, password,
      collectorType, teamSize, vehicleType, vehicleNumber, workingShift, forceReassign
    } = req.body;

    if (!name || !teamLeader || !mobile || !collectorType || !vehicleType || !vehicleNumber || !workingShift || workingShift.length === 0) {
      return res.status(400).json({ message: 'Required fields missing.' });
    }
    if (!villages || !Array.isArray(villages) || villages.length === 0) {
      return res.status(400).json({ message: 'At least one village is required.' });
    }
    if (villages.length > 5) {
      return res.status(400).json({ message: 'You can assign up to 5 villages only.' });
    }
    const canonicalVillages = canonicalizeVillageList(villages);
    if (canonicalVillages.length !== villages.length) {
      return res.status(400).json({ message: 'Select valid Kundapura Taluk villages only.' });
    }
    if (new Set(canonicalVillages).size !== canonicalVillages.length) {
      return res.status(400).json({ message: 'Duplicate village values are not allowed.' });
    }

    const dupMobile = await Collector.findOne({ mobile, _id: { $ne: id } });
    if (dupMobile) return res.status(409).json({ message: 'Mobile number already registered by another collector.' });

    const dupName = await Collector.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: id } });
    if (dupName) return res.status(409).json({ message: 'Collector/Team Name already exists.' });

    const dupLeader = await Collector.findOne({ teamLeader: { $regex: new RegExp(`^${teamLeader}$`, 'i') }, _id: { $ne: id } });
    if (dupLeader) return res.status(409).json({ message: 'Team Leader Name already associated.' });

    const dupVehicle = await Collector.findOne({ vehicleNumber: { $regex: new RegExp(`^${vehicleNumber}$`, 'i') }, _id: { $ne: id } });
    if (dupVehicle) return res.status(409).json({ message: 'Vehicle Number already registered.' });

    if (email) {
      const dupEmail = await Collector.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') }, _id: { $ne: id } });
      if (dupEmail) return res.status(409).json({ message: 'Email already in use.' });
    }

    const conflicts = [];
    for (const v of canonicalVillages) {
      const taken = await Collector.findOne({ villages: v, status: 'Active', _id: { $ne: id } });
      if (taken) conflicts.push({ village: v, name: taken.name, collectorId: taken.collectorId });
    }

    if (conflicts.length > 0 && !forceReassign) {
      return res.status(409).json({
        message: `Some villages are already assigned.`,
        conflict: true,
        conflicts,
      });
    }

    if (forceReassign && conflicts.length > 0) {
      for (const c of conflicts) {
        await Collector.findOneAndUpdate(
          { collectorId: c.collectorId },
          { $pull: { villages: { $in: canonicalVillages } } }
        );
      }
    }

    const updateData = {
      name, teamLeader: teamLeader || '', mobile, email: email || '', villages: canonicalVillages, village: canonicalVillages[0], status,
      collectorType, teamSize: collectorType === 'Team' ? (teamSize || 1) : 1,
      vehicleType, vehicleNumber: vehicleNumber || '', workingShift
    };

    if (password && password.trim() !== '') {
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6}$/.test(password)) {
        return res.status(400).json({ message: 'Password must be exactly 6 characters containing at least 1 uppercase, 1 lowercase, and 1 number.' });
      }
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updated = await Collector.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: 'Collector not found.' });

    res.json({ message: 'Collector updated successfully.', collector: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const deleteCollector = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Collector.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Collector not found.' });
    res.json({ message: 'Collector deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getAllReports = async (req, res) => {
  try {
    const reports = await WasteReport.find()
      .populate('userId', 'name phone email')
      .populate('assignedCollector', 'name phone email role collectorId')
      .sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getAssignedVillages = async (req, res) => {
  try {
    const activeCollectors = await Collector.find({ status: 'Active' }).select('villages');
    const assignedVillages = [...new Set(activeCollectors.flatMap(c => c.villages || []))];
    res.json({ assignedVillages });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getGreenChampions = async (req, res) => {
  try {
    const champions = await User.find({ role: 'green_champion' }).sort({ createdAt: -1 });
    res.json({ champions });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};


const updateGreenChampion = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, assignedArea, village, accountStatus } = req.body;

    const user = await User.findById(id);
    if (!user || user.role !== 'green_champion') {
      return res.status(404).json({ message: 'Green Champion not found.' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (assignedArea) user.assignedAreas = [assignedArea];
    if (village) {
      const canonicalVillage = getCanonicalVillageName(village);
      if (!canonicalVillage) return res.status(400).json({ message: 'Select a valid Kundapura Taluk village.' });
      user.village = canonicalVillage;
    }
    if (accountStatus) user.accountStatus = accountStatus;

    if (password && password.trim() !== '') {
      user.password = password; // pre('save') hashes it
    }

    await user.save();
    res.json({ message: 'Green Champion updated successfully.', champion: user });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const deleteGreenChampion = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findOneAndDelete({ _id: id, role: 'green_champion' });
    if (!deleted) return res.status(404).json({ message: 'Green Champion not found.' });
    res.json({ message: 'Green Champion deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const assignGCTask = async (req, res) => {
  try {
    const { assignedTo, championId, title, description, deadline, points } = req.body;
    const targetId = assignedTo || championId;
    if (!targetId || !title || !description) {
      return res.status(400).json({ message: 'Required fields missing.' });
    }
    const task = await GCTask.create({
      assignedTo: targetId,
      title,
      description,
      deadline,
      points,
      assignedBy: 'Admin'
    });
    res.status(201).json({ message: 'Task assigned successfully.', task });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getApprovalRequests = async (req, res) => {
  try {
    const requests = await ApprovalRequest.find()
      .populate('citizen', 'name phone email village')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const updateApprovalRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNote } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid request action.' });
    }

    const request = await ApprovalRequest.findById(id).populate('citizen');
    if (!request) return res.status(404).json({ message: 'Approval request not found.' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'This request has already been reviewed.' });
    }

    if (action === 'approve') {
      if (request.type === 'village_change') {
        const canonicalVillage = getCanonicalVillageName(request.requestedVillage);
        if (!canonicalVillage) return res.status(400).json({ message: 'Select a valid Kundapura Taluk village.' });
        request.citizen.village = canonicalVillage;
        request.requestedVillage = canonicalVillage;
      }
      if (request.type === 'email_change') {
        const duplicateEmail = await User.findOne({
          email: request.requestedEmail,
          _id: { $ne: request.citizen._id },
        });
        if (duplicateEmail) return res.status(409).json({ message: 'Email already in use.' });
        const duplicateCollectorEmail = await Collector.findOne({ email: request.requestedEmail });
        if (duplicateCollectorEmail) return res.status(409).json({ message: 'Email already in use.' });
        request.citizen.email = request.requestedEmail;
        request.citizen.lastEmailUpdatedAt = new Date();
      }
      await request.citizen.save();
      request.status = 'Approved';
    } else {
      request.status = 'Rejected';
    }

    request.reviewedAt = new Date();
    request.reviewedBy = req.admin?.username || 'Admin';
    request.adminNote = adminNote?.trim() || '';
    await request.save();

    const updated = await ApprovalRequest.findById(request._id)
      .populate('citizen', 'name phone email village')
      .lean();

    try {
      const { emitToAll, emitToUser } = require('../socket');
      emitToAll('approval_request_updated', updated);
      emitToUser(updated.citizen._id.toString(), 'profile_updated', {
        status: updated.status,
        type: updated.type,
      });
    } catch {}

    res.json({ message: `Request ${request.status.toLowerCase()}.`, request: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

module.exports = {
  adminLogin,
  addCollector,
  getNextCollectorId,
  getDashboardStats,
  updateCollector,
  deleteCollector,
  getAllReports,
  getAssignedVillages,
  getGreenChampions,
  updateGreenChampion,
  deleteGreenChampion,
  assignGCTask,
  getApprovalRequests,
  updateApprovalRequest
};
