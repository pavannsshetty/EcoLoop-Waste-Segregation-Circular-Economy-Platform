const mongoose = require('mongoose');

const ecoPointHistorySchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points:   { type: Number, required: true },
  type:     { type: String, enum: ['Credit', 'Debit'], default: 'Credit' },
  status:   { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Approved' },
  reason:   { type: String, required: true },
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'WasteReport', default: null },
  scrapId:  { type: mongoose.Schema.Types.ObjectId, ref: 'ScrapRequest', default: null },
  itemId:   { type: mongoose.Schema.Types.ObjectId, ref: 'RecycleItem', default: null },
}, { timestamps: true });

module.exports = mongoose.model('EcoPointHistory', ecoPointHistorySchema);
