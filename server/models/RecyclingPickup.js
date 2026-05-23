const mongoose = require('mongoose');

const recyclingPickupSchema = new mongoose.Schema({
    citizen:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:        { type: String, required: true }, // Plastic, Metal, Paper, etc.
    quantity:    { type: String, required: true },
    address:     { type: String, required: true },
    village:     { type: String, required: true },
    notes:       { type: String, default: '' },
    assignedGC:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status:      { type: String, enum: ['Requested', 'Accepted', 'Collected', 'Cancelled'], default: 'Requested' },
    pointsGiven: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('RecyclingPickup', recyclingPickupSchema);
