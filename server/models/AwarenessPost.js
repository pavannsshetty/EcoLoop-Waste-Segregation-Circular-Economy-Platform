const mongoose = require('mongoose');

const awarenessPostSchema = new mongoose.Schema({
    author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:       { type: String, required: true },
    description: { type: String, required: true },
    image:       { type: String, default: '' },
    date:        { type: Date,   default: Date.now },
    village:     { type: String, default: '' },
    likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('AwarenessPost', awarenessPostSchema);
