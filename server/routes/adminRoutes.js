const express = require('express');
const router  = express.Router();
const { 
  adminLogin, addCollector, getNextCollectorId, getDashboardStats, 
  updateCollector, deleteCollector, getAllReports, getAssignedVillages,
  getGreenChampions, updateGreenChampion, deleteGreenChampion, assignGCTask,
  getApprovalRequests, updateApprovalRequest, checkDuplicates,
  uploadCollectorPhoto, getCollector,
  reverifyReport,
  getCitizens, getCitizenDetails, sendCitizenNotification,
  suspendCitizen, unsuspendCitizen, deleteCitizen,
} = require('../controllers/adminController');
const {
  getOrdersForAdmin,
  getEcoProductBuyers,
  getEcoProductBuyerOrders,
  assignOrderCollector,
  getActiveCollectors,
} = require('../controllers/ecoShoppingController');
const upload = require('../middleware/uploadMiddleware');
const { adminProtect } = require('../middleware/adminAuth');

router.post('/login',           adminLogin);
router.get('/next-collector-id', adminProtect, getNextCollectorId);
router.post('/add-collector',   adminProtect, addCollector);
router.get('/dashboard',        adminProtect, getDashboardStats);
router.put('/collector/:id',    adminProtect, updateCollector);
router.delete('/collector/:id', adminProtect, deleteCollector);
router.get('/reports',          adminProtect, getAllReports);
router.get('/reports/public',   adminProtect, (req, res, next) => { req.query.type = 'Public'; next(); }, getAllReports);
router.get('/reports/home-pickup', adminProtect, (req, res, next) => { req.query.type = 'Home Pickup'; next(); }, getAllReports);
router.put('/report/:id/reverify', adminProtect, reverifyReport);
router.get('/assigned-villages', adminProtect, getAssignedVillages);
router.post('/check-duplicates', adminProtect, checkDuplicates);
router.post('/collector/photo', adminProtect, upload.single('photo'), uploadCollectorPhoto);
router.get('/collector/:id', adminProtect, getCollector);

router.get('/eco-shopping/orders', adminProtect, getOrdersForAdmin);
router.get('/eco-shopping/buyers', adminProtect, getEcoProductBuyers);
router.get('/eco-shopping/buyers/:userId', adminProtect, getEcoProductBuyerOrders);
router.put('/eco-shopping/orders/:id/assign', adminProtect, assignOrderCollector);
router.get('/collectors', adminProtect, getActiveCollectors);

router.get('/approval-requests', adminProtect, getApprovalRequests);
router.put('/approval-requests/:id', adminProtect, updateApprovalRequest);

// Green Champion Management
router.get('/green-champions',      adminProtect, getGreenChampions);
router.put('/green-champion/:id',   adminProtect, updateGreenChampion);
router.delete('/green-champion/:id',adminProtect, deleteGreenChampion);
router.post('/green-champion/assign-task', adminProtect, assignGCTask);

// Citizen Management
router.get('/citizens',              adminProtect, getCitizens);
router.get('/citizen/:id',           adminProtect, getCitizenDetails);
router.post('/citizen/:id/notify',   adminProtect, sendCitizenNotification);
router.put('/citizen/:id/suspend',   adminProtect, suspendCitizen);
router.put('/citizen/:id/unsuspend', adminProtect, unsuspendCitizen);
router.delete('/citizen/:id',        adminProtect, deleteCitizen);

module.exports = router;
