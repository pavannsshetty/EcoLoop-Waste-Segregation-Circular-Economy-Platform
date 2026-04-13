const mongoose = require('mongoose');

const scrapRequestSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:         { type: String, required: true },
  userEmail:        { type: String, required: true },
  scrapType:        { 
    type: String, 
    required: true, 
    enum: ['Paper', 'Plastic', 'Metal', 'E-Waste', 'Glass', 'Clothes', 'Furniture', 'Other'] 
  },
  quantity:         { type: String, required: true }, // e.g., "5kg", "2 items"
  image:            { type: String, default: '' },
  location: {
    type:           { type: String, enum: ['Point'], default: 'Point' },
    coordinates:    { type: [Number], default: [0, 0] },
    address:        { type: String, required: true },
    displayAddress: { type: String, default: '' },
    area:           { type: String, default: '' },
    city:           { type: String, default: '' },
    district:       { type: String, default: '' },
    state:          { type: String, default: '' },
    pincode:        { type: String, default: '' },
    country:        { type: String, default: '' },
    lat:            { type: Number, required: true },
    lng:            { type: Number, required: true },
  },
  latitude:         { type: Number },
  longitude:        { type: Number },
  pickupTime:       { type: String, enum: ['Morning', 'Afternoon', 'Evening'], required: true },
  description:      { type: String, default: '' },
  status:           { 
    type: String, 
    enum: ['Requested', 'Assigned', 'In Progress', 'Collected'], 
    default: 'Requested' 
  },
  taskType:         { type: String, default: 'scrap' },
  assignedCollector: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },
  ecoPoints:        { type: Number, default: 0 },
}, { timestamps: true });

scrapRequestSchema.index({ location: '2dsphere' });
scrapRequestSchema.index({ userId: 1 });
scrapRequestSchema.index({ status: 1 });
scrapRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ScrapRequest', scrapRequestSchema);
