const WasteReport = require('../models/WasteReport');

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const createReport = async (req, res) => {
  try {
    const { wasteType, description, image, location, landmark, landmarkType, photoLocation, accuracy, pickupTime } = req.body;
    const userId = req.user.id;

    if (!wasteType || !description || !location?.lat || !location?.lng || !location?.address || !pickupTime) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    const locationDoc = {
      type: 'Point',
      coordinates: [location.lng, location.lat],
      address:        location.address,
      displayAddress: location.displayAddress || '',
      area:     location.area     || '',
      city:     location.city     || '',
      district: location.district || '',
      state:    location.state    || '',
      pincode:  location.pincode  || '',
      country:  location.country  || '',
      lat: location.lat,
      lng: location.lng,
    };

    const report = await WasteReport.create({
      userId, wasteType, description,
      image:         image || '',
      location:      locationDoc,
      landmark:      landmark || '',
      landmarkType:  landmarkType || '',
      photoLocation: photoLocation || { lat: null, lng: null },
      accuracy:      accuracy || null,
      pickupTime,
      status: 'Pending',
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
    const nearby = await WasteReport.find({
      createdAt: { $gte: since },
      status: { $ne: 'Completed' },
    }).lean();

    const duplicate = nearby.find(r =>
      haversineMeters(parseFloat(lat), parseFloat(lng), r.location.lat, r.location.lng) < 50
    );

    res.json({ duplicate: !!duplicate, report: duplicate || null });
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

module.exports = { createReport, checkDuplicate, getMyReports };
