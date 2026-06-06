const mongoose = require('mongoose');

const greenChampionRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      required: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
    },
    gender: {
      type: String,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@gmail\.com$/, 'Only gmail.com addresses are allowed'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number starting with 9, 8, 7, or 6.'],
    },
    village: {
      type: String,
      required: [true, 'Village is required'],
      trim: true,
    },
    reason: {
      type: String,
    },
    otherReason: {
      type: String,
      trim: true,
    },
    profilePhoto: {
      type: String,
      required: [true, 'Profile photo is required'],
    },
    idProof: {
      type: String,
      required: [true, 'ID proof is required'],
    },
    idProofType: {
      type: String,
      required: [true, 'ID proof type is required'],
    },
    otherIdProofType: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    suspensionReason: {
      type: String,
      trim: true,
    },
    verificationChecklist: {
      mobileValid: { type: Boolean, default: false },
      emailVerified: { type: Boolean, default: false },
      villageValid: { type: Boolean, default: false },
      villageNotAssigned: { type: Boolean, default: false },
      photoGenuine: { type: Boolean, default: false },
      idProofValid: { type: Boolean, default: false },
      identityMatching: { type: Boolean, default: false },
      noDuplicate: { type: Boolean, default: false },
    },
    greenChampionId: {
      type: String,
      sparse: true,
    },
    reviewedBy: {
      type: String, // Admin username
    },
    reviewedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    suspendedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GreenChampionRequest', greenChampionRequestSchema);
