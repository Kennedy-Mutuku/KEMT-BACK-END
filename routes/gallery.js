const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Gallery = require('../models/Gallery');

// Configure Multer for gallery image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, 'gallery_' + Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// GET all published gallery items (public)
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    const filter = { isPublished: true };

    if (category) {
      filter.category = category;
    }
    if (featured === 'true') {
      filter.isFeatured = true;
    }

    const items = await Gallery.find(filter).sort({ displayOrder: 1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch gallery items. Please try again later.' });
  }
});

// GET all gallery items (admin - includes unpublished)
router.get('/all', async (req, res) => {
  try {
    const items = await Gallery.find().sort({ displayOrder: 1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch gallery items. Please try again later.' });
  }
});

// GET one gallery item
router.get('/:id', async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch gallery item. Please try again later.' });
  }
});

// POST create gallery item (admin)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      eventName,
      eventDate,
      location,
      altText,
      isFeatured,
      isPublished,
      displayOrder,
      externalLink,
    } = req.body;

    if (!req.file && !externalLink) {
      return res.status(400).json({ message: 'Either an image or an external link is required' });
    }

    const galleryItem = new Gallery({
      title,
      description: description || '',
      imageUrl: req.file ? req.file.path.replace(/\\/g, '/') : '',
      externalLink: externalLink || '',
      category: category || 'missions',
      eventName: eventName || '',
      eventDate: eventDate || null,
      location: location || '',
      altText: altText || title || '',
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isPublished: isPublished !== 'false' && isPublished !== false,
      displayOrder: displayOrder ? parseInt(displayOrder) : 0,
    });

    const newItem = await galleryItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to create gallery item' });
  }
});

// PUT update gallery item (admin)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const updateData = {};

    const fields = ['title', 'description', 'category', 'eventName', 'eventDate', 'location', 'altText', 'displayOrder', 'externalLink'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.body.isFeatured !== undefined) {
      updateData.isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;
    }
    if (req.body.isPublished !== undefined) {
      updateData.isPublished = req.body.isPublished !== 'false' && req.body.isPublished !== false;
    }

    if (req.file) {
      updateData.imageUrl = req.file.path.replace(/\\/g, '/');
    }

    const updatedItem = await Gallery.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }

    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update gallery item' });
  }
});

// DELETE gallery item (admin)
router.delete('/:id', async (req, res) => {
  try {
    const item = await Gallery.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }
    res.json({ message: 'Gallery item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete gallery item. Please try again later.' });
  }
});

module.exports = router;
