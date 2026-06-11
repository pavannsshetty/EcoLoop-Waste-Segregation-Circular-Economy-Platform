const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecycleItem', required: true },
  productPrice: { type: Number, required: true },
  usedPoints: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  paymentMethod: { type: String, enum: ['Points', 'Cash on Delivery', 'Mixed'], required: true },
  paymentStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Completed' },
  deliveryAddress: { type: String, default: '' },
  deliveryVillage: { type: String, default: '' },
  deliveryLatitude: { type: Number, default: null },
  deliveryLongitude: { type: Number, default: null },
  scheduledDeliveryDate: { type: Date, default: null },
  deliveryNotes: [{
    note: { type: String, default: '' },
    author: { type: String, enum: ['collector', 'admin', 'system', 'citizen'], default: 'system' },
    createdAt: { type: Date, default: Date.now }
  }],
  deliveryStatus: { type: String, enum: ['Pending', 'Assigned', 'Out for Delivery', 'Delivered'], default: 'Pending' },
  assignedCollector: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null }
}, { timestamps: true });

orderSchema.index({ userId: 1 });
orderSchema.index({ itemId: 1 });
orderSchema.index({ assignedCollector: 1 });
orderSchema.index({ deliveryStatus: 1 });
orderSchema.index({ deliveryVillage: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
