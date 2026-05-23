const mongoose = require('mongoose');

const villageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  center: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  boundary: {
    type: {
      type: String,
      enum: ['Polygon']
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of [lng, lat]
      default: undefined
    }
  }
}, { timestamps: true });

villageSchema.index({ boundary: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Village', villageSchema);
