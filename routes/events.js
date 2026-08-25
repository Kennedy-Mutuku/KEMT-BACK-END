const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Event = require('../models/Event');

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to prevent name conflicts
  }
});
const upload = multer({ storage: storage });

// GET all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 }); // Sort by date ascending
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new event (with optional poster image)
router.post('/', upload.single('poster'), async (req, res) => {
  const event = new Event({
    title: req.body.title,
    date: req.body.date,
    location: req.body.location,
    description: req.body.description
  });

  if (req.file) {
    // Save the file path in the database (e.g. "uploads/12345.jpg")
    event.posterUrl = req.file.path.replace(/\\/g, "/"); // Normalize windows paths
  }

  try {
    const newEvent = await event.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE an event
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT (update) an event
router.put('/:id', upload.single('poster'), async (req, res) => {
  try {
    let updateData = {
      title: req.body.title,
      date: req.body.date,
      location: req.body.location,
      description: req.body.description
    };

    if (req.file) {
      updateData.posterUrl = req.file.path.replace(/\\/g, "/");
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true } // return the updated document
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(updatedEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
