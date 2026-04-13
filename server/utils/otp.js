const otpStore = new Map();

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const storeOtp = (email, otp) => {
  otpStore.set(email.toLowerCase(), { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
};

const verifyOtp = (email, otp) => {
  const entry = otpStore.get(email.toLowerCase());
  if (!entry) return { valid: false, reason: 'OTP not found. Please request a new one.' };
  if (Date.now() > entry.expiresAt) { otpStore.delete(email.toLowerCase()); return { valid: false, reason: 'OTP expired. Please request a new one.' }; }
  if (entry.otp !== otp) return { valid: false, reason: 'Invalid OTP.' };
  otpStore.delete(email.toLowerCase());
  return { valid: true };
};

module.exports = { generateOtp, storeOtp, verifyOtp };
