const mongoose = require('mongoose');

const gcTaskSchema = new mongoose.Schema({
    assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:       { type: String, required: true },
    description: { type: String, required: true },
    deadline:    { type: Date },
    status:      { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
    assignedBy:  { type: String, default: 'Admin' },
    completionDate: { type: Date },
    points:      { type: Number, default: 10 },
}, { timestamps: true });

module.exports = mongoose.model('GCTask', gcTaskSchema);
