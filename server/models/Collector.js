const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const collectorSchema = new mongoose.Schema({
  collectorId:  { type: String, required: true, unique: true },
  name:         { type: String, required: true },
  teamLeader:   { type: String, default: '' },
  mobile:       { 
    type: String, 
    required: true, 
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number starting with 9, 8, 7, or 6.']
  },
  email:        { type: String, default: '', unique: true, sparse: true },
  city:         { type: String, default: '' },
  area:         { type: String, default: '' },
  village:      { type: String, default: '' },
  villages:     { type: [String], default: [] },
  ward:         { type: String, default: '' },
  password:     { type: String, required: true, select: false },
  status:       { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  collectorType: { type: String, enum: ['Individual', 'Team'], default: 'Individual' },
  teamSize:      { type: Number, default: 1 },
  vehicleType:   { type: String, enum: ['Bike', 'Auto', 'Truck'], default: 'Bike' },
  vehicleNumber: { type: String, default: '' },
  workingShift:  { type: [String], default: ['Morning'] },
  photo:         { type: String, default: '' },
  availability:     { type: String, enum: ['Available', 'Busy', 'Offline'], default: 'Available' },
  completedTasks:   { type: Number, default: 0 },
  performanceScore: { type: Number, default: 0 },
}, { timestamps: true });

collectorSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

collectorSchema.methods.matchPassword = async function (enteredPassword) {
  // Handle legacy plain-text passwords (e.g. manually inserted via DB tools)
  const isBcrypt = this.password && this.password.startsWith('$2');
  if (!isBcrypt) {
    if (enteredPassword !== this.password) return false;
    // Re-hash and save so future logins use bcrypt
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(enteredPassword, salt);
    await this.constructor.updateOne({ _id: this._id }, { password: hashed });
    return true;
  }
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Collector', collectorSchema);
