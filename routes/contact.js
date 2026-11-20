const router  = require('express').Router();
const Message = require('../models/Message');

// POST /api/contact — save contact form submission to DB
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message, category, residence, skills, institution } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
    }

    await Message.create({
      name,
      email,
      phone:       phone       || '',
      subject:     subject     || '',
      message,
      category:    category    || 'General Inquiry',
      residence:   residence   || '',
      skills:      skills      || '',
      institution: institution || '',
    });

    console.log(`\nNew contact from: ${name} <${email}> [${category || 'General Inquiry'}]`);
    res.json({ success: true, message: 'Message received. We will get back to you soon.' });
  } catch (err) {
    console.error('Contact error:', err.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

module.exports = router;
