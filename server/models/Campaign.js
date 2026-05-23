const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    organizer:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:       { type: String, required: true },
    description: { type: String, required: true },
    area:        { type: String, required: true },
    date:        { type: Date,   required: true },
    time:        { type: String, required: true },
    image:       { type: String, default: '' },
    village:     { type: String, default: '' },
    volunteers:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status:      { type: String, enum: ['Upcoming', 'Completed', 'Cancelled'], default: 'Upcoming' },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
