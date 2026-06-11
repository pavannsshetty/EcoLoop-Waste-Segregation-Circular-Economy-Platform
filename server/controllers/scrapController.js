const ScrapRequest = require('../models/ScrapRequest');
const User = require('../models/User');
const Collector = require('../models/Collector');
const { awardPoints } = require('./rewardsController');
const { createNotification } = require('./notificationController');
const { emitToAll, emitAnalyticsUpdate } = require('../socket');

const POINTS_MAPPING = {
  'Paper': 5,
  'Plastic': 10,
  'Metal': 15,
  'E-Waste': 20,
  'Glass': 10,
  'Clothes': 10,
  'Furniture': 15,
  'Other': 5
};

const createScrapRequest = async (req, res) => {
  try {
    const { 
      scrapType, 
      quantity, 
      quantityType,
      image, 
      address, 
      addressDetails,
      pickupTime, 
      description 
    } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Validate required fields
    if (!scrapType || !quantity) {
      return res.status(400).json({ message: 'Scrap type and quantity are required.' });
    }

    // Validate address - either from address string or location
    if ((!address || !address.trim()) && (!addressDetails || !addressDetails.village)) {
      return res.status(400).json({ message: 'Pickup address is required.' });
    }

    // Build location object - support both coordinate-based and address-only
    const locationAddress = (address && address.trim()) || addressDetails?.village || '';
    const locationData = {
      type: 'Point',
      coordinates: [0, 0],
      address: locationAddress,
      displayAddress: locationAddress,
    };

    // If coordinates are provided, include them
    if (addressDetails && addressDetails.lat && addressDetails.lng) {
      locationData.coordinates = [addressDetails.lng, addressDetails.lat];
      locationData.lat = addressDetails.lat;
      locationData.lng = addressDetails.lng;
    }

    const scrapRequest = await ScrapRequest.create({
      userId,
      userName: user.name,
      userEmail: user.email,
      scrapType,
      quantity,
      quantityType: quantityType || 'kg',
      image: req.file ? req.file.path : (image || ''),
      location: locationData,
      latitude: addressDetails?.lat || null,
      longitude: addressDetails?.lng || null,
      pickupTime,
      description: description || '',
      status: 'Requested',
      ecoPoints: POINTS_MAPPING[scrapType] || 10,
      addressDetails: addressDetails || {}
    });

    res.status(201).json({ message: 'Scrap pickup request submitted successfully.', scrapRequest });

    (async () => {
      try {
        createNotification(userId, 'Scrap Request Submitted', `Your request for ${scrapType} pickup has been received.`, 'report', scrapRequest._id);
      } catch (notifErr) {
        console.error('[createScrapRequest Post-Save Error]:', notifErr);
      }
    })();
  } catch (err) {
    console.error('Scrap request error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed.', error: err.message });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid data format.', error: err.message });
    }
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getUserScrapRequests = async (req, res) => {
  try {
    if (req.params.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view these requests.' });
    }
    const requests = await ScrapRequest.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getCollectorScrapTasks = async (req, res) => {
  try {
    const collectorId = req.user.id;
    const { status, sort } = req.query;
    
    let query = {};
    if (status === 'Available') {
      query = { status: 'Requested', assignedCollector: null };
    } else if (status) {
      query = { assignedCollector: collectorId, status };
    } else {
      query = { 
        $or: [
          { status: 'Requested', assignedCollector: null },
          { assignedCollector: collectorId }
        ]
      };
    }

    const sortOrder = sort === 'oldest' ? 1 : -1;
    const tasks = await ScrapRequest.find(query).sort({ createdAt: sortOrder });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const assignCollector = async (req, res) => {
  try {
    const { id } = req.params;
    const collectorId = req.user.id;

    const request = await ScrapRequest.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.assignedCollector) return res.status(400).json({ message: 'Already assigned.' });

    request.assignedCollector = collectorId;
    request.status = 'Assigned';
    await request.save();

    res.json({ message: 'Task assigned successfully.', request });
    emitToAll('scrap_updated', request);
    (async () => {
      try {
        createNotification(request.userId, 'Collector Assigned', `A collector has been assigned for your ${request.scrapType} pickup.`, 'status', request._id);
      } catch (notifErr) {
        console.error('[assignCollector Post-Save Error]:', notifErr);
      }
    })();
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const updateScrapStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const collectorId = req.user.id;

    const request = await ScrapRequest.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.assignedCollector?.toString() !== collectorId) {
      return res.status(403).json({ message: 'Not authorized for this task.' });
    }

    const allowed = { 'Assigned': ['In Progress'], 'In Progress': ['Collected'] };
    if (!allowed[request.status]?.includes(status)) {
      return res.status(400).json({ message: `Invalid status transition from ${request.status} to ${status}.` });
    }

    request.status = status;
    if (status === 'Collected') {
      await awardPoints(request.userId, request.ecoPoints, 'Scrap Collected', request._id);
      await Collector.findByIdAndUpdate(collectorId, { $inc: { completedTasks: 1 } });
      createNotification(request.userId, 'Scrap Collected', `Your ${request.scrapType} has been collected. You earned ${request.ecoPoints} Eco Points!`, 'status', request._id);
      emitAnalyticsUpdate('all');
    } else if (status === 'In Progress') {
      createNotification(request.userId, 'Pickup Started', `The collector is on the way for your ${request.scrapType} pickup.`, 'status', request._id);
    }

    await request.save();
    emitToAll('scrap_updated', request);
    res.json({ message: `Status updated to ${status}.`, request });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const completed = await ScrapRequest.find({ userId, status: 'Collected' });
    
    let totalWeight = 0;
    let points = 0;
    
    completed.forEach(r => {
      points += (r.ecoPoints || 0);
      const qty = r.quantity;
      const weightMatch = qty ? qty.match(/(\d+(\.\d+)?)/) : null;
      if (weightMatch) totalWeight += parseFloat(weightMatch[0]);
    });

    res.json({
      totalWeight,
      pickups: completed.length,
      points,
      co2Saved: (totalWeight * 0.8).toFixed(1)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

module.exports = {
  createScrapRequest,
  getUserScrapRequests,
  getCollectorScrapTasks,
  assignCollector,
  updateScrapStatus,
  getUserStats
};