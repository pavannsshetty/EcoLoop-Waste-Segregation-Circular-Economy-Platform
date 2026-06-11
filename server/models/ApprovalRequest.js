const mongoose = require('mongoose');

const approvalRequestSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['village_change', 'email_change', 'account_deletion'],
      required: true,
    },
    currentVillage: { type: String, trim: true, default: '' },
    requestedVillage: { type: String, trim: true, default: '' },
    currentEmail: { type: String, trim: true, lowercase: true, default: '' },
    requestedEmail: { type: String, trim: true, lowercase: true, default: '' },
    reason: { type: String, trim: true, default: '' },
    deletionReason: { type: String, trim: true, default: '' },
    customReason: { type: String, trim: true, default: '' },
    userRole: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, trim: true, default: '' },
    adminNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

approvalRequestSchema.index({ citizen: 1, type: 1, status: 1 });

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
