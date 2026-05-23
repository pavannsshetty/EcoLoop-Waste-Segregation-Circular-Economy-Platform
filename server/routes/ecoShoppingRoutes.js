const express = require('express');
const router  = express.Router();
const {
  addItem, updateItem, deleteItem, getStoreAnalytics,
  getItems, getItem, buyItem, getCategories,
} = require('../controllers/ecoShoppingController');
const { protect }      = require('../middleware/auth');
const { adminProtect } = require('../middleware/adminAuth');
const upload           = require('../middleware/uploadMiddleware');

// ── Admin routes (admin-token required) ────────────────────────────────────
router.post  ('/',             adminProtect, upload.single('image'), addItem);
router.put   ('/:id',         adminProtect, upload.single('image'), updateItem);
router.delete('/:id',         adminProtect, deleteItem);
router.get   ('/analytics',   adminProtect, getStoreAnalytics);

// ── Public / Citizen routes ────────────────────────────────────────────────
router.get   ('/categories',  getCategories);
router.get   ('/',            getItems);
router.get   ('/:id',         getItem);
router.post  ('/:id/view',       protect, require('../controllers/ecoShoppingController').viewItem);
router.post  ('/:id/buy',        protect, buyItem);

module.exports = router;
