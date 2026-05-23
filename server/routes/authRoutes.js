const express = require('express');
const { register, login, updatePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register',  register);
router.post('/login',     login);
router.put('/update-password', protect, updatePassword);

module.exports = router;
