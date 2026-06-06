const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Legacy support
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'WasteReport', default: null },
  isRead: { type: Boolean, default: false }, // Legacy for targeted notifications
  
  // New System
  title: { type: String, required: true },
  description: { type: String, required: true },
  message: { type: String }, // Alias for description in legacy code
  type: { 
    type: String, 
    enum: [
      'Eco Events', 
      'Awareness Campaigns', 
      'Waste Collection Drives', 
      'Plastic-Free Campaigns', 
      'Emergency Alerts', 
      'Government Announcements', 
      'New Features/Updates', 
      'Reward Bonus Events',
      'System',
      'report',
      'status'
    ], 
    default: 'System' 
  },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Low' 
  },
  
  // Targeting
  targetAudience: { 
    type: String, 
    enum: ['All', 'Citizens', 'Collectors', 'Green Champions', 'Specific Community', 'User'], 
    default: 'User' 
  },
  targetVillage: { type: String, default: null },
  
  // Event Details
  isEvent: { type: Boolean, default: false },
  eventDetails: {
    date: { type: Date },
    time: { type: String },
    venue: { type: String },
    organizer: { type: String },
    banner: { type: String },
    link: { type: String },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },

  // Metadata
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Can be admin ID
  status: { type: String, enum: ['Active', 'Draft', 'Archived', 'Scheduled'], default: 'Active' },
  scheduledFor: { type: Date },
  isPinned: { type: Boolean, default: false },

  // Tracking read status for global notifications
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]

}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
