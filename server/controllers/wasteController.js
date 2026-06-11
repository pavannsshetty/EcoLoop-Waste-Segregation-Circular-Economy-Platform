const WasteReport = require('../models/WasteReport');
const Collector   = require('../models/Collector');
const { createNotification } = require('./notificationController');
const { awardPoints }        = require('./rewardsController');
const { findBestCollector }  = require('../utils/assignment');
const User               = require('../models/User');
const Village            = require('../models/Village');
const { isPointInPolygon } = require('../utils/geoUtils');
const { emitToAll, emitToUser } = require('../socket');
const { detectFakeWaste } = require('../utils/aiWasteDetection');
const { isValidVillage } = require('../data/kundapuraVillages');
const { broadcastLeaderboardUpdate } = require('../utils/rewardSync');

const DAILY_REPORT_LIMIT       = 5;
const HOME_PICKUP_DAILY_LIMIT  = 3;
const MAX_ACTIVE_TASKS    = 10;   

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const r = d => (d * Math.PI) / 180;
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const generateReportId = async () => {
  const year = new Date().getFullYear();
  const count = await WasteReport.countDocuments({
    createdAt: { 
      $gte: new Date(`${year}-01-01T00:00:00.000Z`), 
      $lte: new Date(`${year}-12-31T23:59:59.999Z`) 
    }
  });
  const seq = (count + 1).toString().padStart(4, '0');
  let finalId = `ECO-${year}-${seq}`;
  
  // Collision check
  let exists = await WasteReport.findOne({ reportId: finalId });
  let offset = 1;
  while (exists) {
    const nextSeq = (count + 1 + offset).toString().padStart(4, '0');
    finalId = `ECO-${year}-${nextSeq}`;
    exists = await WasteReport.findOne({ reportId: finalId });
    offset++;
  }
  return finalId;
};

const expectedHours = (severity) => ({ Low: 72, Medium: 48, High: 24 }[severity] || 48);

const notifyNearbyUsers = async (village, report, eventType) => {
  try {
    const nearbyUsers = await User.find({
      village: { $regex: new RegExp(village, 'i') },
      role: { $in: ['collector', 'green_champion', 'admin'] }
    });

    const admins = await User.find({ role: 'admin' });
    const usersToNotify = [...new Set([...nearbyUsers, ...admins])];

    const titleMap = {
      'suspicious_report': 'Suspicious Waste Report Detected',
      'rejected_report': 'Fake Waste Report Rejected',
      'verification_required': 'Verification Required for Report'
    };

    const messageMap = {
      'suspicious_report': `A suspicious report was submitted in ${village}. AI flagged it as ${report.aiStatus}.`,
      'rejected_report': `A report in ${village} was auto-rejected by AI: ${report.rejectionReason}`,
      'verification_required': `A nearby report in ${village} requires manual verification.`
    };

    for (const user of usersToNotify) {
      createNotification(user._id, titleMap[eventType], messageMap[eventType], 'report', report._id);
      emitToUser(user._id.toString(), eventType, { report, village });
    }
  } catch (err) {
    console.error('Error in notifyNearbyUsers:', err);
  }
};

// ─── AI Image Validation ────────────────────────────────────────────────────
const validateWasteImage = async (req, res) => {
  try {
    if (!req.file && !req.body.image) {
      return res.status(400).json({ message: 'No image provided.' });
    }

    const { wasteType } = req.body;
    const imageSource = req.file ? (req.file.path || req.file.buffer) : req.body.image;

    const results = await detectFakeWaste(imageSource, wasteType || 'Mixed Waste');

    return res.json({
      validWaste: results.aiVerified,
      wasteType: results.aiStatus === 'REJECTED' ? '' : (wasteType || 'Mixed Waste'),
      confidence: results.aiConfidenceScore,
      reason: results.rejectionReason,
      ...results
    });
  } catch (err) {
    console.error('[validateWasteImage Error]:', err);
    return res.status(500).json({ message: 'AI validation failed.', error: err.message });
  }
};


const createReport = async (req, res) => {
  try {
    let { wasteType, severity, wasteSeenAt, description, quantity, image, location,
            landmark, landmarkType, photoLocation, accuracy, priorityLevel,
            additionalInstructions, isBulk, village, houseNo, street, wardNumber, reportType } = req.body;
    const userId = req.user.id;

    // Parse JSON strings if they come from FormData
    if (typeof location === 'string') {
      try { location = JSON.parse(location); } catch (e) { location = null; }
    }
    if (typeof photoLocation === 'string') {
      try { photoLocation = JSON.parse(photoLocation); } catch (e) { photoLocation = null; }
    }

    // For Public reports, use the deadline as pickupTime
    let finalPickupTime = null;
    if (reportType !== 'Home Pickup') {
      finalPickupTime = new Date(Date.now() + expectedHours(severity || 'Medium') * 60 * 60 * 1000);
    }

    // Fetch user to get registered village
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!isValidVillage(user.village)) {
      return res.status(403).json({ message: 'Your registered village is outside Kundapura Taluk service areas.' });
    }

    const requiredFields = { 
      wasteType,
      lat: location?.lat, 
      lng: location?.lng, 
      address: location?.address,
    };

    if (reportType === 'Home Pickup') {
      requiredFields.priorityLevel = priorityLevel;
    } else {
      requiredFields.severity = severity || 'Medium';
      requiredFields.wasteSeenAt = wasteSeenAt || 'Just Now';
    }

    // Require manual address input strictly only if coordinates are bypassed
    if (location?.lat === 0 && location?.lng === 0) {
      requiredFields.houseNo = houseNo;
      requiredFields.street = street;
    }

    const missing = Object.entries(requiredFields)
      .filter(([_, v]) => v === undefined || v === null || v === '')
      .map(([k]) => k);

    if (missing.length > 0) {
      const isAddress = missing.some(m => ['houseNo', 'street'].includes(m));
      return res.status(400).json({ 
        message: isAddress
          ? `Please complete your address details in your profile before requesting pickup.`
          : `All required fields must be provided. Missing: ${missing.join(', ')}`
      });
    }

    // Backend Village Boundary Validation - STRICT POLYGON-ONLY
    if (user.village) {
      const villageData = await Village.findOne({
        name: { $regex: new RegExp(`^${user.village.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      
      // DEBUG: Log validation start
      const polyType = villageData?.boundary?.type || 'none';
      const polyLoaded = !!(villageData?.boundary?.coordinates?.length > 0);
      console.debug('[wasteController] village boundary validation start', {
        user: user._id,
        village: user.village,
        coordinates: { lat: location.lat, lng: location.lng },
        polyType,
        polygonLoaded: polyLoaded,
        polygonCoordinates: polyLoaded ? (polyType === 'MultiPolygon' ? villageData.boundary.coordinates[0][0]?.length || 0 : villageData.boundary.coordinates[0]?.length || 0) : 0
      });

      // STRICT: Boundary must exist
      const hasValidBoundary = (b) => {
        if (!b?.coordinates || !b.type) return false;
        if (b.type === 'MultiPolygon') return b.coordinates.some(p => p[0]?.length >= 3);
        return b.coordinates[0]?.length >= 3;
      };
      if (!hasValidBoundary(villageData?.boundary)) {
        console.debug('[wasteController] NO POLYGON AVAILABLE - location REJECTED', {
          user: user._id,
          village: user.village
        });
        return res.status(403).json({ 
          message: `Village boundary for ${user.village} is not configured. Please contact support.` 
        });
      }

      // Perform Point-in-Polygon validation ONLY
      const isInside = isPointInPolygon(parseFloat(location.lat), parseFloat(location.lng), villageData.boundary);
      const polyCoordCount = polyType === 'MultiPolygon'
        ? (villageData.boundary.coordinates[0]?.[0]?.length || 0)
        : (villageData.boundary.coordinates[0]?.length || 0);
      console.debug('[wasteController] point-in-polygon result', {
        user: user._id,
        village: user.village,
        lat: location.lat,
        lng: location.lng,
        isInside,
        polygonCoordinates: polyCoordCount
      });

      if (!isInside) {
        console.debug('[wasteController] VALIDATION FAILED - outside polygon', {
          user: user._id,
          village: user.village,
          lat: location.lat,
          lng: location.lng
        });
        return res.status(403).json({ 
          message: `You can report waste only inside your registered village (${user.village}).` 
        });
      }
      
      console.debug('[wasteController] VALIDATION PASSED - inside polygon', {
        user: user._id,
        village: user.village,
        lat: location.lat,
        lng: location.lng
      });
    }
    
    // Check limits
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);

    if (reportType === 'Home Pickup') {
      const todayHomeCount = await WasteReport.countDocuments({
        userId,
        reportType: 'Home Pickup',
        createdAt: { $gte: dayStart },
      });
      if (todayHomeCount >= HOME_PICKUP_DAILY_LIMIT) {
        return res.status(429).json({ message: 'Daily report limit reached.' });
      }

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const existingSameType = await WasteReport.findOne({
        userId,
        reportType: 'Home Pickup',
        wasteType,
        createdAt: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['Submitted', 'Verified', 'Assigned', 'In Progress', 'Resubmitted'] },
      });
      if (existingSameType) {
        return res.status(409).json({
          message: 'You have already submitted a pickup request today.',
          existingReportId: existingSameType.reportId,
          status: existingSameType.status,
        });
      }
    } else {
      const todayCount = await WasteReport.countDocuments({ userId, createdAt: { $gte: dayStart } });
      if (todayCount >= DAILY_REPORT_LIMIT) {
        return res.status(429).json({ message: `Daily report limit (${DAILY_REPORT_LIMIT}) reached. Try again tomorrow.` });
      }
    }

    const bestCollector = await findBestCollector(user.village, location);
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lng);

    // ─── AI Fake Detection Logic ──────────────────────────────────────────────
    let aiResults = {
      aiVerified: false,
      aiStatus: 'PENDING_VERIFICATION',
      aiDetectedLabels: [],
      aiConfidenceScore: 0,
      fakeProbabilityScore: 0,
      rejectionReason: 'No image uploaded for AI scanning',
      duplicateImage: false,
      aiGeneratedDetected: false
    };

    const imagePath = req.file ? req.file.path : (image || '');

    if (imagePath) {
      try {
        const visionResults = await detectFakeWaste(imagePath, wasteType);
        aiResults = { ...aiResults, ...visionResults };
      } catch (aiErr) {
        console.error('[AI Detection Integration Error]:', aiErr);
      }
    }

    const reportStatus = aiResults.aiStatus === 'REJECTED' ? 'Cancelled' : 'Submitted';

    const reportId = await generateReportId();

    const report = await WasteReport.create({
      userId,
      reportId,
      reportType: reportType || 'Public',
      wasteType, severity: severity || 'Medium',
      wasteSeenAt: wasteSeenAt || 'Just Now',
      description: description || '',
      quantity: quantity || '',
      image: imagePath,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
        address: location.address,
        displayAddress: location.displayAddress || '',
        lat, lng,
      },
      houseNo, street, landmark, landmarkType, wardNumber,
      additionalInstructions: additionalInstructions || '',
      priorityLevel: priorityLevel || 'Normal',
      isBulk: !!isBulk,
      photoLocation: photoLocation || { lat: null, lng: null },
      accuracy: accuracy || null,
      pickupTime: finalPickupTime,
      village: user.village || '', 
      status: reportStatus,
      assignedCollector: null,
      isLocked: false,
      lockedAt: null,
      expectedCleanupHours: expectedHours(severity || 'Medium'),
      deadline: new Date(Date.now() + expectedHours(severity || 'Medium') * 60 * 60 * 1000),
      ...aiResults
    });

    // ─── Real-time Notifications & Post-Save (fire-and-forget) ──────────────
    (async () => {
      try {
        if (aiResults.aiStatus === 'REJECTED') {
          notifyNearbyUsers(user.village, report, 'rejected_report');
        } else if (aiResults.aiStatus === 'SUSPICIOUS') {
          notifyNearbyUsers(user.village, report, 'suspicious_report');
        } else if (aiResults.aiStatus === 'PENDING_VERIFICATION' && imagePath) {
          notifyNearbyUsers(user.village, report, 'verification_required');
        }

        createNotification(userId, 'Report Submitted',
          `Your ${wasteType} waste report has been submitted and is awaiting verification.`,
          'report', report._id);

        const nearbyCollectors = await User.find({
          village: { $regex: new RegExp(user.village, 'i') },
          role: 'collector'
        });
        for (const coll of nearbyCollectors) {
          createNotification(coll._id, 'New Report for Verification',
            `A new ${wasteType} waste report in ${user.village} needs verification.`,
            'report', report._id);
        }

        const { emitToAll } = require('../socket');
        emitToAll('report_created', report);
        if (reportStatus !== 'Cancelled') {
          await awardPoints(userId, 5, 'Report Submitted', report._id);
        } else {
          try { broadcastLeaderboardUpdate(); } catch {}
        }
      } catch (notifErr) {
        console.error('[createReport Post-Save Error]:', notifErr);
      }
    })();

    res.status(201).json({ 
      message: aiResults.aiStatus === 'REJECTED' ? 'Report rejected by AI.' : 'Report submitted successfully.', 
      report 
    });
  } catch (err) {
    console.error('[createReport General Error]:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const checkDuplicate = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required.' });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const nearby = await WasteReport.find({ createdAt: { $gte: since }, status: { $ne: 'Resolved' } }).lean();
    const duplicate = nearby.find(r =>
      haversineMeters(parseFloat(lat), parseFloat(lng), r.location.lat, r.location.lng) < 50
    );
    res.json({ duplicate: !!duplicate, report: duplicate || null });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const upvoteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const report = await WasteReport.findById(id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    const alreadyUpvoted = report.upvotes.some(u => u.toString() === userId);
    if (alreadyUpvoted) {
      report.upvotes = report.upvotes.filter(u => u.toString() !== userId);
    } else {
      report.upvotes.push(userId);
    }
    const count = report.upvotes.length;
    if (count >= 10)     report.severity = 'High';
    else if (count >= 4) report.severity = 'Medium';
    else                 report.severity = 'Low';
    await report.save();
    res.json({ upvotes: count, upvoted: !alreadyUpvoted, severity: report.severity });
    (async () => {
      try {
        if (!alreadyUpvoted) {
          await awardPoints(userId, 2, 'Supported a Report', id);
          if (report.userId.toString() !== userId) {
            createNotification(report.userId, 'Report Supported', `Someone supported your ${report.wasteType} waste report!`, 'support', report._id);
          }
        }
      } catch (notifErr) {
        console.error('[upvoteReport Post-Save Error]:', notifErr);
      }
    })();
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const report = await WasteReport.findById(id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.userId.toString() !== userId) return res.status(403).json({ message: 'Not authorized.' });
    const lockStatuses = ['In Progress', 'Resolved', 'Completed', 'Closed', 'Rejected', 'Delayed', 'Clarification Expired'];
    if (lockStatuses.includes(report.status)) {
      return res.status(400).json({ message: 'This report can no longer be edited.' });
    }
    if (report.assignedCollector || report.collectorId) {
      return res.status(400).json({ message: 'A collector has already accepted this report. Editing is no longer available.' });
    }

    const { wasteType, quantity, description, image, severity, priorityLevel, wasteSeenAt, landmark, landmarkType, location: bodyLocation } = req.body;
    if (wasteType)                report.wasteType   = wasteType;
    if (quantity !== undefined)   report.quantity    = quantity;
    if (description !== undefined) report.description = description;
    if (severity)                 report.severity    = severity;
    if (priorityLevel)            report.priorityLevel = priorityLevel;
    if (wasteSeenAt)              report.wasteSeenAt = wasteSeenAt;
    if (landmark !== undefined)   report.landmark    = landmark;
    if (landmarkType !== undefined) report.landmarkType = landmarkType;
    if (req.file)                 report.image       = req.file.path;
    else if (image !== undefined) report.image       = image;
    if (bodyLocation) {
      try {
        const loc = typeof bodyLocation === 'string' ? JSON.parse(bodyLocation) : bodyLocation;
        if (loc.address)        report.location.address = loc.address;
        if (loc.displayAddress) report.location.displayAddress = loc.displayAddress;
        if (loc.lat)            report.location.lat = loc.lat;
        if (loc.lng)            report.location.lng = loc.lng;
        if (loc.coordinates)    report.location.coordinates = loc.coordinates;
      } catch {}
    }
    report.isEdited  = true;
    await report.save();

    const populated = await WasteReport.findById(report._id)
      .populate('assignedCollector', 'name collectorType teamLeader teamSize')
      .lean();
    try {
      const { emitToAll } = require('../socket');
      emitToAll('report_updated', populated);
    } catch (e) { /* socket non-critical */ }

    res.json({ message: 'Report updated successfully.', report: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const report = await WasteReport.findById(id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.userId.toString() !== userId) return res.status(403).json({ message: 'Not authorized.' });
    if (report.status !== 'Submitted') return res.status(400).json({ message: 'Cannot delete a report that is already being processed.' });
    await report.deleteOne();
    try {
      broadcastLeaderboardUpdate();
    } catch (err) {
      console.error('[deleteReport leaderboard sync error]:', err);
    }
    res.json({ message: 'Report deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getNearbyReports = async (req, res) => {
  try {
    const { lat, lng, radius = 3, severity, status } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required.' });

    const radiusMeters = parseFloat(radius) * 1000;
    const query = { 'location.lat': { $exists: true }, 'location.lng': { $exists: true } };
    if (severity && severity !== 'all') query.severity = severity;
    if (status   && status   !== 'all') query.status   = status;

    const all = await WasteReport.find(query).sort({ createdAt: -1 }).limit(200).lean();
    const parsedLat = parseFloat(lat), parsedLng = parseFloat(lng);
    const nearby = all.filter(r => haversineMeters(parsedLat, parsedLng, r.location.lat, r.location.lng) <= radiusMeters);

    res.json(nearby);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getMyReports = async (req, res) => {
  try {
    const reports = await WasteReport.find({ userId: req.user.id })
      .populate('assignedCollector', 'name collectorType teamLeader teamSize')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const escalateReport = async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized.' });
    if (report.escalated) return res.status(400).json({ message: 'Already escalated.' });

    report.escalated   = true;
    report.escalatedAt = new Date();
    report.severity    = 'High';
    report.priority    = (report.priority || 0) + 10;
    await report.save();

    try {
      const { createNotification } = require('./notificationController');
      if (report.assignedCollector) {
        createNotification(report.assignedCollector, 'Task Escalated',
          `Report ${report._id} has been escalated by the citizen. Priority raised to High.`, 'escalation', report._id);
      }
    } catch { }

    res.json({ message: 'Report escalated successfully.', report });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const citizenVerify = async (req, res) => {
  try {
    const { verified } = req.body; 
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized.' });
    if (report.status !== 'Resolved') return res.status(400).json({ message: 'Report is not resolved yet.' });

    report.citizenVerified = verified === 'yes' ? 'yes' : 'no';

    if (verified === 'no') {
      report.status          = 'Reopened';
      report.assignedCollector = null;
      report.isLocked        = false;
      report.lockedAt        = null;
      report.priority        = (report.priority || 0) + 5;
      await report.save();
      createNotification(report.userId, 'Report Reopened',
        `Your ${report.wasteType} waste report has been reopened for re-inspection.`, 'report', report._id);
    } else {
      await report.save();
    }

    res.json({ message: verified === 'yes' ? 'Thank you for confirming!' : 'Report reopened for re-inspection.', report });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Collector Verification ───────────────────────────────────────────────
const collectorVerify = async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.status !== 'Submitted' && report.status !== 'Resubmitted' && report.status !== 'Clarification Expired') {
      return res.status(400).json({ message: 'Only submitted, resubmitted, or expired reports can be verified/rejected.' });
    }

    const { checklist, notes, action = 'verify' } = req.body;
    report.verificationNotes = notes || '';
    report.verifiedBy = req.user.id;
    report.verifiedAt = new Date();

    if (action === 'reject') {
      report.status = 'Rejected';
      createNotification(report.userId, 'Report Rejected',
        `Your ${report.wasteType} waste report has been rejected by a collector.`, 'status', report._id);
    } else {
      report.verificationChecklist = {
        wasteVisible:        checklist?.wasteVisible || false,
        typeCorrect:         checklist?.typeCorrect || false,
        descriptionMatches:  checklist?.descriptionMatches || false,
        locationReasonable:  checklist?.locationReasonable || false,
      };
      report.status = 'Verified';
      createNotification(report.userId, 'Report Verified',
        `Your ${report.wasteType} waste report has been verified by a collector.`, 'status', report._id);
    }

    await report.save();

    const populated = await WasteReport.findById(report._id)
      .populate('userId', 'name phone email')
      .lean();
    try { emitToAll('report_updated', populated); } catch (e) {}
    res.json({
      message: action === 'reject' ? 'Report rejected successfully.' : 'Report verified successfully.',
      report: populated
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Request Clarification ────────────────────────────────────────────────
const requestClarification = async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.status !== 'Submitted' && report.status !== 'Resubmitted') {
      return res.status(400).json({ message: 'Cannot request clarification for this report.' });
    }
    if ((report.clarificationCount || 0) >= 2) {
      return res.status(400).json({ message: 'Maximum clarification requests reached. Please verify or reject.' });
    }

    const { reason, notes } = req.body;
    if (!reason) return res.status(400).json({ message: 'Reason is required.' });

    if (!report.clarificationRequests) report.clarificationRequests = [];
    report.clarificationRequests.push({
      reason,
      notes: notes || '',
      requestedAt: new Date(),
      requestedBy: req.user.id,
    });
    report.clarificationCount = (report.clarificationCount || 0) + 1;
    report.status = 'Clarification Requested';
    report.clarificationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await report.save();

    createNotification(report.userId, 'Clarification Requested',
      `Your ${report.wasteType} waste report needs clarification. Reason: ${reason}${notes ? '. ' + notes : ''}`,
      'status', report._id);

    const populated = await WasteReport.findById(report._id)
      .populate('userId', 'name phone email')
      .lean();
    try { emitToAll('report_updated', populated); } catch (e) {}
    res.json({ message: 'Clarification requested.', report: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Resubmit Report (Citizen responds to clarification) ──────────────────
const resubmitReport = async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    if (report.status !== 'Clarification Requested') {
      return res.status(400).json({ message: 'Report is not awaiting clarification.' });
    }

    let { wasteType, description, quantity, location } = req.body;
    if (wasteType)                 report.wasteType   = wasteType;
    if (description !== undefined) report.description = description;
    if (quantity !== undefined)    report.quantity    = quantity;
    if (req.file)                  report.image       = req.file.path;

    if (typeof location === 'string') {
      try { location = JSON.parse(location); } catch (e) { location = null; }
    }

    if (location && location.lat != null && location.lng != null) {
      const lat = parseFloat(location.lat);
      const lng = parseFloat(location.lng);
      report.location = {
        type: 'Point',
        coordinates: [lng, lat],
        address: location.address,
        displayAddress: location.displayAddress || '',
        lat,
        lng,
      };
    }

    report.status = 'Resubmitted';
    report.resubmittedAt = new Date();
    report.clarificationExpiresAt = null;
    report.isEdited = true;
    await report.save();

    createNotification(report.userId, 'Report Resubmitted',
      `Your ${report.wasteType} waste report has been resubmitted for review.`, 'status', report._id);

    const populated = await WasteReport.findById(report._id)
      .populate('userId', 'name phone email')
      .lean();
    try { emitToAll('report_updated', populated); } catch (e) {}
    res.json({ message: 'Report resubmitted for review.', report: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Enhanced Duplicate Check (100m + waste type, public only) ────────────
const checkDuplicateEnhanced = async (req, res) => {
  try {
    const { lat, lng, wasteType } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required.' });

    const activeStatuses = ['Submitted', 'Verified', 'Assigned', 'In Progress', 'Resubmitted', 'Clarification Requested'];
    const query = {
      status: { $in: activeStatuses },
      reportType: 'Public',
      'location.lat': { $exists: true },
      'location.lng': { $exists: true },
    };
    if (wasteType) query.wasteType = wasteType;

    const active = await WasteReport.find(query).sort({ createdAt: -1 }).lean();
    const duplicates = active
      .map(r => ({
        ...r,
        distance: haversineMeters(parseFloat(lat), parseFloat(lng), r.location.lat, r.location.lng),
      }))
      .filter(r => r.distance <= 100 && r._id.toString() !== (req.query.exclude || ''));

    if (duplicates.length > 0) {
      try {
        createNotification(req.user.id, 'Duplicate Report Warning',
          `A similar public waste report already exists nearby. You can support the existing report or continue anyway.`,
          'warning', duplicates[0]._id);
      } catch (notifErr) {
        console.error('[duplicateWarningNotification]', notifErr);
      }
    }

    res.json({
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.map(r => ({
        _id: r._id,
        reportId: r.reportId,
        status: r.status,
        wasteType: r.wasteType,
        distance: Math.round(r.distance),
        description: r.description,
        supportedByCount: r.supportedBy?.length || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Support Existing Report ──────────────────────────────────────────────
const supportReport = async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.reportType !== 'Public') return res.status(400).json({ message: 'Only public waste reports can be supported.' });

    const already = (report.supportedBy || []).find(s => s.userId.toString() === req.user.id);
    if (already) {
      return res.status(409).json({ message: 'You already support this report.' });
    }

    if (!report.supportedBy) report.supportedBy = [];
    report.supportedBy.push({ userId: req.user.id, supportedAt: new Date() });
    await report.save();

    createNotification(report.userId, 'Report Supported',
      `A citizen supports your ${report.wasteType} waste report. Total supporters: ${report.supportedBy.length}`,
      'support', report._id);

    const populated = await WasteReport.findById(report._id)
      .populate('userId', 'name phone email')
      .lean();
    try { emitToAll('report_updated', populated); } catch (e) {}
    res.json({ message: 'Report supported.', supporters: report.supportedBy.length, report: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Get Report Verification Details ──────────────────────────────────────
const getReportVerification = async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id)
      .select('verificationChecklist verificationNotes verifiedBy verifiedAt clarificationRequests clarificationCount clarificationExpiresAt resubmittedAt supportedBy duplicateOf status reportId wasteType description')
      .populate('verifiedBy', 'name')
      .populate('clarificationRequests.requestedBy', 'name')
      .lean();
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Check Home Pickup Duplicate (same citizen + same waste type + same day) ─
const checkHomePickupDuplicate = async (req, res) => {
  try {
    const { wasteType } = req.query;
    const userId = req.user.id;
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);

    const existing = await WasteReport.findOne({
      userId,
      reportType: 'Home Pickup',
      wasteType,
      createdAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['Submitted', 'Verified', 'Assigned', 'In Progress'] },
    }).lean();

    res.json({
      isDuplicate: !!existing,
      report: existing ? {
        _id: existing._id,
        reportId: existing.reportId,
        status: existing.status,
        wasteType: existing.wasteType,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

module.exports = { createReport, validateWasteImage, checkDuplicate, upvoteReport, updateReport, deleteReport, getNearbyReports, getMyReports, escalateReport, citizenVerify, collectorVerify, requestClarification, resubmitReport, checkDuplicateEnhanced, supportReport, getReportVerification, checkHomePickupDuplicate };
