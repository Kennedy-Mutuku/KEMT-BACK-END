const router  = require('express').Router();
const Message = require('../models/Message');

// POST /api/teams — mark a contact form submission as added to Media & Tech team
router.post('/', async (req, res) => {
  try {
    const { messageId } = req.body;
    if (!messageId) {
      return res.status(400).json({ success: false, message: 'messageId is required.' });
    }

    const existing = await Message.findById(messageId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }
    if (existing.addedToTeam) {
      return res.status(409).json({ success: false, message: 'Already added to the team.' });
    }

    await Message.findByIdAndUpdate(messageId, { addedToTeam: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
