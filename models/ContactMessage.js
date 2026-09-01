const mongoose = require('mongoose');

const EnquiryType = {
  GENERAL: 'general',
  MISSIONS: 'missions',
  PRAYER: 'prayer',
  PARTNERSHIP: 'partnership',
  VOLUNTEERING: 'volunteering',
  DONATIONS: 'donations',
  MINISTRY_INVITATION: 'ministry_invitation',
  TESTIMONY: 'testimony',
  TECHNICAL: 'technical',
  OTHER: 'other',
};

const MessageStatus = {
  NEW: 'new',
  READ: 'read',
  IN_PROGRESS: 'in_progress',
  RESPONDED: 'responded',
  ARCHIVED: 'archived',
};

const ContactMessageSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 30,
    default: '',
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  enquiryType: {
    type: String,
    enum: Object.values(EnquiryType),
    default: EnquiryType.GENERAL,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },
  consent: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.NEW,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

ContactMessageSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

ContactMessageSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('ContactMessage', ContactMessageSchema);
module.exports.EnquiryType = EnquiryType;
module.exports.MessageStatus = MessageStatus;
