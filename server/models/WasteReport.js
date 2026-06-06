const mongoose = require('mongoose');

const wasteReportSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportType:  { type: String, enum: ['Public', 'Home Pickup'], default: 'Public' },
  reportId:    { type: String, unique: true },
  wasteType:   { 
    type: String, 
    required: true, 
    enum: [
      'Plastic Waste', 'Organic Waste', 'Food Waste', 'E-Waste', 
      'Construction Waste', 'Medical Waste', 'Mixed Waste', 
      'Glass Waste', 'Paper Waste', 'Sewage / Drainage', 'Dead Animal Waste'
    ] 
  },
  severity:    { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  wasteSeenAt: { 
    type: String, 
    enum: ['Just Now', 'Few Hours Ago', 'Today', 'Yesterday', 'Multiple Days Ago'], 
    default: 'Just Now' 
  },
  description: { type: String, required: false, default: '' },
  quantity:    { type: String, default: '' },
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
  accuracy:     { type: Number, default: null },
  pickupTime:   { type: Date,   required: true },
  status: { 
    type: String, 
    enum: ['Submitted', 'Verified', 'Under Re-Verification', 'Assigned', 'In Progress', 'Resolved', 'Reopened', 'Cancelled', 'Rejected', 'Scheduled', 'Picked Up', 'Clarification Requested', 'Resubmitted', 'Clarification Expired'], 
    default: 'Submitted' 
  },
  assignedCollector: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },
  isLocked:     { type: Boolean, default: false },
  lockedAt:     { type: Date,    default: null },
  upvotes:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isEdited:     { type: Boolean, default: false },
  escalated:    { type: Boolean, default: false },
  escalatedAt:  { type: Date,    default: null },
  citizenVerified: { type: String, enum: ['pending', 'yes', 'no'], default: 'pending' },
  priority:     { type: Number,  default: 0 },
  expectedCleanupHours: { type: Number, default: 24 },
  deadline:     { type: Date },
  aiVerified: { type: Boolean, default: false },
  aiStatus: { 
    type: String, 
    enum: ['APPROVED', 'REJECTED', 'SUSPICIOUS', 'PENDING_VERIFICATION'], 
    default: 'PENDING_VERIFICATION' 
  },
  aiDetectedLabels: [{ type: String }],
  aiConfidenceScore: { type: Number, default: 0 },
  fakeProbabilityScore: { type: Number, default: 0 },
  rejectionReason: { type: String, default: '' },
  duplicateImage: { type: Boolean, default: false },
  aiGeneratedDetected: { type: Boolean, default: false },
  // Collector verification fields
  verificationChecklist: {
    wasteVisible:     { type: Boolean, default: false },
    typeCorrect:      { type: Boolean, default: false },
    descriptionMatches: { type: Boolean, default: false },
    locationReasonable: { type: Boolean, default: false },
  },
  verificationNotes: { type: String, default: '' },
  verifiedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },
  verifiedAt:    { type: Date, default: null },
  clarificationRequests: [{
    reason:      { type: String, required: true },
    notes:       { type: String, default: '' },
    requestedAt: { type: Date, default: Date.now },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector' },
  }],
  clarificationCount: { type: Number, default: 0 },
  clarificationExpiresAt: { type: Date, default: null },
  resubmittedAt: { type: Date, default: null },
  supportedBy: [{
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    supportedAt: { type: Date, default: Date.now },
  }],
  duplicateOf:  { type: mongoose.Schema.Types.ObjectId, ref: 'WasteReport', default: null },
  gcVerification: {
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status:     { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
    comment:    { type: String, default: '' },
    proofImage: { type: String, default: '' },
    verifiedAt: { type: Date, default: null }
  },
  // Revoke completion tracking
  completedAt:          { type: Date, default: null },
  revokedAt:            { type: Date, default: null },
  revokedBy:            { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },
  revokePreviousStatus: { type: String, default: '' },
  completionPhoto:      { type: String, default: '' },
  completionNotes:      { type: String, default: '' }
}, { timestamps: true });

wasteReportSchema.index({ location: '2dsphere' });
wasteReportSchema.index({ 'location.area': 1, status: 1 });
wasteReportSchema.index({ status: 1 });

module.exports = mongoose.model('WasteReport', wasteReportSchema);
