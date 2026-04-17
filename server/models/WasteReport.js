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
    lat:            { type: Number, required: true },
    lng:            { type: Number, required: true },
  },
  houseNo:      { type: String, default: '' },
  street:       { type: String, default: '' },
  landmark:     { type: String, default: '' },
  landmarkType: { type: String, default: '' },
  wardNumber:   { type: String, default: '' },
  village:      { type: String, default: '' },
  photoLocation: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
}, { timestamps: true });

wasteReportSchema.index({ location: '2dsphere' });
wasteReportSchema.index({ 'location.area': 1, status: 1 });
wasteReportSchema.index({ status: 1 });

module.exports = mongoose.model('WasteReport', wasteReportSchema);
