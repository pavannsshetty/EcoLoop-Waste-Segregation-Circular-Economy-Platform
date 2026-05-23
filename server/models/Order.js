const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecycleItem', required: true },
  productPrice: { type: Number, required: true },
  usedPoints: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Points', 'Cash on Delivery', 'Mixed'], required: true },
  paymentStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Completed' }
}, { timestamps: true });

orderSchema.index({ userId: 1 });
orderSchema.index({ itemId: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
