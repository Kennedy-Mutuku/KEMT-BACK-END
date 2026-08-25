const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Profile = require('../models/Profile');

// Configure Multer for profile image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // reusing the uploads folder
  },
  filename: function (req, file, cb) {
    cb(null, 'profile_' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Helper function to get the single profile
async function getOrCreateProfile() {
  let profile = await Profile.findOne();
  if (!profile) {
    profile = new Profile();
    await profile.save();
  }
  return profile;
}

// GET profile
router.get('/', async (req, res) => {
  try {
    const profile = await getOrCreateProfile();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST to update profile picture
router.post('/upload', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const profile = await getOrCreateProfile();
    
    // Save the new image path
    profile.profileImageUrl = req.file.path.replace(/\\/g, "/");
    await profile.save();

    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
