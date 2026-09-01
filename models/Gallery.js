const mongoose = require('mongoose');

const GalleryCategory = {
  MISSIONS: 'missions',
  OUTREACH: 'outreach',
  WORSHIP: 'worship',
  CONFERENCES: 'conferences',
  YOUTH: 'youth',
  CHILDREN: 'children',
  COMMUNITY: 'community',
  SPECIAL_EVENTS: 'special_events',
};

const GallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  externalLink: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  category: {
    type: String,
    required: true,
    enum: Object.values(GalleryCategory),
    default: GalleryCategory.MISSIONS,
  },
  eventName: {
    type: String,
    trim: true,
    maxlength: 150,
    default: '',
  },
  eventDate: {
    type: Date,
    default: null,
  },
  location: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
  altText: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
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

GallerySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

GallerySchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Gallery', GallerySchema);
module.exports.GalleryCategory = GalleryCategory;
