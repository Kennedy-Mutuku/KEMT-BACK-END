const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true },
  phone:       { type: String, default: '' },
  subject:     { type: String, default: '' },
  message:     { type: String, required: true },
  category:    { type: String, default: 'General Inquiry' },
  residence:   { type: String, default: '' },
  skills:      { type: String, default: '' },
  institution: { type: String, default: '' },
  isRead:      { type: Boolean, default: false },
  isUrgent:    { type: Boolean, default: false },
  addedToTeam: { type: Boolean, default: false },
  allocation: {
    groupName:   String,
    teamLeader:  String,
    allocatedAt: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
