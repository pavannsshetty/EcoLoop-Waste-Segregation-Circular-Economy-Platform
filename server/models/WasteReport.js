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
    houseNo:        { type: String, default: '' },
    street:         { type: String, default: '' },
    addrLandmark:   { type: String, default: '' },
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
  status:        { type: String, enum: ['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Delayed', 'Reopened'], default: 'Submitted' },
  upvotes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedCollector: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },
  isLocked:          { type: Boolean, default: false },
  lockedAt:          { type: Date, default: null },
  priority:          { type: Number, default: 0 },           // higher = more urgent
  isBulk:            { type: Boolean, default: false },
  additionalInstructions: { type: String, default: '' },
  citizenVerified:   { type: String, enum: ['pending', 'yes', 'no', null], default: null },
  escalated:         { type: Boolean, default: false },
  escalatedAt:       { type: Date, default: null },
  completionPhoto:   { type: String, default: '' },
  completionNotes:   { type: String, default: '' },
  completedAt:       { type: Date, default: null },
  delayReason:       { type: String, default: '' },
  delayTime:         { type: Date, default: null },
  expectedCleanupHours: { type: Number, default: null },
  deadline:    { type: Date, default: null },
  resolvedAt:  { type: Date, default: null },
  isEdited:    { type: Boolean, default: false },
  village:     { type: String, default: '' },
}, { timestamps: true });

wasteReportSchema.index({ location: '2dsphere' });
wasteReportSchema.index({ 'location.area': 1, status: 1 });
wasteReportSchema.index({ status: 1 });

module.exports = mongoose.model('WasteReport', wasteReportSchema);
