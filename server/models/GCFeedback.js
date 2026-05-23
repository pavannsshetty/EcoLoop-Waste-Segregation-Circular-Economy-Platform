const mongoose = require('mongoose');

const gcFeedbackSchema = new mongoose.Schema({
    citizen:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    champion:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating:      { type: Number, required: true, min: 1, max: 5 },
    comment:     { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('GCFeedback', gcFeedbackSchema);
