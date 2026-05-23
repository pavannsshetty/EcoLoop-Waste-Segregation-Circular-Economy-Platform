const mongoose = require('mongoose');

const productViewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecycleItem', required: true },
  viewedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Prevent multiple fake views by the same user for the same item
productViewSchema.index({ userId: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('ProductView', productViewSchema);
