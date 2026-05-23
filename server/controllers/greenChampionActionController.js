const WasteReport = require('../models/WasteReport');
const AwarenessPost = require('../models/AwarenessPost');
const Campaign = require('../models/Campaign');
const GCTask = require('../models/GCTask');
const RecyclingPickup = require('../models/RecyclingPickup');
const GCFeedback = require('../models/GCFeedback');
const User = require('../models/User');
const { emitToAll } = require('../socket');

// 1. Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const gcId = req.user._id;
        const village = req.user.village;

        const reportsMonitored = await WasteReport.countDocuments({ village });
        const pendingVerifications = await WasteReport.countDocuments({ village, status: 'Resolved', 'gcVerification.status': 'Pending' });
        const verifiedCleanups = await WasteReport.countDocuments({ village, 'gcVerification.status': 'Verified' });
        const recyclingRequests = await RecyclingPickup.countDocuments({ village, status: 'Requested' });
        const campaigns = await Campaign.countDocuments({ organizer: gcId });
        const pendingTasks = await GCTask.countDocuments({ assignedTo: gcId, status: 'Pending' });

        const recentReports = await WasteReport.find({ village }).sort({ createdAt: -1 }).limit(3);
        const upcomingTasks = await GCTask.find({ assignedTo: gcId, status: 'Pending' }).sort({ deadline: 1 }).limit(3);

        res.json({
            stats: {
                reportsMonitored,
                pendingVerifications,
                verifiedCleanups,
                recyclingRequests,
                campaigns,
                pendingTasks
            },
            recentReports,
            upcomingTasks
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching stats', error: err.message });
    }
};

// 2. Nearby Reports
exports.getNearbyReports = async (req, res) => {
    try {
        const village = req.user.village;
        const reports = await WasteReport.find({ village }).sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching reports', error: err.message });
    }
};

// 3. Cleanup Verification
exports.verifyCleanup = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { status, comment } = req.body; // status: 'Verified' or 'Rejected'
        const gcId = req.user._id;

        const report = await WasteReport.findById(reportId);
        if (!report) return res.status(404).json({ message: 'Report not found' });

        report.gcVerification = {
            verifiedBy: gcId,
            status,
            comment,
            proofImage: req.file ? req.file.path : '',
            verifiedAt: new Date()
        };

        if (status === 'Verified') {
            // Reward GC
            await User.findByIdAndUpdate(gcId, { $inc: { ecoPoints: 10 } });
        }

        await report.save();
        emitToAll('WASTE_REPORT_UPDATED', report);
        res.json({ message: `Cleanup ${status} successfully`, report });
    } catch (err) {
        res.status(500).json({ message: 'Verification error', error: err.message });
    }
};

// 4. Awareness Posts
exports.createPost = async (req, res) => {
    try {
        const { title, description } = req.body;
        const post = await AwarenessPost.create({
            author: req.user._id,
            title,
            description,
            image: req.file ? req.file.path : '',
            village: req.user.village
        });
        emitToAll('NEW_AWARENESS_POST', post);
        res.status(201).json(post);
    } catch (err) {
        res.status(500).json({ message: 'Error creating post', error: err.message });
    }
};

exports.getPosts = async (req, res) => {
    try {
        const posts = await AwarenessPost.find({ village: req.user.village }).populate('author', 'name profilePhoto').sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching posts', error: err.message });
    }
};

// 5. Campaigns
exports.createCampaign = async (req, res) => {
    try {
        const { title, description, area, date, time } = req.body;
        const campaign = await Campaign.create({
            organizer: req.user._id,
            title,
            description,
            area,
            date,
            time,
            image: req.file ? req.file.path : '',
            village: req.user.village
        });
        
        // Reward for organizing
        await User.findByIdAndUpdate(req.user._id, { $inc: { ecoPoints: 50 } });
        
        emitToAll('NEW_CAMPAIGN', campaign);
        res.status(201).json(campaign);
    } catch (err) {
        res.status(500).json({ message: 'Error creating campaign', error: err.message });
    }
};

exports.getCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({ village: req.user.village }).populate('organizer', 'name profilePhoto').sort({ date: 1 });
        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching campaigns', error: err.message });
    }
};

// 6. Recycling Pickups
exports.getRecyclingRequests = async (req, res) => {
    try {
        const requests = await RecyclingPickup.find({ village: req.user.village }).populate('citizen', 'name phone').sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching requests', error: err.message });
    }
};

exports.updatePickupStatus = async (req, res) => {
    try {
        const { pickupId } = req.params;
        const { status } = req.body;
        const pickup = await RecyclingPickup.findById(pickupId);
        if (!pickup) return res.status(404).json({ message: 'Request not found' });

        pickup.status = status;
        pickup.assignedGC = req.user._id;

        if (status === 'Collected' && !pickup.pointsGiven) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { ecoPoints: 20 } });
            pickup.pointsGiven = true;
        }

        await pickup.save();
        res.json(pickup);
    } catch (err) {
        res.status(500).json({ message: 'Error updating pickup', error: err.message });
    }
};

// 7. Tasks
exports.getTasks = async (req, res) => {
    try {
        const tasks = await GCTask.find({ assignedTo: req.user._id }).sort({ deadline: 1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching tasks', error: err.message });
    }
};

exports.updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;
        const task = await GCTask.findById(taskId);
        if(!task) return res.status(404).json({ message: 'Task not found' });

        task.status = status;
        if (status === 'Completed') {
            task.completionDate = new Date();
            await User.findByIdAndUpdate(req.user._id, { $inc: { ecoPoints: task.points } });
        }
        await task.save();
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: 'Error updating task', error: err.message });
    }
};

// 8. Leaderboard
exports.getLeaderboard = async (req, res) => {
    try {
        const champions = await User.find({ role: 'green_champion' })
            .select('name village ecoPoints profilePhoto')
            .sort({ ecoPoints: -1 })
            .limit(10);
        res.json(champions);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching leaderboard', error: err.message });
    }
};
