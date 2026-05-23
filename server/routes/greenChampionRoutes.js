const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/auth');
const { adminProtect } = require('../middleware/adminAuth');
const {
    submitRequest,
    checkRequestStatus,
    forgotRequestId,
    getAllRequests,
    reviewRequest
} = require('../controllers/greenChampionController');

const {
    getDashboardStats,
    getNearbyReports,
    verifyCleanup,
    createPost,
    getPosts,
    createCampaign,
    getCampaigns,
    getRecyclingRequests,
    updatePickupStatus,
    getTasks,
    updateTaskStatus,
    getLeaderboard
} = require('../controllers/greenChampionActionController');

const { greenChampionAuth } = require('../middleware/greenChampionAuth');
const { villages } = require('../data/kundapuraVillages');

// PUBLIC
router.get('/villages', (req, res) => {
    res.json(villages.map(v => v.name));
});

router.post('/apply', upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'idProof', maxCount: 1 }
]), submitRequest);

router.get('/status/:requestId', checkRequestStatus);
router.post('/forgot-id', forgotRequestId);

// ADMIN
router.get('/admin/requests', adminProtect, getAllRequests);
router.put('/admin/request/:id', adminProtect, reviewRequest);

// CHAMPION ACTIONS
router.get('/dashboard/stats', protect, greenChampionAuth, getDashboardStats);
router.get('/reports/nearby', protect, greenChampionAuth, getNearbyReports);
router.put('/report/:reportId/verify', protect, greenChampionAuth, upload.single('proofImage'), verifyCleanup);

router.post('/posts', protect, greenChampionAuth, upload.single('image'), createPost);
router.get('/posts', protect, greenChampionAuth, getPosts);

router.post('/campaigns', protect, greenChampionAuth, upload.single('image'), createCampaign);
router.get('/campaigns', protect, greenChampionAuth, getCampaigns);

router.get('/recycling-requests', protect, greenChampionAuth, getRecyclingRequests);
router.put('/recycling-request/:pickupId', protect, greenChampionAuth, updatePickupStatus);

router.get('/tasks', protect, greenChampionAuth, getTasks);
router.put('/task/:taskId', protect, greenChampionAuth, updateTaskStatus);

router.get('/leaderboard', protect, greenChampionAuth, getLeaderboard);

module.exports = router;
