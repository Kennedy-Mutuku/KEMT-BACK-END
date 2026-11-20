const router  = require('express').Router();
const Message = require('../models/Message');

// GET /api/messages — list all, newest first
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/messages — create/submit message directly to DB
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message, category, residence, skills, institution, isUrgent } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
    }

    const newMessage = await Message.create({
      name:        name.trim(),
      email:       email.trim(),
      phone:       phone ? phone.trim() : '',
      subject:     subject ? subject.trim() : '',
      message:     message.trim(),
      category:    category || 'General Inquiry',
      residence:   residence ? residence.trim() : '',
      skills:      skills ? skills.trim() : '',
      institution: institution ? institution.trim() : '',
      isUrgent:    Boolean(isUrgent),
    });

    res.status(201).json({ success: true, message: 'Message received and stored in database.', data: newMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/messages/:id/read — toggle read status
router.patch('/:id/read', async (req, res) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: req.body.isRead },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/messages/:id/allocate — assign to a bible study group
router.patch('/:id/allocate', async (req, res) => {
  try {
    const { groupName, teamLeader } = req.body;
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { allocation: { groupName, teamLeader, allocatedAt: new Date() } },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/messages/:id — delete one message
router.delete('/:id', async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/messages — delete all messages
router.delete('/', async (req, res) => {
  try {
    await Message.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
