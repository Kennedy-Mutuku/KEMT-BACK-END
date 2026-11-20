const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const Event  = require('../models/Event');

// Storage — saves posters to uploads/events/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'events');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `event-${Date.now()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/events — list all, soonest first
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/events — create event
router.post('/', upload.single('poster'), async (req, res) => {
  try {
    const { title, date, location, description } = req.body;
    if (!title || !date || !location || !description) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    const posterUrl = req.file ? `/uploads/events/${req.file.filename}` : '';
    const event = await Event.create({ title, date, location, description, posterUrl });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/events/:id — update event
router.put('/:id', upload.single('poster'), async (req, res) => {
  try {
    const { title, date, location, description } = req.body;
    const update = { title, date, location, description };
    if (req.file) {
      update.posterUrl = `/uploads/events/${req.file.filename}`;
    }
    const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/events/:id — delete event
router.delete('/:id', async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
