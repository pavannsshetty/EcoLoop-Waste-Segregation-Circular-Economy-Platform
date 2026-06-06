const jwt       = require('jsonwebtoken');
const Collector = require('../models/Collector');
const WasteReport = require('../models/WasteReport');
const ScrapRequest = require('../models/ScrapRequest');
const User      = require('../models/User');
const GreenChampionRequest = require('../models/GreenChampionRequest');
const GCTask = require('../models/GCTask');
const ApprovalRequest = require('../models/ApprovalRequest');
const RecycleItem = require('../models/RecycleItem');
const Notification = require('../models/Notification');
const bcrypt      = require('bcryptjs');
const upload     = require('../middleware/uploadMiddleware');
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
      vehicleType, vehicleNumber, workingShift, forceReassign, photo,
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
      ...(photo ? { photo } : {})
    });
    const { emitToAll } = require('../socket');
    emitToAll('collector_updated', { action: 'created', collector });
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
    const pendingReports = reportsPopulated.filter(r => r.status === 'Submitted' || r.status === 'Assigned').length;
    const inProgressReports = reportsPopulated.filter(r => r.status === 'In Progress').length;
    const completedReports = reportsPopulated.filter(r => r.status === 'Resolved' || r.status === 'Completed').length;
    const publicReports = reportsPopulated.filter(r => r.reportType === 'Public' || !r.reportType).length;
    const homePickupReports = reportsPopulated.filter(r => r.reportType === 'Home Pickup').length;
    const highSeverityReports = reportsPopulated.filter(r => r.severity === 'High' && r.status !== 'Resolved').length;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayCompletedPickups = reportsPopulated.filter(r => r.reportType === 'Home Pickup' && r.status === 'Resolved' && new Date(r.completedAt || r.updatedAt) >= todayStart).length;
    const [
      totalGreenChampions,
      totalCitizens,
      pendingGcRequests,
      pendingApprovalRequests,
      scrapRequests,
      ecoShopOrdersAgg,
      recentNotifications,
    ] = await Promise.all([
      User.countDocuments({ role: 'green_champion' }),
      User.countDocuments({ role: 'citizen' }),
      GreenChampionRequest.countDocuments({ status: 'PENDING' }),
      ApprovalRequest.countDocuments({ status: 'Pending' }),
      ScrapRequest.find().sort({ createdAt: -1 }).limit(8).lean(),
      RecycleItem.aggregate([{ $group: { _id: null, total: { $sum: '$requests' } } }]),
      Notification.find().sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    const villagesCovered = [...new Set([
      ...collectorsData.flatMap(c => c.villages || []),
      ...reportsPopulated.map(r => r.village).filter(Boolean),
    ])].length;

    const recentCollectors = collectorsData.slice(0, 6).map(c => ({
      type: 'collector',
      title: c.name,
      subtitle: `${c.collectorId} added as ${c.collectorType || 'Collector'}`,
      createdAt: c.createdAt,
    }));
    const recentReports = reportsPopulated.slice(0, 6).map(r => ({
      type: 'report',
      title: r.reportId || 'ECO-PENDING',
      subtitle: `${r.wasteType} - ${r.status}`,
      createdAt: r.createdAt,
    }));
    const recentRequests = [
      ...(await GreenChampionRequest.find().sort({ createdAt: -1 }).limit(4).lean()).map(r => ({
        type: 'request',
        title: r.requestId || 'Champion Request',
        subtitle: `${r.fullName || 'Applicant'} - ${r.status}`,
        createdAt: r.createdAt,
      })),
      ...(await ApprovalRequest.find().sort({ createdAt: -1 }).limit(4).lean()).map(r => ({
        type: 'approval',
        title: r.type || 'Approval Request',
        subtitle: `${r.status} profile update`,
        createdAt: r.createdAt,
      })),
    ];

    const recentActivity = [...recentReports, ...recentCollectors, ...recentRequests]
      .filter(a => a.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 12);

    const topCollectors = collectors
      .map(c => ({
        _id: c._id,
        collectorId: c.collectorId,
        name: c.name,
        status: c.status,
        availability: c.availability,
        completedTasks: c.completedTasks || 0,
        performanceScore: c.performanceScore || 0,
        stats: c.stats,
      }))
      .sort((a, b) => (b.stats.completed + b.completedTasks + b.performanceScore) - (a.stats.completed + a.completedTasks + a.performanceScore))
      .slice(0, 5);

    const notificationPreview = [
      ...reportsPopulated.slice(0, 4).map(r => ({
        type: 'report',
        title: 'New report activity',
        description: `${r.reportId || 'Report'}: ${r.wasteType} is ${r.status}`,
        createdAt: r.createdAt,
      })),
      ...recentNotifications.map(n => ({
        type: n.type || 'notification',
        title: n.title,
        description: n.description || n.message,
        createdAt: n.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

    res.json({ 
      totalCollectors, 
      activeCollectors, 
      totalReports,
      publicReports,
      homePickupReports,
      highSeverityReports,
      todayCompletedPickups,
      pendingReports,
      inProgressReports,
      completedReports,
      totalCitizens,
      villagesCovered,
      ecoShopOrders: ecoShopOrdersAgg[0]?.total || 0,
      pendingRequests: pendingGcRequests + pendingApprovalRequests,
      scrapRequests: scrapRequests.length,
      totalGreenChampions,
      collectors, 
      recentReports: reportsPopulated.slice(0, 10),
      recentActivity,
      topCollectors,
      notificationPreview,
      reportStatusChart: {
        pending: pendingReports,
        inProgress: inProgressReports,
        completed: completedReports,
      },
      allReports: reportsPopulated 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const uploadCollectorPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    res.json({ photoUrl: req.file.path });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getCollector = async (req, res) => {
  try {
    const collector = await Collector.findById(req.params.id).select('-password').lean();
    if (!collector) return res.status(404).json({ message: 'Collector not found.' });
    res.json(collector);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const updateCollector = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, teamLeader, mobile, email, city, area, ward, villages, status, password,
      collectorType, teamSize, vehicleType, vehicleNumber, workingShift, forceReassign, photo
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
      name, teamLeader: teamLeader || '', mobile, email: email || '',
      city: city || '', area: area || '', ward: ward || '',
      villages: canonicalVillages, village: canonicalVillages[0], status,
      collectorType, teamSize: collectorType === 'Team' ? (teamSize || 1) : 1,
      vehicleType, vehicleNumber: vehicleNumber || '', workingShift,
      ...(photo ? { photo } : {})
    };

    if (password && password.trim() !== '') {
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6}$/.test(password)) {
        return res.status(400).json({ message: 'Password must be exactly 6 characters containing at least 1 uppercase, 1 lowercase, and 1 number.' });
      }
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updated = await Collector.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: 'Collector not found.' });

    const { emitToAll } = require('../socket');
    emitToAll('collector_updated', { action: 'updated', collector: updated });
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
    await WasteReport.updateMany(
      { assignedCollector: id, status: { $in: ['Assigned', 'In Progress'] } },
      { $set: { assignedCollector: null, status: 'Submitted', isLocked: false, lockedAt: null } }
    );
    await ScrapRequest.updateMany(
      { assignedCollector: id, status: { $in: ['Assigned', 'In Progress'] } },
      { $set: { assignedCollector: null, status: 'Requested' } }
    );
    const { emitToAll } = require('../socket');
    emitToAll('collector_updated', { action: 'deleted', collectorId: id });
    emitToAll('reports_updated', { reason: 'collector_deleted', collectorId: id });
    res.json({ message: 'Collector deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getAllReports = async (req, res) => {
  try {
    const { search, type } = req.query;
    let query = {};
    if (type && ['Public', 'Home Pickup'].includes(type)) {
      query.reportType = type;
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query = {
        $or: [
          { reportId: { $regex: escaped, $options: 'i' } },
          { wasteType: { $regex: escaped, $options: 'i' } },
          { status: { $regex: escaped, $options: 'i' } },
          { village: { $regex: escaped, $options: 'i' } },
          { 'location.address': { $regex: escaped, $options: 'i' } },
        ]
      };
    }
    const reports = await WasteReport.find(query)
      .populate('userId', 'name phone email')
      .populate('assignedCollector', 'name phone email role collectorId')
      .populate('verifiedBy', 'name')
      .populate('supportedBy.userId', 'name phone email')
      .populate('duplicateOf', 'reportId status wasteType')
      .sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const reverifyReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await WasteReport.findById(id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.status !== 'Verified') {
      return res.status(400).json({ message: 'Only verified reports can be sent for re-verification.' });
    }
    report.status = 'Under Re-Verification';
    await report.save();
    const populated = await WasteReport.findById(report._id)
      .populate('userId', 'name phone email')
      .populate('assignedCollector', 'name phone email role collectorId')
      .populate('verifiedBy', 'name')
      .populate('supportedBy.userId', 'name phone email')
      .populate('duplicateOf', 'reportId status wasteType')
      .lean();
    try {
      const { emitToAll } = require('../socket');
      emitToAll('report_updated', populated);
    } catch (e) { }
    res.json({ message: 'Report marked for re-verification.', report: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getAssignedVillages = async (req, res) => {
  try {
    const collectors = await Collector.find({ status: 'Active' }).select('name collectorId villages');
    const assignedEntries = [];
    collectors.forEach((c) => {
      (c.villages || []).forEach((v) => {
        assignedEntries.push({ village: v, collectorName: c.name, collectorId: c.collectorId });
      });
    });
    const villageSet = [...new Set(assignedEntries.map(e => e.village))];
    const assignedVillages = villageSet.map(v => assignedEntries.find(e => e.village === v));
    res.json({ assignedVillages });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const checkDuplicates = async (req, res) => {
  try {
    const { field, value, excludeId } = req.body;
    if (!field || !value) return res.status(400).json({ message: 'Field and value required.' });

    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let query = {};
    if (field === 'mobile') query = { mobile: value };
    else if (field === 'email') query = { email: { $regex: new RegExp(`^${escaped}$`, 'i') } };
    else if (field === 'vehicleNumber') query = { vehicleNumber: { $regex: new RegExp(`^${escaped}$`, 'i') } };
    else if (field === 'name') query = { name: { $regex: new RegExp(`^${escaped}$`, 'i') } };
    else return res.status(400).json({ message: 'Invalid field.' });

    if (excludeId) query._id = { $ne: excludeId };

    const existing = await Collector.findOne(query).select('name collectorId');
    if (existing) {
      return res.json({ duplicate: true, message: `${field === 'mobile' ? 'Mobile number' : field === 'email' ? 'Email' : field === 'vehicleNumber' ? 'Vehicle number' : 'Name'} already registered with ${existing.name} (${existing.collectorId}).` });
    }

    // Also check Users for mobile/email
    if (field === 'mobile') {
      const user = await User.findOne({ phone: value });
      if (user) return res.json({ duplicate: true, message: `Mobile number already associated with a ${user.role} account.` });
    }
    if (field === 'email') {
      const user = await User.findOne({ email: { $regex: new RegExp(`^${escaped}$`, 'i') } });
      if (user) return res.json({ duplicate: true, message: `Email already associated with a ${user.role} account.` });
    }

    res.json({ duplicate: false });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getGreenChampions = async (req, res) => {
  try {
    const { search } = req.query;
    let query = { role: 'green_champion' };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { village: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { greenChampionId: { $regex: escaped, $options: 'i' } },
        { assignedAreas: { $regex: escaped, $options: 'i' } },
      ];
    }
    const champions = await User.find(query).sort({ createdAt: -1 });
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
      if (request.type === 'account_deletion') {
        request.citizen.accountStatus = 'Inactive';
        request.citizen.isActive = false;
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

const getCitizens = async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = { role: 'citizen' };
    if (status && status !== 'All') query.accountStatus = status;
    if (search) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: esc, $options: 'i' } },
        { email: { $regex: esc, $options: 'i' } },
        { phone: { $regex: esc, $options: 'i' } },
        { village: { $regex: esc, $options: 'i' } },
      ];
    }
    const citizens = await User.find(query).sort({ createdAt: -1 }).lean();
    res.json({ citizens });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getCitizenDetails = async (req, res) => {
  try {
    const citizen = await User.findById(req.params.id).lean();
    if (!citizen || citizen.role !== 'citizen') {
      return res.status(404).json({ message: 'Citizen not found.' });
    }
    const reportCount = await WasteReport.countDocuments({ userId: req.params.id });
    const scrapCount = await ScrapRequest.countDocuments({ userId: req.params.id });
    const notifications = await Notification.find({ userId: req.params.id })
      .sort({ createdAt: -1 }).limit(10).lean();
    res.json({ citizen, stats: { reportCount, scrapCount }, notifications });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const sendCitizenNotification = async (req, res) => {
  try {
    const { title, message, type } = req.body;
    const citizen = await User.findById(req.params.id);
    if (!citizen || citizen.role !== 'citizen') {
      return res.status(404).json({ message: 'Citizen not found.' });
    }
    const notification = await Notification.create({
      userId: citizen._id,
      title,
      description: message,
      message,
      type: type || 'System',
      targetAudience: 'User',
      senderId: req.admin?.username || 'Admin',
    });
    const { emitToUser } = require('../socket');
    emitToUser(citizen._id.toString(), 'notification', {
      ...notification.toObject(),
      unreadCount: await Notification.countDocuments({
        $or: [
          { userId: citizen._id, isRead: false },
          { targetAudience: { $ne: 'User' }, readBy: { $ne: citizen._id } },
        ],
      }),
    });
    res.status(201).json({ message: 'Notification sent.', notification });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const suspendCitizen = async (req, res) => {
  try {
    const { reason, duration, customDays } = req.body;
    const citizen = await User.findById(req.params.id);
    if (!citizen || citizen.role !== 'citizen') {
      return res.status(404).json({ message: 'Citizen not found.' });
    }
    if (citizen.accountStatus === 'Deleted') {
      return res.status(400).json({ message: 'Cannot suspend a deleted account.' });
    }

    let untilDate = null;
    const now = new Date();
    if (duration === 'Permanent') {
      untilDate = new Date('2099-12-31');
    } else if (duration === 'Custom' && customDays) {
      untilDate = new Date(now.getTime() + parseInt(customDays) * 86400000);
    } else {
      const days = parseInt(duration) || 1;
      untilDate = new Date(now.getTime() + days * 86400000);
    }

    citizen.accountStatus = 'Suspended';
    citizen.suspensionReason = reason;
    citizen.suspensionDuration = duration === 'Custom' ? `${customDays} days` : duration;
    citizen.suspendedUntil = untilDate;
    citizen.suspensionDate = now;
    citizen.suspendedBy = req.admin?.username || 'Admin';
    await citizen.save();

    const notification = await Notification.create({
      userId: citizen._id,
      title: 'Account Suspended',
      description: `Your account has been suspended. Reason: ${reason}. Suspended until: ${untilDate.toLocaleDateString()}. Contact support for assistance.`,
      message: `Your account has been suspended. Reason: ${reason}. Suspended until: ${untilDate.toLocaleDateString()}. Contact support for assistance.`,
      type: 'System',
      targetAudience: 'User',
    });

    const { emitToUser } = require('../socket');
    emitToUser(citizen._id.toString(), 'account_suspended', {
      suspensionReason: reason,
      suspendedUntil: untilDate,
      suspensionDuration: duration,
    });
    emitToUser(citizen._id.toString(), 'notification', {
      ...notification.toObject(),
      unreadCount: await Notification.countDocuments({
        $or: [
          { userId: citizen._id, isRead: false },
          { targetAudience: { $ne: 'User' }, readBy: { $ne: citizen._id } },
        ],
      }),
    });

    res.json({ message: 'Citizen suspended.', citizen: citizen.toJSON() });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const unsuspendCitizen = async (req, res) => {
  try {
    const citizen = await User.findById(req.params.id);
    if (!citizen || citizen.role !== 'citizen') {
      return res.status(404).json({ message: 'Citizen not found.' });
    }
    citizen.accountStatus = 'Active';
    citizen.suspensionReason = '';
    citizen.suspensionDuration = '';
    citizen.suspendedUntil = null;
    citizen.suspensionDate = null;
    citizen.suspendedBy = '';
    await citizen.save();

    const notification = await Notification.create({
      userId: citizen._id,
      title: 'Account Reinstated',
      description: 'Your account has been reinstated. You can now log in and use the platform normally.',
      message: 'Your account has been reinstated. You can now log in and use the platform normally.',
      type: 'System',
      targetAudience: 'User',
    });

    const { emitToUser } = require('../socket');
    emitToUser(citizen._id.toString(), 'account_reinstated', {});
    emitToUser(citizen._id.toString(), 'notification', {
      ...notification.toObject(),
      unreadCount: await Notification.countDocuments({
        $or: [
          { userId: citizen._id, isRead: false },
          { targetAudience: { $ne: 'User' }, readBy: { $ne: citizen._id } },
        ],
      }),
    });

    res.json({ message: 'Citizen unsuspended.', citizen: citizen.toJSON() });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const deleteCitizen = async (req, res) => {
  try {
    const { reason } = req.body;
    const citizen = await User.findById(req.params.id);
    if (!citizen || citizen.role !== 'citizen') {
      return res.status(404).json({ message: 'Citizen not found.' });
    }
    citizen.accountStatus = 'Deleted';
    citizen.deletionReason = reason || '';
    citizen.deletedAt = new Date();
    citizen.deletedBy = req.admin?.username || 'Admin';
    citizen.isActive = false;
    await citizen.save();

    const { emitToUser } = require('../socket');
    emitToUser(citizen._id.toString(), 'account_deleted', {
      deletionReason: reason,
    });

    res.json({ message: 'Citizen deleted.', citizen: citizen.toJSON() });
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
  reverifyReport,
  getAssignedVillages,
  getGreenChampions,
  updateGreenChampion,
  deleteGreenChampion,
  assignGCTask,
  getApprovalRequests,
  updateApprovalRequest,
  checkDuplicates,
  uploadCollectorPhoto,
  getCollector,
  getCitizens,
  getCitizenDetails,
  sendCitizenNotification,
  suspendCitizen,
  unsuspendCitizen,
  deleteCitizen,
};
