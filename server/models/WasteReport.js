const mongoose = require('mongoose');

const wasteReportSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  anonymous:   { type: Boolean, default: false },
  wasteType:   { type: String, required: true, enum: ['Wet Waste', 'Dry Waste', 'E-Waste', 'Plastic Waste', 'Mixed Waste'] },
  severity:    { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  wasteSeenAt: { type: String, enum: ['Just now', 'Few hours ago', 'Days ago'], default: 'Just now' },
  description: { type: String, required: true },
  image:       { type: String, default: '' },
  location: {
    type:           { type: String, enum: ['Point'], default: 'Point' },
    coordinates:    { type: [Number], default: [0, 0] },
    address:        { type: String, required: true },
    displayAddress: { type: String, default: '' },
    area:           { type: String, default: '' },
    city:           { type: String, default: '' },
    district:       { type: String, default: '' },
    state:          { type: String, default: '' },
    pincode:        { type: String, default: '' },
    country:        { type: String, default: '' },
    lat:            { type: Number, required: true },
    lng:            { type: Number, required: true },
  },
  landmark:      { type: String, default: '' },
  landmarkType:  { type: String, default: '' },
  photoLocation: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
  accuracy:      { type: Number, default: null },
  pickupTime:    { type: Date, required: true },
  status:        { type: String, enum: ['Submitted', 'In Progress', 'Resolved'], default: 'Submitted' },
  upvotes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expectedCleanupHours: { type: Number, default: null },
  resolvedAt:    { type: Date, default: null },
}, { timestamps: true });

wasteReportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('WasteReport', wasteReportSchema);
