const WasteReport = require('../models/WasteReport');
const Collector   = require('../models/Collector');
const { createNotification } = require('./notificationController');
const { awardPoints }        = require('./rewardsController');
const User               = require('../models/User');
const Village            = require('../models/Village');
const { isPointInPolygon } = require('../utils/geoUtils');
const { emitToAll, emitToUser } = require('../socket');
const { detectFakeWaste } = require('../utils/aiWasteDetection');
const { isValidVillage } = require('../data/kundapuraVillages');

const DAILY_REPORT_LIMIT  = 5;
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

const findBestCollector = async (village, location) => {
  const collectors = await Collector.find({ status: 'Active', availability: { $ne: 'Offline' } }).lean();
  if (!collectors.length) return null;

  const activeCounts = await Promise.all(
    collectors.map(c =>
      WasteReport.countDocuments({ assignedCollector: c._id, status: { $in: ['Assigned', 'In Progress'] } })
    )
  );

  const eligible = collectors.filter((_, i) => activeCounts[i] < MAX_ACTIVE_TASKS);
  if (!eligible.length) return null;

  const villageNorm = (village || '').trim().toLowerCase();

  if (villageNorm) {
    const villageMatches = eligible.filter(c =>
      Array.isArray(c.villages) && c.villages.some(v => v.trim().toLowerCase() === villageNorm)
    );
    if (villageMatches.length) {
      const counts = villageMatches.map(c => activeCounts[collectors.indexOf(c)]);
      return villageMatches[counts.indexOf(Math.min(...counts))];
    }
  }

  const city = (location?.city || '').toLowerCase();
  const cityMatches = eligible.filter(c => (c.city || '').toLowerCase().includes(city));
  const pool = cityMatches.length ? cityMatches : eligible;
  const poolCounts = pool.map(c => activeCounts[collectors.indexOf(c)]);
  return pool[poolCounts.indexOf(Math.min(...poolCounts))];
};

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
            landmark, landmarkType, photoLocation, accuracy, pickupDate, pickupTime,
            additionalInstructions, isBulk, village, houseNo, street, wardNumber, reportType } = req.body;
    const userId = req.user.id;

    // Parse JSON strings if they come from FormData
    if (typeof location === 'string') {
      try { location = JSON.parse(location); } catch (e) { location = null; }
    }
    if (typeof photoLocation === 'string') {
      try { photoLocation = JSON.parse(photoLocation); } catch (e) { photoLocation = null; }
    }

    // Combine pickupDate and pickupTime securely
    let finalPickupTime = null;
    if (pickupDate && pickupTime) {
      const dateObj = new Date(`${pickupDate}T${pickupTime}`);
      if (!isNaN(dateObj.getTime())) finalPickupTime = dateObj;
    } else if (pickupTime) {
      const dateObj = new Date(pickupTime);
      if (!isNaN(dateObj.getTime())) finalPickupTime = dateObj;
    }

    // For Public reports without a set pickup time, use the deadline as pickupTime
    if (reportType !== 'Home Pickup' && !finalPickupTime) {
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
      requiredFields.pickupDate = pickupDate;
      requiredFields.pickupTime = pickupTime;
    } else {
      requiredFields.severity = severity || 'Medium';
      requiredFields.wasteSeenAt = wasteSeenAt || 'Just Now';
    }

    // Require manual address input strictly only if coordinates are bypassed
    if (location?.lat === 0 && location?.lng === 0) {
      requiredFields.houseNo = houseNo;
      requiredFields.street = street;
      requiredFields.wardNumber = wardNumber;
    }

    const missing = Object.entries(requiredFields)
      .filter(([_, v]) => v === undefined || v === null || v === '')
      .map(([k]) => k);

    if (missing.length > 0) {
      return res.status(400).json({ 
        message: `All required fields must be provided. Missing: ${missing.join(', ')}` 
      });
    }

    // Backend Village Boundary Validation
    if (user.village) {
      const villageData = await Village.findOne({ name: user.village });
      if (villageData && villageData.boundary) {
        const isInside = isPointInPolygon(parseFloat(location.lat), parseFloat(location.lng), villageData.boundary);
        if (!isInside) {
          return res.status(403).json({ 
            message: `You can report waste only inside your registered village (${user.village}).` 
          });
        }
      }
    }

    const locAddr     = (location?.address || '').toLowerCase();
    const inUdupi     = locAddr.includes('udupi') || locAddr.includes('kundapura') || locAddr.includes('karwar') || true; // Relaxing for testing, but let's keep it safe
    
    // Check limit
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const todayCount = await WasteReport.countDocuments({ userId, createdAt: { $gte: dayStart } });
    if (todayCount >= DAILY_REPORT_LIMIT) {
      return res.status(429).json({ message: `Daily report limit (${DAILY_REPORT_LIMIT}) reached. Try again tomorrow.` });
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

    const reportStatus = aiResults.aiStatus === 'REJECTED' ? 'Cancelled' : 
                         (bestCollector ? 'Assigned' : 'Submitted');

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
      isBulk: !!isBulk,
      photoLocation: photoLocation || { lat: null, lng: null },
      accuracy: accuracy || null,
      pickupTime: finalPickupTime,
      village: user.village || '', 
      status: reportStatus,
      assignedCollector: bestCollector ? bestCollector._id : null,
      isLocked: !!bestCollector && aiResults.aiStatus !== 'REJECTED',
      lockedAt: bestCollector && aiResults.aiStatus !== 'REJECTED' ? new Date() : null,
      expectedCleanupHours: expectedHours(severity || 'Medium'),
      deadline: new Date(Date.now() + expectedHours(severity || 'Medium') * 60 * 60 * 1000),
      ...aiResults
    });

    res.status(201).json({ 
      message: aiResults.aiStatus === 'REJECTED' ? 'Report rejected by AI.' : 'Report submitted successfully.', 
      report 
    });

    // ─── Real-time Notifications for AI results ──────────────────────────────
    if (aiResults.aiStatus === 'REJECTED') {
      notifyNearbyUsers(user.village, report, 'rejected_report');
    } else if (aiResults.aiStatus === 'SUSPICIOUS') {
      notifyNearbyUsers(user.village, report, 'suspicious_report');
    } else if (aiResults.aiStatus === 'PENDING_VERIFICATION' && imagePath) {
      notifyNearbyUsers(user.village, report, 'verification_required');
    }

    try {
      createNotification(userId, 'Report Submitted',
        `Your ${wasteType} waste report has been submitted. Expected cleanup: ${expectedHours(severity || 'Medium')}h.`,
        'report', report._id);

      if (bestCollector) {
        createNotification(bestCollector._id, 'New Task Assigned',
          `A ${wasteType} waste report has been assigned to you in ${location.area || location.city}.`,
          'report', report._id);
      }
      
      const { emitToAll } = require('../socket');
      emitToAll('report_created', report);
      if (reportStatus !== 'Cancelled') {
        await awardPoints(userId, 5, 'Report Submitted', report._id);
      }
    } catch (notifErr) {
      console.error('[createReport Notification/Socket/Points Error]:', notifErr);
    }
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
    if (!alreadyUpvoted) {
      awardPoints(userId, 2, 'Supported a Report', id);
      if (report.userId.toString() !== userId) {
        createNotification(report.userId, 'Report Supported', `Someone supported your ${report.wasteType} waste report!`, 'support', report._id);
      }
    }
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
    if (report.status !== 'Submitted') return res.status(400).json({ message: 'Report cannot be edited after processing started.' });

    const { wasteType, severity, description, landmark, landmarkType, pickupTime, location, image, houseNo, street, wardNumber } = req.body;
    if (wasteType)              report.wasteType    = wasteType;
    if (severity)               report.severity     = severity;
    if (description)            report.description  = description;
    if (landmark !== undefined) report.landmark     = landmark;
    if (landmarkType !== undefined) report.landmarkType = landmarkType;
    if (pickupTime)             report.pickupTime   = new Date(pickupTime);
    if (houseNo)                report.houseNo      = houseNo;
    if (street)                 report.street       = street;
    if (wardNumber)             report.wardNumber   = wardNumber;
    if (req.file)               report.image        = req.file.path;
    else if (image !== undefined) report.image      = image;
    if (location?.lat) {
      report.location = { ...report.location, ...location, type: 'Point', coordinates: [location.lng, location.lat] };
    }
    report.isEdited  = true;
    report.updatedAt = new Date();
    await report.save();
    res.json({ message: 'Report updated successfully.', report });
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
    const reports = await WasteReport.find({ userId: req.user.id }).sort({ createdAt: -1 });
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

module.exports = { createReport, validateWasteImage, checkDuplicate, upvoteReport, updateReport, deleteReport, getNearbyReports, getMyReports, escalateReport, citizenVerify };
