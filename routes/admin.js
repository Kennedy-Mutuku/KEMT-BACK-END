const router = require('express').Router();
const Message = require('../models/Message');
const Event   = require('../models/Event');

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalEvents, totalMessages, unreadMessages] = await Promise.all([
      Event.countDocuments(),
      Message.countDocuments(),
      Message.countDocuments({ isRead: false }),
    ]);
    res.json({ totalEvents, totalMessages, unreadMessages });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ totalEvents: 0, totalMessages: 0, unreadMessages: 0 });
  }
});

module.exports = router;
