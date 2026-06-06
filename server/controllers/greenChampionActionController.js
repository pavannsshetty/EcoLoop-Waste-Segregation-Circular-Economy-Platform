const WasteReport = require('../models/WasteReport');
const AwarenessPost = require('../models/AwarenessPost');
const Campaign = require('../models/Campaign');
const GCTask = require('../models/GCTask');
const RecyclingPickup = require('../models/RecyclingPickup');
const GCFeedback = require('../models/GCFeedback');
const User = require('../models/User');
const Collector = require('../models/Collector');
const Notification = require('../models/Notification');
const { emitToAll } = require('../socket');

// 1. Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const gcId = req.user._id;
        const village = req.user.village;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        // Get comprehensive dashboard data
        const [
            totalCitizens,
            activeCollectors,
            totalReports,
            activeReports,
            pendingPickups,
            wasteCollectedToday,
            resolvedReports,
            recentReports,
            villageCollectors,
            recentBroadcasts,
            cleanupStats,
            recyclingStats,
            recentCampaigns,
            recentAwareness
        ] = await Promise.all([
            // Total citizens in village
            User.countDocuments({ village, role: 'citizen', isActive: true }),
            
            // Active collectors in village (available or busy)
            Collector.countDocuments({ village, status: 'Active', availability: { $in: ['Available', 'Busy'] } }),
            
            // Total waste reports in village
            WasteReport.countDocuments({ village }),
            
            // Active waste reports (In Progress or Assigned)
            WasteReport.countDocuments({ village, status: { $in: ['Assigned', 'In Progress'] } }),
            
            // Pending pickups (home pickup requests awaiting collection)
            WasteReport.countDocuments({ 
                village, 
                reportType: 'Home Pickup',
                status: { $in: ['Submitted', 'Assigned', 'In Progress'] }
            }),
            
            // Waste collected today (completed home pickups today)
            WasteReport.countDocuments({ 
                village, 
                reportType: 'Home Pickup',
                status: 'Resolved',
                completedAt: { $gte: today, $lt: tomorrow }
            }),
            
            // Resolved reports (verified cleanups)
            WasteReport.countDocuments({ 
                village, 
                status: 'Resolved',
                'gcVerification.status': 'Verified'
            }),
            
            // Recent reports (last 5)
            WasteReport.find({ village })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('userId', 'name')
                .populate('assignedCollector', 'name'),
                
            // Get collectors in village for status section
            Collector.find({ village })
                .sort({ availability: 1, name: 1 }) // Available first, then Busy, then by name
                .limit(10),
                
            // Recent broadcasts/notifications
            Notification.find({ 
                $or: [
                    { targetVillage: village },
                    { targetAudience: 'All' },
                    { targetAudience: 'Green Champions' }
                ]
            })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('senderId', 'name')
                .populate('reportId', 'reportId wasteType'),
                
            // Calculate cleanup completion rate for progress bar (monthly)
            WasteReport.aggregate([
                { 
                    $match: { 
                        village: village,
                        reportType: 'Home Pickup',
                        createdAt: { 
                            $gte: firstDayOfMonth,
                            $lt: firstDayOfNextMonth
                        } 
                    } 
                },
                { 
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        completed: { 
                            $sum: { 
                                $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] 
                            } 
                        }
                    } 
                }
            ]),
            
            // Recycling statistics
            RecyclingPickup.aggregate([
                {
                    $match: { 
                        village: village,
                        createdAt: { 
                            $gte: firstDayOfMonth,
                            $lt: firstDayOfNextMonth
                        } 
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        collected: { 
                            $sum: { 
                                $cond: [{ $eq: ['$status', 'Collected'] }, 1, 0] 
                            } 
                        }
                    }
                }
            ]),
            
            // Recent activity feed: campaigns
            Campaign.find({ village, organizer: gcId }).sort({ createdAt: -1 }).limit(2).lean(),
            // Recent activity feed: awareness posts
            AwarenessPost.find({ village, author: gcId }).sort({ createdAt: -1 }).limit(2).lean()
        ]);

        // Process cleanup completion rate
        let completionRate = 0;
        if (cleanupStats.length > 0 && cleanupStats[0].total > 0) {
            completionRate = Math.round((cleanupStats[0].completed / cleanupStats[0].total) * 100);
        }

        // Process recycling stats
        let recyclingRate = 0;
        if (recyclingStats.length > 0 && recyclingStats[0].total > 0) {
            recyclingRate = Math.round((recyclingStats[0].collected / recyclingStats[0].total) * 100);
        }

        // Process recent broadcasts
        const broadcasts = recentBroadcasts.map(broadcast => ({
            _id: broadcast._id,
            title: broadcast.title,
            message: broadcast.message,
            image: broadcast.image,
            type: broadcast.type || 'Awareness Campaigns',
            createdAt: broadcast.createdAt,
            senderName: broadcast.senderId ? broadcast.senderId.name : 'System',
            isRead: broadcast.readBy?.includes(gcId) || false
        }));

        // Process collector status
        const collectorStatus = villageCollectors.map(collector => ({
            _id: collector._id,
            collectorId: collector.collectorId,
            name: collector.name,
            availability: collector.availability,
            status: collector.status,
            completedTasks: collector.completedTasks,
            performanceScore: collector.performanceScore,
            photo: collector.photo,
            vehicleType: collector.vehicleType,
            vehicleNumber: collector.vehicleNumber,
            isOnline: collector.availability !== 'Offline'
        }));

        // Process recent reports for display
        const reports = recentReports.map(report => ({
            _id: report._id,
            reportId: report.reportId,
            reportType: report.reportType,
            wasteType: report.wasteType,
            severity: report.severity,
            status: report.status,
            description: report.description,
            location: report.location,
            createdAt: report.createdAt,
            citizenName: report.userId ? report.userId.name : 'Unknown Citizen',
            assignedCollectorName: report.assignedCollector ? report.assignedCollector.name : 'Unassigned',
            gcVerification: report.gcVerification
        }));

        // Process activity feed
        const activityFeedItems = [
            ...(recentReports || []).slice(0, 3).map(item => ({
                _id: item._id,
                type: 'report',
                icon: 'HiClipboardCheck',
                text: `New ${item.reportType.toLowerCase()} waste report: ${item.wasteType}`,
                time: item.createdAt,
                userName: item.userId ? item.userId.name : 'Unknown Citizen'
            })),
            ...(recentCampaigns || []).map(item => ({
                _id: item._id,
                type: 'campaign',
                icon: 'HiFlag',
                text: `Launched campaign: ${item.title}`,
                time: item.createdAt,
                userName: 'You'
            })),
            ...(recentAwareness || []).map(item => ({
                _id: item._id,
                type: 'awareness',
                icon: 'HiSpeakerphone',
                text: `Shared awareness post: ${item.title}`,
                time: item.createdAt,
                userName: 'You'
            }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6); // Keep only latest 6 activities

        res.json({
            stats: {
                totalCitizens,
                activeCollectors,
                totalReports,
                activeReports,
                pendingPickups,
                wasteCollectedToday,
                resolvedReports,
                cleanupCompletionRate: completionRate,
                recyclingRate: recyclingRate
            },
            reports,
            collectors: collectorStatus,
            broadcasts,
            activityFeed: activityFeedItems,
            cleanupProgress: {
                monthlyTarget: 80, // Target 80% completion rate
                currentRate: completionRate
            },
            recyclingProgress: {
                monthlyTarget: 70, // Target 70% recycling rate
                currentRate: recyclingRate
            }
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
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

// 9. Create Broadcast Notification
exports.createBroadcast = async (req, res) => {
    try {
        const { title, message, notificationType } = req.body;
        const village = req.user.village;
        const gcId = req.user._id;

        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required.' });
        }

        const notification = await Notification.create({
            title,
            description: message,
            message,
            type: notificationType === 'Emergency' ? 'Emergency Alerts' :
                  notificationType === 'Campaign' ? 'Waste Collection Drives' :
                  notificationType === 'Pickup Delay' ? 'Waste Collection Drives' : 'Awareness Campaigns',
            targetAudience: 'All',
            targetVillage: village,
            senderId: gcId,
            status: 'Active',
        });

        emitToAll('notification', notification);
        emitToAll('new_broadcast', notification);

        res.status(201).json(notification);
    } catch (err) {
        console.error('Broadcast error:', err);
        res.status(500).json({ message: 'Error creating broadcast', error: err.message });
    }
};
