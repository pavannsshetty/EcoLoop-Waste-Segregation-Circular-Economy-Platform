const mongoose = require('mongoose');

const ecoPointHistorySchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points:   { type: Number, required: true },
  reason:   { type: String, required: true },
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'WasteReport', default: null },
}, { timestamps: true });

module.exports = mongoose.model('EcoPointHistory', ecoPointHistorySchema);
