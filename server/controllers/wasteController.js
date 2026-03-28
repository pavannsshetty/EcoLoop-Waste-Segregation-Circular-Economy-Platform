const WasteReport = require('../models/WasteReport');

const DAILY_REPORT_LIMIT = 5;

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const r = d => (d * Math.PI) / 180;
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const expectedHours = (severity) => ({ Low: 72, Medium: 48, High: 24 }[severity] || 48);

const createReport = async (req, res) => {
  try {
    const { wasteType, severity, wasteSeenAt, description, image, location,
            landmark, landmarkType, photoLocation, accuracy, pickupTime, anonymous } = req.body;
    const userId = req.user.id;

    if (!wasteType || !description || !location?.lat || !location?.lng || !location?.address || !pickupTime) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
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
    });

    res.status(201).json({ message: 'Report submitted successfully.', report });
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
    await report.save();
    res.json({ upvotes: report.upvotes.length, upvoted: !alreadyUpvoted });
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

module.exports = { createReport, checkDuplicate, upvoteReport, getMyReports };
