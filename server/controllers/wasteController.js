const WasteReport = require('../models/WasteReport');
const { createNotification } = require('./notificationController');
const { awardPoints }        = require('./rewardsController');

const DAILY_REPORT_LIMIT = 5;

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const r = d => (d * Math.PI) / 180;
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const expectedHours = (severity) => ({ Low: 48, Medium: 24, High: 8 }[severity] || 24);

const createReport = async (req, res) => {
  try {
    const { wasteType, severity, wasteSeenAt, description, image, location,
            landmark, landmarkType, photoLocation, accuracy, pickupTime, anonymous } = req.body;
    const userId = req.user.id;

    if (!wasteType || !description || !location?.lat || !location?.lng || !location?.address || !pickupTime) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    const locState   = (location.state   || '').toLowerCase();
    const locDistrict = (location.district || location.city || '').toLowerCase();
    const locAddr    = (location.address  || '').toLowerCase();
    const inKarnataka = locState.includes('karnataka') || locAddr.includes('karnataka');
    const inUdupi     = locDistrict.includes('udupi') || locAddr.includes('udupi') || locAddr.includes('kundapura');
    if (!inKarnataka || !inUdupi) {
      return res.status(400).json({ message: 'Reports allowed only in Kundapura Taluk, Udupi, Karnataka.' });
    }

    const taluk   = (location.taluk    || location.district || '').toLowerCase();
    const district = (location.district || '').toLowerCase();
    const state    = (location.state    || '').toLowerCase();
    const addr     = (location.address  || '').toLowerCase();
    const inKundapura = (taluk.includes('kundapura') || addr.includes('kundapura')) &&
                        (district.includes('udupi')   || addr.includes('udupi'))    &&
                        (state.includes('karnataka')  || addr.includes('karnataka'));
    if (!inKundapura) {
      return res.status(403).json({ message: 'Reports allowed only in Kundapura Taluk, Udupi, Karnataka.' });
    }

    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const todayCount = await WasteReport.countDocuments({ userId, createdAt: { $gte: dayStart } });
    if (todayCount >= DAILY_REPORT_LIMIT) {
      return res.status(429).json({ message: `Daily report limit (${DAILY_REPORT_LIMIT}) reached. Try again tomorrow.` });
    }

    const report = await WasteReport.create({
      userId, anonymous: !!anonymous,
      wasteType, severity: severity || 'Medium',
      wasteSeenAt: wasteSeenAt || 'Just now',
      description,
      image: image || '',
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat],
        address: location.address,
        displayAddress: location.displayAddress || '',
        houseNo: location.houseNo || '', street: location.street || '',
        addrLandmark: location.addrLandmark || '',
        area: location.area || '', city: location.city || '',
        district: location.district || '', state: location.state || '',
        pincode: location.pincode || '', country: location.country || '',
        lat: location.lat, lng: location.lng,
      },
      landmark: landmark || '', landmarkType: landmarkType || '',
      photoLocation: photoLocation || { lat: null, lng: null },
      accuracy: accuracy || null,
      pickupTime,
      status: 'Submitted',
      expectedCleanupHours: expectedHours(severity || 'Medium'),
      deadline: new Date(Date.now() + expectedHours(severity || 'Medium') * 60 * 60 * 1000),
    });

    res.status(201).json({ message: 'Report submitted successfully.', report });
    createNotification(userId, 'Report Submitted', `Your ${wasteType} waste report has been submitted. Expected cleanup: ${expectedHours(severity || 'Medium')}h.`, 'report', report._id);
    
    // Emit to agents/collectors that a new report is available
    const { emitToAll } = require('../socket');
    emitToAll('report_created', report);

    awardPoints(userId, 5, 'Report Submitted', report._id);
  } catch (err) {
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

    const { wasteType, severity, description, landmark, landmarkType, pickupTime, location, image } = req.body;
    if (wasteType)              report.wasteType    = wasteType;
    if (severity)               report.severity     = severity;
    if (description)            report.description  = description;
    if (landmark !== undefined) report.landmark     = landmark;
    if (landmarkType !== undefined) report.landmarkType = landmarkType;
    if (pickupTime)             report.pickupTime   = new Date(pickupTime);
    if (image !== undefined)    report.image        = image;
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

module.exports = { createReport, checkDuplicate, upvoteReport, updateReport, deleteReport, getNearbyReports, getMyReports };
