const mongoose = require('mongoose');

const CATEGORIES = [
  'Electronics', 'Books', 'Plastic Items', 'Furniture',
  'Metal Scrap', 'Paper Waste', 'Clothes', 'Toys',
  'Appliances', 'Other Recyclable Items',
];

const recycleItemSchema = new mongoose.Schema({
  itemName:    { type: String, required: true, trim: true },
  category:    { type: String, required: true, enum: CATEGORIES },
  description: { type: String, default: '' },
  price:       { type: Number, required: true, min: 0 },
  stock:       { type: Number, required: true, min: 0, default: 0 },
  stockType:   { type: String, enum: ['Set', 'Single Quantity'], default: 'Single Quantity' },
  itemsPerSet: { type: Number, default: 0 },
  image:       { type: String, default: '' },
  status:      { type: String, enum: ['Available', 'Unavailable', 'Out of Stock'], default: 'Available' },
  views:       { type: Number, default: 0 },
  requests:    { type: Number, default: 0 },
}, { timestamps: true });

recycleItemSchema.index({ category: 1 });
recycleItemSchema.index({ status: 1 });
recycleItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RecycleItem', recycleItemSchema);
module.exports.CATEGORIES = CATEGORIES;
