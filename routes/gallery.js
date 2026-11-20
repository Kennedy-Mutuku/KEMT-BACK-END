const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Gallery = require('../models/Gallery');

// Storage — saves gallery thumbnails to uploads/gallery/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'gallery');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `gallery-${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET /api/gallery — list all albums, newest first
router.get('/', async (req, res) => {
  try {
    const albums = await Gallery.find().sort({ createdAt: -1 });
    res.json(albums);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/gallery — create a new album
router.post('/', upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, date, category, branch, photosLink, shortCaption, objectPosition, photoCount } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Album name/title is required.' });
    }

    let coverImage = '';
    if (req.file) {
      coverImage = `/uploads/gallery/${req.file.filename}`;
    } else if (req.body.coverImageUrl) {
      coverImage = req.body.coverImageUrl.trim();
    } else {
      return res.status(400).json({ success: false, message: 'A cover thumbnail image or image URL is required.' });
    }

    // Auto-detect branch if category is Youth & Schools
    const resolvedBranch = branch || (category === 'Youth & Schools' ? 'KESIP' : 'KEMT');

    const album = await Gallery.create({
      title: title.trim(),
      date: date ? date.trim() : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      category: category || 'Community Outreach',
      branch: resolvedBranch,
      coverImage,
      photosLink: photosLink ? photosLink.trim() : '',
      shortCaption: shortCaption ? shortCaption.trim() : '',
      objectPosition: objectPosition || 'center',
      photoCount: Number(photoCount) || 0,
    });

    res.status(201).json({ success: true, album });
  } catch (err) {
    console.error('Gallery create error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/gallery/:id — update album
router.put('/:id', upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, date, category, branch, photosLink, shortCaption, objectPosition, photoCount, coverImageUrl } = req.body;
    
    const update = {};
    if (title) update.title = title.trim();
    if (date !== undefined) update.date = date.trim();
    if (category) update.category = category;
    if (branch) update.branch = branch;
    if (photosLink !== undefined) update.photosLink = photosLink.trim();
    if (shortCaption !== undefined) update.shortCaption = shortCaption.trim();
    if (objectPosition) update.objectPosition = objectPosition;
    if (photoCount !== undefined) update.photoCount = Number(photoCount);

    if (req.file) {
      update.coverImage = `/uploads/gallery/${req.file.filename}`;
    } else if (coverImageUrl) {
      update.coverImage = coverImageUrl.trim();
    }

    const album = await Gallery.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!album) return res.status(404).json({ success: false, message: 'Album not found.' });

    res.json({ success: true, album });
  } catch (err) {
    console.error('Gallery update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/gallery/:id — delete album
router.delete('/:id', async (req, res) => {
  try {
    const album = await Gallery.findByIdAndDelete(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found.' });

    // Clean up local uploaded file if exists
    if (album.coverImage && album.coverImage.startsWith('/uploads/gallery/')) {
      const filePath = path.join(__dirname, '..', album.coverImage);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    res.json({ success: true, message: 'Album deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
