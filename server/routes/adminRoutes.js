const express = require('express');
const router  = express.Router();
const { 
  adminLogin, addCollector, getNextCollectorId, getDashboardStats, 
  updateCollector, deleteCollector, getAllReports, getAssignedVillages,
  getGreenChampions, updateGreenChampion, deleteGreenChampion, assignGCTask,
  getApprovalRequests, updateApprovalRequest
} = require('../controllers/adminController');
const { adminProtect } = require('../middleware/adminAuth');

router.post('/login',           adminLogin);
router.get('/next-collector-id', adminProtect, getNextCollectorId);
router.post('/add-collector',   adminProtect, addCollector);
router.get('/dashboard',        adminProtect, getDashboardStats);
router.put('/collector/:id',    adminProtect, updateCollector);
router.delete('/collector/:id', adminProtect, deleteCollector);
router.get('/reports',          adminProtect, getAllReports);
router.get('/assigned-villages',adminProtect, getAssignedVillages);
router.get('/approval-requests', adminProtect, getApprovalRequests);
router.put('/approval-requests/:id', adminProtect, updateApprovalRequest);

// Green Champion Management
router.get('/green-champions',      adminProtect, getGreenChampions);
router.put('/green-champion/:id',   adminProtect, updateGreenChampion);
router.delete('/green-champion/:id',adminProtect, deleteGreenChampion);
router.post('/green-champion/assign-task', adminProtect, assignGCTask);

module.exports = router;
