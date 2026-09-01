const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');

// POST submit contact message (public)
router.post('/', async (req, res) => {
  try {
    const { fullName, email, phone, subject, enquiryType, message, consent } = req.body;

    // Server-side validation
    const errors = [];

    if (!fullName || !fullName.trim()) {
      errors.push('Full name is required');
    } else if (fullName.length > 150) {
      errors.push('Full name must be 150 characters or less');
    }

    if (!email || !email.trim()) {
      errors.push('Email address is required');
    } else if (email.length > 150) {
      errors.push('Email must be 150 characters or less');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Please provide a valid email address');
      }
    }

    if (phone && phone.length > 30) {
      errors.push('Phone number must be 30 characters or less');
    }

    if (!subject || !subject.trim()) {
      errors.push('Subject is required');
    } else if (subject.length > 200) {
      errors.push('Subject must be 200 characters or less');
    }

    if (!message || !message.trim()) {
      errors.push('Message is required');
    } else if (message.length > 5000) {
      errors.push('Message must be 5000 characters or less');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('. ') });
    }

    const contactMessage = new ContactMessage({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      subject: subject.trim(),
      enquiryType: enquiryType || 'general',
      message: message.trim(),
      consent: consent === true || consent === 'true',
    });

    const savedMessage = await contactMessage.save();
    res.status(201).json({ success: true, message: 'Your message has been received. Thank you for contacting Kingdom Enlightenment Missions.', data: savedMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send your message. Please try again later.' });
  }
});

// GET all contact messages (admin)
router.get('/', async (req, res) => {
  try {
    const { status, enquiryType, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (enquiryType) {
      filter.enquiryType = enquiryType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ContactMessage.countDocuments(filter);

    res.json({
      messages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages. Please try again later.' });
  }
});

// GET single contact message (admin)
router.get('/:id', async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Auto-mark as read when viewed
    if (message.status === 'new') {
      message.status = 'read';
      await message.save();
    }

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch message. Please try again later.' });
  }
});

// PATCH update message status (admin)
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'read', 'in_progress', 'responded', 'archived'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updateData = {};
    if (status) updateData.status = status;

    const updatedMessage = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json(updatedMessage);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update message. Please try again later.' });
  }
});

// DELETE contact message (admin)
router.delete('/:id', async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete message. Please try again later.' });
  }
});

module.exports = router;
