const express = require('express');
const { register, login, sendOtp, verifyOtp, loginOtp } = require('../controllers/authController');

const router = express.Router();

router.post('/register',  register);
router.post('/login',     login);
router.post('/send-otp',  sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/login-otp', loginOtp);

module.exports = router;
