const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const collectorSchema = new mongoose.Schema({
  collectorId:  { type: String, required: true, unique: true },
  name:         { type: String, required: true },
  teamLeader:   { type: String, default: '' },
  mobile:       { type: String, required: true },
  email:        { type: String, default: '' },
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
  workingShift:  { type: String, enum: ['Morning', 'Afternoon', 'Evening'], default: 'Morning' },
  photo:         { type: String, default: '' },
  availability:     { type: String, enum: ['Available', 'Busy', 'Offline'], default: 'Available' },
  completedTasks:   { type: Number, default: 0 },
  performanceScore: { type: Number, default: 0 },
}, { timestamps: true });

collectorSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model('Collector', collectorSchema);
