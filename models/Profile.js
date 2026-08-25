const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'Pastor John'
  },
  role: {
    type: String,
    default: 'Super Admin'
  },
  profileImageUrl: {
    type: String,
    default: 'https://i.pravatar.cc/150?img=11'
  }
});

module.exports = mongoose.model('Profile', ProfileSchema);
