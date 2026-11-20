const mongoose = require('mongoose');

const bibleGroupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  name:    { type: String, required: true },
  members: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('BibleGroup', bibleGroupSchema);
