const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const collectorSchema = new mongoose.Schema({
  collectorId:  { type: String, required: true, unique: true },
  name:         { type: String, required: true },
  teamLeader:   { type: String, default: '' },
  mobile:       { type: String, required: true },
  email:        { type: String, default: '' },
  city:         { type: String, required: true },
  area:         { type: String, required: true },
  ward:         { type: String, required: true },
  password:     { type: String, required: true, select: false },
  status:       { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  teamSize:     { type: Number, default: 1 },
  photo:        { type: String, default: '' },
  availability:     { type: String, enum: ['Available', 'Busy', 'Offline'], default: 'Available' },
  completedTasks:   { type: Number, default: 0 },
  performanceScore: { type: Number, default: 0 },
}, { timestamps: true });

collectorSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model('Collector', collectorSchema);
