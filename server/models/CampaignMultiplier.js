const mongoose = require('mongoose');

const campaignMultiplierSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  multiplier: { type: Number, default: 2 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  description: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('CampaignMultiplier', campaignMultiplierSchema);
