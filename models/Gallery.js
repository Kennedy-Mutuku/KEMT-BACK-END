const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title:          { type: String, required: true },
  date:           { type: String, default: '' },
  category:       { 
    type: String, 
    default: 'Community Outreach',
    enum: ['Community Outreach', 'Youth & Schools', 'Service & Action', 'Leadership & Team']
  },
  branch:         { type: String, default: 'KEMT' }, // 'KEMT' | 'KESIP'
  coverImage:     { type: String, required: true },
  photosLink:     { type: String, default: '' }, // Google Photos / Drive / external photos URL
  shortCaption:   { type: String, default: '' },
  objectPosition: { type: String, default: 'center' },
  photoCount:     { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Gallery', gallerySchema);
